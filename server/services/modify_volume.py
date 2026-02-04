# server/services/modify_volume.py
# Dynamic Energy Maintainer (Instrumental Replacement Mode)
# Strategy: Crossfade. As the Loop enters, the Original Instrumental is removed.
# Result: Outro becomes purely "Loop + Vocals".

import sys
import json
import os
import numpy as np
import librosa
import soundfile as sf
import scipy.signal

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def load_stem(folder, stem_name, sr=44100):
    path = os.path.join(folder, stem_name)
    if os.path.exists(path):
        y, _ = librosa.load(path, sr=sr)
        return y
    return None

def create_beat_synced_track(y_song, y_loop, sr, loop_phase_offset=0, manual_shift=0):
    # (이전과 동일한 싱크 로직)
    print(f"   ⏳ Synchronizing Loop (Phase: {loop_phase_offset}, Shift: {manual_shift})...")
    
    tempo, beat_frames = librosa.beat.beat_track(y=y_song, sr=sr)
    beat_samples = librosa.frames_to_samples(beat_frames)
    
    if len(beat_samples) < 17:
        repeat_count = int(np.ceil(len(y_song) / len(y_loop)))
        return np.tile(y_loop, repeat_count)[:len(y_song)]

    first_match_index = -1
    for i in range(len(beat_samples)):
        if i % 4 == loop_phase_offset:
            first_match_index = i
            break
            
    if first_match_index == -1: first_match_index = 0
    first_match_index += manual_shift
    
    if first_match_index < 0:
        while first_match_index < 0: first_match_index += 4
            
    print(f"      👉 Loop Start Index: {first_match_index} (Time: {beat_samples[first_match_index]/sr:.2f}s)")

    y_synced = np.zeros_like(y_song)
    for i in range(first_match_index, len(beat_samples) - 16, 16):
        start_sample = beat_samples[i]
        end_sample = beat_samples[i+16]
        target_len = end_sample - start_sample
        if target_len <= 0: continue
        resampled = scipy.signal.resample(y_loop, target_len)
        chunk_len = min(len(y_synced) - start_sample, len(resampled))
        y_synced[start_sample : start_sample + chunk_len] += resampled[:chunk_len]
        
    return y_synced

def create_energy_fixed_song(input_folder, loop_path, output_path, phase_offset=0, manual_shift=0):
    try:
        print(f"🎛️ Starting Inst Replacement Mod (Phase: {phase_offset}, Shift: {manual_shift})")
        
        sr = 44100
        y_drums = load_stem(input_folder, 'drums.wav', sr)
        y_bass = load_stem(input_folder, 'bass.wav', sr)
        y_other = load_stem(input_folder, 'other.wav', sr)
        y_vocals = load_stem(input_folder, 'vocals.wav', sr)

        if y_drums is None: raise ValueError("Stems not found.")

        max_len = max(len(y) for y in [y_drums, y_bass, y_other, y_vocals] if y is not None)
        def pad(y): 
            if y is None: return np.zeros(max_len)
            if len(y) < max_len: return np.pad(y, (0, max_len - len(y)))
            return y[:max_len]

        y_drums, y_bass, y_other, y_vocals = map(pad, [y_drums, y_bass, y_other, y_vocals])
        
        y_inst_mix = y_drums + y_bass + y_other  # Original Inst
        y_loop, _ = librosa.load(loop_path, sr=sr)

        # Sync Loop
        y_loop_track = create_beat_synced_track(y_drums, y_loop, sr, int(phase_offset), int(manual_shift))

        print("   📊 Analyzing Energy & Crossfading...")
        frame_len, hop_len = 2048, 512
        rms_orig = librosa.feature.rms(y=y_inst_mix, frame_length=frame_len, hop_length=hop_len)[0]
        rms_loop = np.mean(librosa.feature.rms(y=y_loop, frame_length=frame_len, hop_length=hop_len)[0])
        
        # Threshold: Loop kicks in when original drops below 80% of loop power
        threshold = rms_loop * 0.8

        rms_interp = scipy.signal.resample(rms_orig, max_len)
        rms_interp = np.maximum(rms_interp, 0)

        # loop_amount: 0.0 (Original is loud) -> 1.0 (Original is silent)
        loop_amount = 1.0 - (rms_interp / (threshold + 1e-6))
        loop_amount = np.clip(loop_amount, 0.0, 1.0)
        
        smooth_win = int(sr * 0.1)
        loop_amount_smoothed = np.convolve(loop_amount, np.ones(smooth_win)/smooth_win, mode='same')

        # ★ CRITICAL CHANGE: CROSSFADE LOGIC ★
        # When Loop goes UP (1.0), Original Inst goes DOWN (0.0)
        gain_loop = loop_amount_smoothed
        gain_inst = 1.0 - loop_amount_smoothed 

        # Final Mix = (Original Inst * Decreasing Gain) + (Loop * Increasing Gain) + (Vocals * 100%)
        y_final = (y_inst_mix * gain_inst) + (y_loop_track * gain_loop) + y_vocals
        
        max_val = np.max(np.abs(y_final))
        if max_val > 1.0: y_final = y_final / max_val * 0.95

        sf.write(output_path, y_final, sr)
        print(json.dumps({"success": True, "output_path": output_path}, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 5:
        print(json.dumps({"error": "Usage: python modify_volume.py <folder> <loop> <output> <phase> [shift]"}))
        sys.exit(1)
    
    create_energy_fixed_song(sys.argv[1], sys.argv[2], sys.argv[3], sys.argv[4], 
                             sys.argv[5] if len(sys.argv) > 5 else 0)