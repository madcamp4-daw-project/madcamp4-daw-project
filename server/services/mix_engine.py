# server/services/mix_engine.py
# 통합 믹싱 엔진 - Blend Mix / Drop Mix 지원

import os
import sys
import json
import numpy as np
import librosa
import soundfile as sf
import warnings
from scipy import signal
import pyrubberband as pyrb

# 서비스 모듈 임포트
from services.extract_beat_v2 import extract_best_loop_v2 as extract_best_loop
from services.analyzer_beat import get_beat_info
from services.analyzer_intro import get_intro_duration
from services.analyzer_outro import find_outro_endpoint
from services.stem_separation import separate_stems
from services.analyzer_vocal import find_vocal_end_point
from services.analyzer_key import get_key_from_audio, get_pitch_shift_steps

# Madmom (Downbeat Snap용)
from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor

warnings.filterwarnings("ignore")

# ====================================================
# 📝 [설정 영역]
# ====================================================
INPUT_DIR = "./uploads/tracks"
OUTPUT_DIR = "./output"
TARGET_SR = 44100

# ====================================================
# 🛠️ 보조 함수들 (DSP & De-clicking)
# ====================================================

def normalize_audio(y, target_db=-1.0):
    max_val = np.max(np.abs(y))
    if max_val == 0: return y
    target_amp = 10 ** (target_db / 20)
    return y * (target_amp / max_val)

def preserve_energy(y_original, y_stretched):
    rms_orig = np.sqrt(np.mean(y_original**2))
    rms_new = np.sqrt(np.mean(y_stretched**2))
    if rms_new < 1e-5: return y_stretched
    gain = rms_orig / rms_new
    if gain > 3.0: gain = 3.0
    return y_stretched * gain

def smooth_concatenate(arrays, fade_samples=128):
    """배열들을 이어 붙일 때, 접합부를 Crossfade하여 틱 잡음을 방지"""
    if not arrays: return np.array([])
    if len(arrays) == 1: return arrays[0]
    
    result = arrays[0]
    
    for i in range(1, len(arrays)):
        next_arr = arrays[i]
        
        if len(result) < fade_samples or len(next_arr) < fade_samples:
            result = np.concatenate([result, next_arr])
            continue
            
        overlap_part_prev = result[-fade_samples:]
        overlap_part_next = next_arr[:fade_samples]
        
        fade_out = np.linspace(1.0, 0.0, fade_samples)
        fade_in = np.linspace(0.0, 1.0, fade_samples)
        
        crossfaded = (overlap_part_prev * fade_out) + (overlap_part_next * fade_in)
        
        result = np.concatenate([result[:-fade_samples], crossfaded, next_arr[fade_samples:]])
        
    return result

def get_low_freq_energy(y, sr):
    """150Hz 이하 킥/베이스 에너지 측정"""
    try:
        sos = signal.butter(4, 150, 'lp', fs=sr, output='sos')
        y_low = signal.sosfilt(sos, y)
        return np.sqrt(np.mean(y_low**2))
    except:
        return 0

