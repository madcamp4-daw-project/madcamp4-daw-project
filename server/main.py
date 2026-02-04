import os
import sys
import librosa
import soundfile as sf
import numpy as np
import warnings
import pyrubberband as pyrb

# 🔥 [Configuration] 설정 값 모음
import config

# 🔥 [Utils] 유틸리티 함수
from utils.dsp import (
    normalize_audio,
    find_smart_trim_point,
    load_and_merge_stems
)

# 🔥 [Strategies] 믹싱 전략 클래스
from strategies.drop_mix import DropMixStrategy
from strategies.blend_mix import BlendMixStrategy

# [Services] 기존 분석 모듈
from services.analyzer_beat import get_beat_info
from services.analyzer_intro import get_intro_duration
from services.analyzer_outro import find_outro_endpoint
from services.stem_separation import separate_stems
from services.analyzer_vocal import find_vocal_end_point
from services.analyzer_key import get_key_from_audio, get_pitch_shift_steps

warnings.filterwarnings("ignore")

# ====================================================
# 🚀 메인 실행 로직 (Orchestrator)
# ====================================================
def main():
    # 1. 환경 설정
    os.makedirs(config.OUTPUT_DIR, exist_ok=True)
    os.makedirs(config.MIXED_RESULTS_DIR, exist_ok=True)

    # 트랙 이름 설정 (필요시 인자로 받을 수 있음)
    track_a_name = "My Way.mp3"
    track_b_name = "Whiplash.mp3"
    
    file_a = os.path.join(config.INPUT_DIR, track_a_name)
    file_b = os.path.join(config.INPUT_DIR, track_b_name)

    if not os.path.exists(file_a) or not os.path.exists(file_b):
        print(f"❌ 파일을 찾을 수 없습니다:\n - {file_a}\n - {file_b}")
        return

    print(f"\n🎧 Mixing Track A: {track_a_name}")
    print(f"🎧 Mixing Track B: {track_b_name}")

    # 2. 스템 분리 (Stem Separation)
    print("\n[Step 0] Preparing Stems...")
    separate_stems(track_a_name)
    separate_stems(track_b_name)

    # 3. 오디오 로드 및 전처리
    print("\n[Step 1] Loading & Analyzing Audio...")
    y_a_full, sr = librosa.load(file_a, sr=config.TARGET_SR)
    y_b_full, _ = librosa.load(file_b, sr=config.TARGET_SR)

    # 필요한 스템 로드 (Utils 활용)
    # Track A
    y_a_vocals_only = load_and_merge_stems(track_a_name, ['vocals'], config.OUTPUT_DIR, sr)
    y_a_no_rhythm = load_and_merge_stems(track_a_name, ['vocals', 'other'], config.OUTPUT_DIR, sr)
    
    # Track B
    y_b_bass_only = load_and_merge_stems(track_b_name, ['bass'], config.OUTPUT_DIR, sr)
    y_b_full_bass = load_and_merge_stems(track_b_name, ['bass', 'drums'], config.OUTPUT_DIR, sr) # Rhythm

    # 4. BPM 및 구조 분석
    info_a = get_beat_info(file_a)
    info_b = get_beat_info(file_b)
    bpm_a, bpm_b = info_a['bpm'], info_b['bpm']
    
    bpm_diff = abs(bpm_a - bpm_b)
    print(f"   📊 BPM Analysis: A({bpm_a:.1f}) vs B({bpm_b:.1f}) | Diff: {bpm_diff:.1f}")

    # 주요 포인트 계산
    trim_point_vol = find_outro_endpoint(y_a_full, sr)
    snapped_point = find_smart_trim_point(y_a_full, sr, trim_point_vol, bpm_a)
    final_trim_point = snapped_point
    vocal_end_point = find_vocal_end_point(y_a_vocals_only, sr)

    final_mix = None
    strategy_name = ""

    # ====================================================
    # 🔥 전략 선택 및 실행 (Strategy Execution)
    # ====================================================
    if bpm_diff > config.BPM_THRESHOLD:
        # [Strategy A] Drop Mix
        print("\n🚀 Condition Met: High BPM Difference -> Executing Drop Mix Strategy")
        
        mixer = DropMixStrategy()
        final_mix = mixer.process(
            y_a=y_a_full,
            y_a_vocals=y_a_vocals_only,
            y_b=y_b_full,
            bpm_a=bpm_a,
            bpm_b=bpm_b,
            sr=sr,
            cut_point_a=final_trim_point,
            vocal_end_point=vocal_end_point
        )
        strategy_name = "drop_mix"
        
    else:
        # [Strategy B] Blend Mix
        print("\n🍹 Condition Met: Similar BPM -> Executing Blend Mix Strategy")
        
        # Blend Mix에 필요한 추가 계산
        intro_sec_raw_b = get_intro_duration(file_b)
        intro_beats = max(4, int(round(intro_sec_raw_b * (bpm_b / 60.0))))
        overlap_duration_target = intro_beats * (60.0 / bpm_a)
        overlap_samples_target = int(overlap_duration_target * sr)
        
        # 키 매칭 (Key Matching) - Blend Mix 전용 전처리
        key_a, _ = get_key_from_audio(y_a_full, sr)
        key_b, _ = get_key_from_audio(y_b_bass_only, sr)
        shift_steps = get_pitch_shift_steps(key_a, key_b)
        
        if shift_steps != 0:
            print(f"   🎹 Auto Pitch Shift applied to Track B Bass: {shift_steps} semitones")
            y_b_bass_only = pyrb.pitch_shift(y_b_bass_only, sr, n_steps=shift_steps)

        mixer = BlendMixStrategy()
        final_mix = mixer.process(
            y_a_full=y_a_full,
            y_a_no_rhythm=y_a_no_rhythm,
            y_a_vocals=y_a_vocals_only,
            y_b_full=y_b_full,
            y_b_bass=y_b_bass_only,
            bpm_a=bpm_a,
            bpm_b=bpm_b,
            sr=sr,
            overlap_samples=overlap_samples_target,
            vocal_end=vocal_end_point,
            trim_point=final_trim_point,
            track_a_name=track_a_name,
            output_dir=config.OUTPUT_DIR
        )
        strategy_name = "blend_mix"

    # 5. 결과 저장
    if final_mix is not None:
        print("\n[Step Final] Normalizing & Saving...")
        final_mix = normalize_audio(final_mix)
        
        name_a = os.path.splitext(track_a_name)[0]
        name_b = os.path.splitext(track_b_name)[0]
        output_filename = f"mix_{strategy_name}_{name_a}_to_{name_b}.wav"
        output_path = os.path.join(config.MIXED_RESULTS_DIR, output_filename)
        
        sf.write(output_path, final_mix, sr)
        print(f"\n✨ Success! Output saved to: {output_path}")
    else:
        print("\n❌ Error: Mixing failed, no output generated.")

if __name__ == "__main__":
    main()