# server/services/mix_audio.py
# Vocal & Beat Mixer (Shift + BeatOnly + GridLock)

import sys
import os
import json
import math

# 한글 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

from pydub import AudioSegment

def mix_audio(params):
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    output_dir = os.path.join(base_dir, 'output')
    
    track_id = params.get('trackId')
    beat_file = params.get('beatFile')
    bpm = float(params.get('bpm', 0))
    shift = float(params.get('shift', 0))       # 이동할 박자 수 (+: 비트 지연, -: 보컬 지연)
    loop_beats = float(params.get('loopBeats', 0))
    
    # [설정] beatOnly 값을 안전하게 파싱 (문자열 "true"도 처리)
    raw_beat_only = params.get('beatOnly', False)
    if isinstance(raw_beat_only, str):
        beat_only = raw_beat_only.lower() == 'true'
    else:
        beat_only = bool(raw_beat_only)

    # 저장 경로
    save_dir = os.path.join(output_dir, 'mixed_results')
    os.makedirs(save_dir, exist_ok=True)
    
    suffix = "beat_only" if beat_only else f"mix_shift_{shift}"
    output_filename = f"{track_id}_{suffix}.mp3"
    output_path = os.path.join(save_dir, output_filename)

    # 경로 찾기
    vocal_path = os.path.join(output_dir, 'htdemucs', track_id, 'vocals.wav')
    beat_path_1 = os.path.join(output_dir, beat_file)
    beat_path_2 = os.path.join(output_dir, 'beat_loops', beat_file)
    
    beat_path = ""
    if os.path.exists(beat_path_1): beat_path = beat_path_1
    elif os.path.exists(beat_path_2): beat_path = beat_path_2
    else:
        print(json.dumps({"error": f"Beat file not found: {beat_file}"}))
        return

    if not os.path.exists(vocal_path):
        print(json.dumps({"error": f"Vocal stem not found: {track_id}"}))
        return

    try:
        vocal_audio = AudioSegment.from_file(vocal_path)
        beat_audio = AudioSegment.from_file(beat_path)

        # ---------------------------------------------------------
        # 1. [Grid Lock] 비트 길이 보정
        # ---------------------------------------------------------
        if bpm > 0 and loop_beats > 0:
            ms_per_beat = 60000 / bpm
            expected_length = ms_per_beat * loop_beats
            
            diff = len(beat_audio) - expected_length
            if abs(diff) < 2000: 
                if diff > 0:
                    beat_audio = beat_audio[:int(expected_length)].fade_out(10)
                elif diff < 0:
                    beat_audio = beat_audio + AudioSegment.silent(duration=abs(diff))
            
            beat_audio = beat_audio.fade_in(5)

        # ---------------------------------------------------------
        # 2. [Looping] 비트 반복
        # ---------------------------------------------------------
        vocal_len = len(vocal_audio)
        beat_len = len(beat_audio)
        loop_count = math.ceil(vocal_len / beat_len) + 1
        
        final_beat = beat_audio * loop_count
        final_beat = final_beat[:vocal_len]

        # ---------------------------------------------------------
        # 3. [Mixing & Shifting] 보컬 포함 여부 및 싱크 조절
        # ---------------------------------------------------------
        if beat_only:
            mixed_audio = final_beat
        else:
            # Shift 적용 (ms 단위 계산)
            if bpm > 0 and shift != 0:
                ms_per_beat = 60000 / bpm
                offset_ms = ms_per_beat * shift
                
                if offset_ms > 0:
                    # [비트 지연] 비트 앞에 무음 추가 (보컬이 먼저 나옴)
                    # ex: shift=4 -> 비트가 4박자 늦게 시작
                    final_beat = AudioSegment.silent(duration=offset_ms) + final_beat
                elif offset_ms < 0:
                    # [보컬 지연] 보컬 앞에 무음 추가 (비트가 먼저 나옴)
                    # ex: shift=-4 -> 보컬이 4박자 늦게 시작
                    vocal_audio = AudioSegment.silent(duration=abs(offset_ms)) + vocal_audio

            mixed_audio = final_beat.overlay(vocal_audio)

        # 저장
        mixed_audio.export(output_path, format="mp3")

        result = {
            "success": True,
            "message": "Mixing Complete",
            "full_path": output_path,
            "filename": output_filename,
            "shift_beats": shift
        }
        print(json.dumps(result, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"error": f"Process failed: {str(e)}"}))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        sys.exit(1)
    try:
        input_str = sys.argv[1]
        if input_str.startswith('{'):
            mix_audio(json.loads(input_str))
    except Exception as e:
        print(json.dumps({"error": str(e)}))