def find_smart_trim_point(y, sr, target_sample, bpm_hint):
    """스마트 트림 포인트 찾기 (위상 보정 + 전진 스냅)"""
    try:
        print(f"   🕵️ Analyzing trim point near {target_sample/sr:.2f}s...")
        
        start_sec = max(0, (target_sample / sr) - 10.0)
        end_sec = min(len(y) / sr, (target_sample / sr) + 10.0)
        
        y_cut = y[int(start_sec*sr):int(end_sec*sr)]
        
        y_proc = y_cut * 2.0 
        y_proc = np.sign(y_proc) * (np.abs(y_proc) ** 2)

        proc = RNNDownBeatProcessor()
        act = proc(y_proc)
        
        tracker = DBNDownBeatTrackingProcessor(
            beats_per_bar=[4], fps=100,
            min_bpm=bpm_hint*0.8, max_bpm=bpm_hint*1.2, transition_lambda=150
        )
        beats_info = tracker(act)
        
        downbeats = beats_info[beats_info[:, 1] == 1][:, 0]
        downbeat_samples = (downbeats * sr).astype(int) + int(start_sec * sr)
        
        candidates_prev = downbeat_samples[downbeat_samples <= target_sample]
        
        if len(candidates_prev) == 0: return target_sample
        
        chosen_point = candidates_prev[-1]
        
        # 위상 보정
        check_len = int(0.4 * sr)
        e1 = get_low_freq_energy(y[chosen_point : chosen_point + check_len], sr)
        
        samples_per_beat = int(sr * 60 / bpm_hint)
        point_beat3 = chosen_point + (samples_per_beat * 2)
        
        if point_beat3 + check_len < len(y):
            e3 = get_low_freq_energy(y[point_beat3 : point_beat3 + check_len], sr)
            if e3 > e1 * 1.3:
                print("      🔄 Trim Phase Fix: Shifted to real Downbeat (+2 beats)")
                chosen_point = point_beat3
        
        # 전진 스냅
        dist_from_bar_start = target_sample - chosen_point
        bar_length = samples_per_beat * 4
        
        if dist_from_bar_start > (bar_length * 0.5):
            print("      ⏩ Trim Resolution Fix: Extending to finish the bar (Forward Snap)")
            chosen_point += bar_length
            
        print(f"   📍 Smart Trim Point: {chosen_point/sr:.2f}s")
        return chosen_point

    except Exception as e:
        print(f"   ⚠️ Smart Trim failed ({e}). Using original.")
        return target_sample

def match_bpm_with_safety_margin(y, sr, current_bpm, target_bpm, target_len_samples):
    if current_bpm == target_bpm:
        if len(y) > target_len_samples: return y[:target_len_samples]
        return y
    
    rate = target_bpm / current_bpm
    y_stretched = pyrb.time_stretch(y, sr, rate)
    y_stretched = preserve_energy(y, y_stretched)
    
    if len(y_stretched) > target_len_samples:
        return y_stretched[:target_len_samples]
    elif len(y_stretched) < target_len_samples:
        pad_len = target_len_samples - len(y_stretched)
        return np.pad(y_stretched, (0, pad_len))
    return y_stretched

def create_tempo_ramp(y, sr, start_bpm, end_bpm, steps=32):
    if start_bpm == end_bpm: return y
    print(f"   📈 Ramping BPM: {start_bpm:.1f} -> {end_bpm:.1f} (Ultra Smooth - {steps} steps)")
    
    chunk_len = len(y) // steps
    chunks = []
    
    for i in range(steps):
        start = i * chunk_len
        end = start + chunk_len if i < steps - 1 else len(y)
        chunk = y[start:end]
        
        if len(chunk) < sr * 0.05:
             chunks.append(chunk)
             continue

        current_target_bpm = start_bpm + (end_bpm - start_bpm) * (i / steps)
        rate = current_target_bpm / end_bpm
        
        stretched = pyrb.time_stretch(chunk, sr, rate)
        stretched = preserve_energy(chunk, stretched)
        chunks.append(stretched)
    
    return smooth_concatenate(chunks, fade_samples=64)

def load_and_merge_stems(track_name, stems_to_merge, output_dir, sr):
    name_no_ext = os.path.splitext(track_name)[0]
    demucs_path = os.path.join(output_dir, "htdemucs_ft", name_no_ext)
    merged_audio = None
    for stem in stems_to_merge:
        stem_path = os.path.join(demucs_path, f"{stem}.wav")
        if not os.path.exists(stem_path): return None
        y, _ = librosa.load(stem_path, sr=sr)
        if merged_audio is None: merged_audio = y
        else:
            min_len = min(len(merged_audio), len(y))
            merged_audio = merged_audio[:min_len] + y[:min_len]
    return merged_audio


