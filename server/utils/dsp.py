import os
import numpy as np
import librosa
import soundfile as sf
from scipy import signal
import pyrubberband as pyrb

# Madmom (Downbeat Snap용)
try:
    from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
except ImportError:
    pass

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

def smooth_concatenate(arrays, fade_samples=512):
    if not arrays: return np.array([])
    if len(arrays) == 1: return arrays[0]
    
    result = arrays[0]
    for i in range(1, len(arrays)):
        next_arr = arrays[i]
        
        if len(result) < fade_samples or len(next_arr) < fade_samples:
            result = np.concatenate([result, next_arr])
            continue
            
        fade_out = np.cos(np.linspace(0, np.pi / 2, fade_samples))
        fade_in = np.sin(np.linspace(0, np.pi / 2, fade_samples))
        
        overlap_prev = result[-fade_samples:] * fade_out
        overlap_next = next_arr[:fade_samples] * fade_in
        
        combined = overlap_prev + overlap_next
        result = np.concatenate([result[:-fade_samples], combined, next_arr[fade_samples:]])
        
    return result

def get_low_freq_energy(y, sr):
    """150Hz 이하 킥/베이스 에너지 측정 (위상 검증용)"""
    try:
        sos = signal.butter(4, 150, 'lp', fs=sr, output='sos')
        y_low = signal.sosfilt(sos, y)
        return np.sqrt(np.mean(y_low**2))
    except:
        return 0

def find_smart_trim_point(y, sr, target_sample, bpm_hint):
    """Smart Snap & Phase Correction"""
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
        
        # 1. 위상 보정
        check_len = int(0.4 * sr)
        e1 = get_low_freq_energy(y[chosen_point : chosen_point + check_len], sr)
        samples_per_beat = int(sr * 60 / bpm_hint)
        point_beat3 = chosen_point + (samples_per_beat * 2)
        
        if point_beat3 + check_len < len(y):
            e3 = get_low_freq_energy(y[point_beat3 : point_beat3 + check_len], sr)
            if e3 > e1 * 1.3:
                print("      🔄 Trim Phase Fix: Shifted to real Downbeat (+2 beats)")
                chosen_point = point_beat3
        
        # 2. 전진 스냅
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

def create_tempo_ramp(y, sr, start_bpm, end_bpm, base_bpm, steps=32):
    """Geometric Ramp (기하급수 가속)"""
    if start_bpm == end_bpm: return y
    chunk_len = len(y) // steps
    chunks = []
    
    # 🔥 np.geomspace를 사용한 급격한 가속 곡선
    bpm_curve = np.geomspace(start_bpm, end_bpm, steps)
    
    for i in range(steps):
        start = i * chunk_len
        end = start + chunk_len if i < steps - 1 else len(y)
        chunk = y[start:end]
        if len(chunk) < sr * 0.05:
             chunks.append(chunk)
             continue
             
        current_target_bpm = bpm_curve[i]
        rate = current_target_bpm / base_bpm
        
        stretched = pyrb.time_stretch(chunk, sr, rate)
        stretched = preserve_energy(chunk, stretched)
        chunks.append(stretched)
    return smooth_concatenate(chunks, fade_samples=64)

def apply_high_pass(y, sr, cutoff=400):
    try:
        sos = signal.butter(10, cutoff, 'hp', fs=sr, output='sos')
        return signal.sosfilt(sos, y)
    except:
        return y

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

def get_best_loop_segment(y, sr, cut_point, bpm):
    """에너지 기반 최고의 비트 루프 선택"""
    samples_per_beat = int(60.0 / bpm * sr)
    candidates = []
    
    for i in range(4):
        end = cut_point - (samples_per_beat * i)
        start = end - samples_per_beat
        if start < 0: break
        
        segment = y[start:end]
        rms = np.sqrt(np.mean(segment**2))
        candidates.append({'segment': segment, 'rms': rms, 'index': i})
    
    if not candidates: return None

    best_candidate = sorted(candidates, key=lambda x: x['rms'], reverse=True)[0]
    print(f"   🎯 Loop Selection: Picked beat -{best_candidate['index']+1} (Highest Energy)")
    return best_candidate['segment']