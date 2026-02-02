import os
import argparse

# FFmpeg 경로 자동 인식
script_dir = os.path.dirname(os.path.abspath(__file__))
os.environ["PATH"] += os.pathsep + script_dir

from pydub import AudioSegment

def mix_by_track_id(track_id, beat_path, output_path, bpm=0, shift_beats=0):
    # 경로 설정 (server/services -> server/output)
    base_dir = os.path.join(script_dir, "..", "output")
    base_dir = os.path.normpath(base_dir)

    vocal_path = os.path.join(base_dir, "htdemucs", track_id, "vocals.wav")

    print(f"[*] Track ID: {track_id}")
    
    if not os.path.exists(vocal_path):
        print(f"❌ 오류: 보컬 파일을 찾을 수 없습니다: {vocal_path}")
        return
    if not os.path.exists(beat_path):
        print(f"❌ 오류: 비트 파일을 찾을 수 없습니다: {beat_path}")
        return

    try:
        # ---------------------------------------------------------
        # [핵심] BPM 기반 시간 계산
        # ---------------------------------------------------------
        sync_offset_ms = 0
        if bpm > 0 and shift_beats != 0:
            # 1박자의 길이(ms) = 60000 / BPM
            ms_per_beat = 60000 / bpm
            sync_offset_ms = ms_per_beat * shift_beats
            print(f"[*] BPM 계산: {bpm} BPM 기준 {shift_beats}박자 = {int(sync_offset_ms)}ms 이동")
        # ---------------------------------------------------------

        print(f"[*] 오디오 로드 중...")
        vocal_audio = AudioSegment.from_file(vocal_path)
        beat_audio = AudioSegment.from_file(beat_path)

        # Sync 적용 (양수: 비트 늦게 / 음수: 보컬 늦게)
        if sync_offset_ms > 0:
            silence = AudioSegment.silent(duration=sync_offset_ms)
            beat_audio = silence + beat_audio
            print("   -> 비트 시작을 늦췄습니다.")
            
        elif sync_offset_ms < 0:
            delay = abs(sync_offset_ms)
            silence = AudioSegment.silent(duration=delay)
            vocal_audio = silence + vocal_audio
            print("   -> 보컬 시작을 늦췄습니다.")

        # 비트 루프 및 합성
        vocal_len = len(vocal_audio)
        beat_len = len(beat_audio)

        if beat_len < vocal_len:
            loop_count = (vocal_len // beat_len) + 1
            final_beat = beat_audio * loop_count
            final_beat = final_beat[:vocal_len]
        else:
            final_beat = beat_audio[:vocal_len]

        mixed_audio = final_beat.overlay(vocal_audio)
        mixed_audio.export(output_path, format="mp3")
        print(f"✅ 성공! 저장됨: {output_path}")

    except Exception as e:
        print(f"❌ 오류 발생: {e}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--track_id", required=True)
    parser.add_argument("--beat", required=True)
    parser.add_argument("--out", required=True)
    
    # [수정] BPM 및 Beat 입력 받기
    parser.add_argument("--bpm", type=float, default=0, help="곡의 BPM")
    parser.add_argument("--shift", type=float, default=0, help="미룰 박자 수 (예: 4, 8, -4)")
    
    args = parser.parse_args()
    mix_by_track_id(args.track_id, args.beat, args.out, args.bpm, args.shift)