# ====================================================
# 🎛️ BLEND MIX 전략
# ====================================================
def execute_blend_mix(track_a_name, track_b_name):
    """Blend Mix: 부드러운 BPM 변속 + Bass Swap + Harmonic Mixing"""
    print("\n" + "="*60)
    print("🎛️ BLEND MIX MODE")
    print("="*60)
    
    file_a = os.path.join(INPUT_DIR, track_a_name)
    file_b = os.path.join(INPUT_DIR, track_b_name)

    if not os.path.exists(file_a) or not os.path.exists(file_b):
        raise FileNotFoundError("파일을 찾을 수 없습니다.")

    print(f"\n🎧 Mixing Track A: {track_a_name}")
    print(f"🎧 Mixing Track B: {track_b_name}")

    print("\n[Step 0] Preparing Stems...")
    separate_stems(track_a_name)
    separate_stems(track_b_name)

    y_a_no_rhythm = load_and_merge_stems(track_a_name, ['vocals', 'other'], OUTPUT_DIR, TARGET_SR)
    y_b_rhythm = load_and_merge_stems(track_b_name, ['bass', 'drums'], OUTPUT_DIR, TARGET_SR)
    y_a_vocals_only = load_and_merge_stems(track_a_name, ['vocals'], OUTPUT_DIR, TARGET_SR)
    y_b_bass_only = load_and_merge_stems(track_b_name, ['bass'], OUTPUT_DIR, TARGET_SR)

    if y_a_no_rhythm is None or y_b_rhythm is None:
        raise RuntimeError("Stem 로드 실패.")

    print("\n[Step 1] Analyzing Beats & Audio...")
    info_a = get_beat_info(file_a)
    info_b = get_beat_info(file_b)

    bpm_a = info_a['bpm']
    bpm_b = info_b['bpm']
    y_a_full = info_a['audio']
    y_b_full = info_b['audio']
    sr = info_a['sr']

    min_len_a = min(len(y_a_full), len(y_a_no_rhythm))
    y_a_full = y_a_full[:min_len_a]
    y_a_no_rhythm = y_a_no_rhythm[:min_len_a]
    if y_a_vocals_only is not None:
        y_a_vocals_only = y_a_vocals_only[:min_len_a]

    # [Step 2] Target Overlap Calculation
    print("\n[Step 2] Calculating Transition Target...")
    intro_sec_raw_b = get_intro_duration(file_b)
    intro_beats = max(4, int(round(intro_sec_raw_b * (bpm_b / 60.0))))
    overlap_duration_target = intro_beats * (60.0 / bpm_a)
    overlap_samples_target = int(overlap_duration_target * sr)
    print(f"   🎯 Target Overlap: {overlap_samples_target} Samples ({overlap_duration_target:.2f}s)")

    # [Step 1.5] Extension
    print("\n[Step 1.5] Analyzing & Extending Outro...")
    trim_point_vol = find_outro_endpoint(y_a_full, sr)
    vocal_end_point = find_vocal_end_point(y_a_vocals_only, sr)
    snapped_point = find_smart_trim_point(y_a_full, sr, trim_point_vol, bpm_a)
    final_trim_point = snapped_point
    
    current_outro_len = final_trim_point - vocal_end_point
    
    if current_outro_len < overlap_samples_target:
        print(f"   ⚠️ Outro Short! Extending using V2 Loop...")
        track_a_stem_dir = os.path.join(OUTPUT_DIR, "htdemucs_ft", os.path.splitext(track_a_name)[0])
        loop_path = extract_best_loop(track_a_stem_dir, bpm_hint=bpm_a)
        
        if loop_path and os.path.exists(loop_path):
            y_loop, _ = librosa.load(loop_path, sr=sr)
            missing_samples = overlap_samples_target - current_outro_len
            
            if missing_samples > 0:
                needed_loops = int(np.ceil(missing_samples / len(y_loop)))
                loop_list = [y_loop] * needed_loops
                extension = smooth_concatenate(loop_list, fade_samples=128)[:missing_samples + int(1.0*sr)]
                
                y_a_full_trimmed = y_a_full[:final_trim_point]
                y_a_full = smooth_concatenate([y_a_full_trimmed, extension], fade_samples=128)
                
                y_a_no_rhythm_trimmed = y_a_no_rhythm[:final_trim_point]
                y_a_no_rhythm = smooth_concatenate([y_a_no_rhythm_trimmed, extension], fade_samples=128)
                
                print(f"   ✅ Extended successfully!")
            else:
                 y_a_full = y_a_full[:final_trim_point]
                 y_a_no_rhythm = y_a_no_rhythm[:final_trim_point]
        else:
             print("   ❌ Loop generation failed.")
             y_a_full = y_a_full[:final_trim_point]
             y_a_no_rhythm = y_a_no_rhythm[:final_trim_point]
    else:
        print("   ✅ Outro sufficient.")
        y_a_full = y_a_full[:final_trim_point]
        y_a_no_rhythm = y_a_no_rhythm[:final_trim_point]

    # [Step 3] Key Matching
    print("\n[Step 3] Processing Track B (Auto Key Matching)...")
    key_a, mode_a = get_key_from_audio(y_a_full, sr)
    key_b, mode_b = get_key_from_audio(y_b_bass_only, sr)
    shift_steps = get_pitch_shift_steps(key_a, key_b)
    
    print(f"   🎹 Track A: {key_a} ({mode_a}), Track B: {key_b} ({mode_b})")
    print(f"   🎼 Auto Pitch Shift: {shift_steps} semitones")

    samples_needed_from_b = int(overlap_samples_target * (bpm_a / bpm_b))
    
    if shift_steps != 0:
        y_b_bass_only = pyrb.pitch_shift(y_b_bass_only, sr, n_steps=shift_steps)

    y_b_intro_raw = y_b_bass_only[:samples_needed_from_b]
    print("   🎸 Boosting Track B Bass (+3.5dB)...")
    y_b_intro_raw = y_b_intro_raw * 1.5

    y_b_blend_synced = match_bpm_with_safety_margin(y_b_intro_raw, sr, bpm_b, bpm_a, overlap_samples_target)
    
    # [Step 4] Mixing
    print("\n[Step 4] Applying Mixing (A No-Bass + B Bass-Boost)...")
    y_a_no_bass = load_and_merge_stems(track_a_name, ['vocals', 'drums', 'other'], OUTPUT_DIR, TARGET_SR)
    
    part_a_body = y_a_full[:vocal_end_point]
    chunk_a_no_bass = y_a_no_bass[vocal_end_point:vocal_end_point + overlap_samples_target]
    chunk_b_bass = y_b_blend_synced
    
    mix_len = min(len(chunk_a_no_bass), len(chunk_b_bass))
    fade_out_curve = np.linspace(1.0, 0.0, mix_len)
    mixed_chunk = (chunk_a_no_bass[:mix_len] * fade_out_curve * 0.8) + (chunk_b_bass[:mix_len] * 0.8)
    
    part_b_body = y_b_full[samples_needed_from_b:]

    # [Step 5] Finalizing
    print("\n[Step 5] Finalizing...")
    final_mix = smooth_concatenate([part_a_body, mixed_chunk, part_b_body], fade_samples=128)

    name_a = os.path.splitext(track_a_name)[0]
    name_b = os.path.splitext(track_b_name)[0]
    output_path = os.path.join(OUTPUT_DIR, "blends", f"blend_{name_a}_to_{name_b}.wav")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, final_mix, sr)
    print(f"\n✨ Success! Blend Mix saved to: {output_path}")
    
    return output_path


