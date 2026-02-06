#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
mix_engine.py - API 호출용 믹싱 엔진
Blend Mix와 Drop Mix를 BPM 차이에 따라 자동 선택하여 두 트랙을 믹싱합니다.

사용법:
    python mix_engine.py '{"trackA":"파일명A.mp3","trackB":"파일명B.mp3","mixType":"blend"}'

출력:
    - 진행률: {"progress": 50, "message": "믹싱 중..."}
    - 완료: {"mixUrl": "blends/mix_xxx.wav", "mixType": "blend", "duration": 180}
"""

# ⚠️ [중요] pkg_resources 경고 억제 (madmom 관련)
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='pkg_resources')
warnings.filterwarnings('ignore', category=DeprecationWarning, module='pkg_resources')

import os
import sys
import json
import librosa
import soundfile as sf
import numpy as np
import warnings
import pyrubberband as pyrb

# 현재 디렉토리를 sys.path에 추가
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

import config
from utils.dsp import (
    normalize_audio,
    find_smart_trim_point,
    load_and_merge_stems
)
from strategies.drop_mix import DropMixStrategy
from strategies.blend_mix import BlendMixStrategy
from services.analyzer_beat import get_beat_info
from services.analyzer_intro import get_intro_duration
from services.analyzer_outro import find_outro_endpoint
from services.stem_separation import separate_stems
from services.analyzer_vocal import find_vocal_end_point
from services.analyzer_key import get_key_from_audio, get_pitch_shift_steps

warnings.filterwarnings("ignore")


def emit_progress(progress: int, message: str):
    """진행률을 JSON 형식으로 stdout에 출력 (Node.js에서 파싱)"""
    print(json.dumps({"progress": progress, "message": message}), flush=True)


def convert_numpy_types(obj):
    """JSON 직렬화를 위한 NumPy 타입 변환"""
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj


def run_mix(track_a_id: str, track_b_id: str, mix_type: str = "auto", bridge_bars: int = 4):
    """
    메인 믹싱 함수
    
    Args:
        track_a_id: Track A 파일명 (예: "1738500000.mp3")
        track_b_id: Track B 파일명 (예: "1738500001.mp3")
        mix_type: "blend", "drop", 또는 "auto" (BPM 차이로 자동 결정)
        bridge_bars: Drop Mix 시 브릿지 마디 수
    
    Returns:
        dict: 믹싱 결과 정보
    """
    
    # 파일 경로 확인
    tracks_dir = os.path.join(os.path.dirname(__file__), "uploads", "tracks")
    file_a = os.path.join(tracks_dir, track_a_id)
    file_b = os.path.join(tracks_dir, track_b_id)
    
    if not os.path.exists(file_a):
        return {"error": f"Track A를 찾을 수 없습니다: {track_a_id}"}
    if not os.path.exists(file_b):
        return {"error": f"Track B를 찾을 수 없습니다: {track_b_id}"}
    
    emit_progress(5, "트랙 분석 시작...")
    
    # 출력 디렉토리 생성
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    blends_dir = os.path.join(config.OUTPUT_DIR, "blends")
    os.makedirs(blends_dir, exist_ok=True)
    
    try:
        # 스템 분리 (비동기 처리가 더 좋지만 간단히 동기로 처리)
        emit_progress(10, "Track A 스템 분리 중...")
        track_a_name = os.path.basename(track_a_id)
        track_b_name = os.path.basename(track_b_id)
        
        separate_stems(track_a_name)
        emit_progress(25, "Track B 스템 분리 중...")
        separate_stems(track_b_name)
        
        # 오디오 로드
        emit_progress(40, "오디오 분석 중...")
        y_a_full, sr = librosa.load(file_a, sr=config.TARGET_SR)
        y_b_full, _ = librosa.load(file_b, sr=config.TARGET_SR)
        
        # 스템 로드
        y_a_vocals_only = load_and_merge_stems(track_a_name, ['vocals'], config.OUTPUT_DIR, sr)
        y_a_no_rhythm = load_and_merge_stems(track_a_name, ['vocals', 'other'], config.OUTPUT_DIR, sr)
        y_b_bass_only = load_and_merge_stems(track_b_name, ['bass'], config.OUTPUT_DIR, sr)
        y_b_full_bass = load_and_merge_stems(track_b_name, ['bass', 'drums'], config.OUTPUT_DIR, sr)
        
        # BPM 분석
        emit_progress(50, "BPM 분석 중...")
        info_a = get_beat_info(file_a)
        info_b = get_beat_info(file_b)
        bpm_a, bpm_b = info_a['bpm'], info_b['bpm']
        bpm_diff = abs(bpm_a - bpm_b)
        
        # 주요 포인트 계산
        trim_point_vol = find_outro_endpoint(y_a_full, sr)
        snapped_point = find_smart_trim_point(y_a_full, sr, trim_point_vol, bpm_a)
        vocal_end_point = find_vocal_end_point(y_a_vocals_only, sr) if y_a_vocals_only is not None else None
        
        emit_progress(60, "믹싱 전략 결정 중...")
        
        # ⚠️ 믹스 타입은 항상 BPM 차이로만 결정 (전달받은 mix_type 파라미터 무시)
        # BPM_THRESHOLD(기본값 20) 이상 차이나면 Drop Mix, 그렇지 않으면 Blend Mix
        if bpm_diff > config.BPM_THRESHOLD:
            actual_mix_type = "drop"
            emit_progress(65, f"BPM 차이 {bpm_diff:.1f} > {config.BPM_THRESHOLD} → DROP MIX 선택")
        else:
            actual_mix_type = "blend"
            emit_progress(65, f"BPM 차이 {bpm_diff:.1f} <= {config.BPM_THRESHOLD} → BLEND MIX 선택")
        
        final_mix = None
        strategy_name = ""
        
        # 믹싱 실행
        emit_progress(70, f"{actual_mix_type.upper()} Mix 실행 중...")
        
        if actual_mix_type == "drop":
            mixer = DropMixStrategy()
            final_mix = mixer.process(
                y_a=y_a_full,
                y_a_vocals=y_a_vocals_only if y_a_vocals_only is not None else y_a_full,
                y_b=y_b_full,
                bpm_a=bpm_a,
                bpm_b=bpm_b,
                sr=sr,
                cut_point_a=snapped_point,
                vocal_end_point=vocal_end_point
            )
            strategy_name = "drop_mix"
        else:
            # Blend Mix
            intro_sec_raw_b = get_intro_duration(file_b)
            intro_beats = max(4, int(round(intro_sec_raw_b * (bpm_b / 60.0))))
            overlap_duration_target = intro_beats * (60.0 / bpm_a)
            overlap_samples_target = int(overlap_duration_target * sr)
            
            # 키 매칭
            if y_b_bass_only is not None:
                key_a, _ = get_key_from_audio(y_a_full, sr)
                key_b, _ = get_key_from_audio(y_b_bass_only, sr)
                shift_steps = get_pitch_shift_steps(key_a, key_b)
                
                if shift_steps != 0:
                    y_b_bass_only = pyrb.pitch_shift(y_b_bass_only, sr, n_steps=shift_steps)
            
            mixer = BlendMixStrategy()
            final_mix = mixer.process(
                y_a_full=y_a_full,
                y_a_no_rhythm=y_a_no_rhythm if y_a_no_rhythm is not None else y_a_full,
                y_a_vocals=y_a_vocals_only if y_a_vocals_only is not None else y_a_full,
                y_b_full=y_b_full,
                y_b_bass=y_b_bass_only if y_b_bass_only is not None else y_b_full,
                bpm_a=bpm_a,
                bpm_b=bpm_b,
                sr=sr,
                overlap_samples=overlap_samples_target,
                vocal_end=vocal_end_point if vocal_end_point else snapped_point,
                trim_point=snapped_point,
                track_a_name=track_a_name,
                output_dir=config.OUTPUT_DIR
            )
            strategy_name = "blend_mix"
        
        if final_mix is None:
            return {"error": "믹싱 실패: 결과가 생성되지 않았습니다."}
        
        # 정규화 및 저장
        emit_progress(90, "결과 저장 중...")
        final_mix = normalize_audio(final_mix)
        
        name_a = os.path.splitext(track_a_name)[0]
        name_b = os.path.splitext(track_b_name)[0]
        output_filename = f"mix_{strategy_name}_{name_a}_to_{name_b}.wav"
        output_path = os.path.join(blends_dir, output_filename)
        
        sf.write(output_path, final_mix, sr)
        
        duration = len(final_mix) / sr
        
        emit_progress(100, "믹싱 완료!")
        
        return {
            "mixUrl": f"blends/{output_filename}",
            "mixType": strategy_name,
            "duration": duration,
            "bpmA": bpm_a,
            "bpmB": bpm_b,
            "bpmDiff": bpm_diff
        }
        
    except Exception as e:
        return {"error": str(e)}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "인자가 필요합니다: JSON 형식의 요청 데이터"}))
        sys.exit(1)
    
    try:
        # JSON 인자 파싱
        request_data = json.loads(sys.argv[1])
        
        track_a = request_data.get("trackA")
        track_b = request_data.get("trackB")
        mix_type = request_data.get("mixType", "auto")
        bridge_bars = request_data.get("bridgeBars", 4)
        
        if not track_a or not track_b:
            print(json.dumps({"error": "trackA와 trackB가 모두 필요합니다."}))
            sys.exit(1)
        
        # 믹싱 실행
        result = run_mix(track_a, track_b, mix_type, bridge_bars)
        
        # 결과 출력
        print(json.dumps(result, default=convert_numpy_types))
        
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"JSON 파싱 실패: {str(e)}"}))
        sys.exit(1)
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)