# ====================================================
# 🚀 DROP MIX 전략
# ====================================================
def execute_drop_mix(track_a_name, track_b_name, bridge_bars=4):
    """Drop Mix: 빌드업 + 2배속 가속 후 즉각 전환"""
    print("\n" + "="*60)
    print("🚀 DROP MIX MODE")
    print("="*60)
    
    file_a = os.path.join(INPUT_DIR, track_a_name)
    file_b = os.path.join(INPUT_DIR, track_b_name)

    if not os.path.exists(file_a) or not os.path.exists(file_b):
        raise FileNotFoundError("파일을 찾을 수 없습니다.")

    print(f"\n🎧 Mixing Track A: {track_a_name}")
    print(f"🎧 Mixing Track B: {track_b_name}")

    print("\n[Step 0] Preparing Stems...")
    separate_stems(track_a_name)
    separate_stems(track_b_name)

    print("\n[Step 1] Analyzing Beats & Audio...")
    info_a = get_beat_info(file_a)
    info_b = get_beat_info(file_b)

    bpm_a = info_a['bpm']
    bpm_b = info_b['bpm']
    y_a_full = info_a['audio']
    y_b_full = info_b['audio']
    sr = info_a['sr']
    downbeats_a = info_a['downbeats']
    downbeats_b = info_b['downbeats']

    target_bpm = bpm_b * 2.0

    print(f"\n[Step 2] Drop Mix Configuration...")
    print(f"   🚀 Speed Change: {bpm_a:.1f} BPM -> {target_bpm:.1f} BPM (200% of Track B)")
    print(f"   ⏱️ Bridge Length: {bridge_bars} Bars")

    if len(downbeats_a) < 2 or len(downbeats_b) < 1:
        raise ValueError("Tracks too short for Drop Mix.")

    # Cut point: A의 마지막 다운비트
    cut_point_a = downbeats_a[-1]
    start_point_b = downbeats_b[0]

    # 마지막 1박자 추출
    samples_per_beat_a = int(60.0 / bpm_a * sr)
    source_chunk = y_a_full[cut_point_a - samples_per_beat_a : cut_point_a]
    
    # 브릿지 생성 (반복)
    print("\n[Step 3] Building Bridge...")
    repeats = bridge_bars * 4
    raw_bridge = np.tile(source_chunk, repeats)

    # Tempo Ramp 적용
    print(f"   📈 Ramping tempo: {bpm_a:.1f} -> {target_bpm:.1f} BPM...")
    ramped_bridge = create_tempo_ramp(raw_bridge, sr, bpm_a, target_bpm, steps=repeats)

    # High-Pass Filter (Low Cut) 적용
    print("   🎛️ Applying High-Pass filter (cutoff: 400Hz)...")
    from scipy.signal import butter, sosfilt
    sos = butter(4, 400 / (sr / 2), btype='high', output='sos')
    filtered_bridge = sosfilt(sos, ramped_bridge)
    
    # 볼륨 Fade In
    fade_in = np.linspace(0.6, 1.0, len(filtered_bridge))
    final_bridge = filtered_bridge * fade_in

    # [Step 4] Concatenation
    print("\n[Step 4] Finalizing...")
    final_mix = np.concatenate([
        y_a_full[:cut_point_a], 
        final_bridge, 
        y_b_full[start_point_b:]
    ])

    name_a = os.path.splitext(track_a_name)[0]
    name_b = os.path.splitext(track_b_name)[0]
    output_path = os.path.join(OUTPUT_DIR, "blends", f"drop_{name_a}_to_{name_b}.wav")
    
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    sf.write(output_path, final_mix, sr)
    print(f"\n✨ Success! Drop Mix saved to: {output_path}")
    
    return output_path


# ====================================================
# 🚀 메인 진입점 (Node.js 호출용)
# ====================================================
def run_mix(track_a, track_b, mix_type="blend", bridge_bars=4):
    """
    메인 믹싱 함수
    
    Args:
        track_a: Track A 파일명
        track_b: Track B 파일명
        mix_type: "blend" 또는 "drop"
        bridge_bars: Drop Mix 시 브릿지 길이 (마디 수)
    
    Returns:
        output_path: 생성된 믹스 파일 경로
    """
    print(f"\n🎵 Starting Mix Engine...")
    print(f"   Track A: {track_a}")
    print(f"   Track B: {track_b}")
    print(f"   Mix Type: {mix_type}")
    
    if mix_type.lower() == "blend":
        return execute_blend_mix(track_a, track_b)
    elif mix_type.lower() == "drop":
        return execute_drop_mix(track_a, track_b, bridge_bars)
    else:
        raise ValueError(f"Unknown mix type: {mix_type}. Use 'blend' or 'drop'.")


# ====================================================
# CLI 진입점
# ====================================================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input provided"}))
        sys.exit(1)
    
    try:
        # JSON 입력 파싱
        input_arg = sys.argv[1]
        
        if input_arg.startswith('{'):
            params = json.loads(input_arg)
        else:
            # 구버전 호환: 개별 인자
            params = {
                "trackA": sys.argv[1] if len(sys.argv) > 1 else None,
                "trackB": sys.argv[2] if len(sys.argv) > 2 else None,
                "mixType": sys.argv[3] if len(sys.argv) > 3 else "blend",
                "bridgeBars": int(sys.argv[4]) if len(sys.argv) > 4 else 4
            }
        
        track_a = params.get('trackA') or params.get('sourceId')
        track_b = params.get('trackB') or params.get('targetId')
        mix_type = params.get('mixType', 'blend')
        bridge_bars = params.get('bridgeBars', 4)
        
        if not track_a or not track_b:
            raise ValueError("trackA and trackB are required")
        
        output_path = run_mix(track_a, track_b, mix_type, bridge_bars)
        
        print(json.dumps({
            "success": True, 
            "outputPath": output_path,
            "mixType": mix_type
        }, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)
