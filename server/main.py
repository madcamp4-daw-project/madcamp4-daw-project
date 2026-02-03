import os
import sys
import numpy as np
import librosa
import soundfile as sf
import warnings
from scipy import signal
import pyrubberband as pyrb

# 🔥 V2 비트 추출기
from services.extract_beat_v2 import extract_best_loop_v2 as extract_best_loop

# 기존 서비스 모듈들
from services.analyzer_beat import get_beat_info
from services.analyzer_intro import get_intro_duration
from services.analyzer_outro import find_outro_endpoint
from services.stem_separation import separate_stems
from services.analyzer_vocal import find_vocal_end_point
from services.analyzer_key import get_key_from_audio, get_pitch_shift_steps

# Madmom (Downbeat Snap용)
try:
    from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
except ImportError:
    pass

warnings.filterwarnings("ignore")

# ====================================================
# 📝 [설정 영역]
# ====================================================
INPUT_DIR = "./uploads"
OUTPUT_DIR = "./output"
TRACK_A_NAME = "My Way.mp3"
TRACK_B_NAME = "Whiplash.mp3"
TARGET_SR = 44100
BPM_THRESHOLD = 20  # 🔥 BPM 차이가 이 값보다 크면 Drop Mix 실행

# ====================================================
# 🛠️ Helper Functions
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
    """
    [수정 사항]
    BPM 증가 곡선을 'Linear(선형)'에서 'Geometric(기하급수)'로 변경했습니다.
    이제 초반에는 천천히 빨라지다가, 후반부에 급격하게(Exponential) 빨라집니다.
    """
    if start_bpm == end_bpm: return y
    
    chunk_len = len(y) // steps
    chunks = []
    
    # 🔥 [핵심 변경] 급격한 곡선 만들기
    # np.linspace (더하기 방식) -> np.geomspace (곱하기 방식)
    # 예: 100 -> 120 -> 150 -> 200 -> 300 -> 600 -> 2000...
    bpm_curve = np.geomspace(start_bpm, end_bpm, steps)
    
    for i in range(steps):
        start = i * chunk_len
        end = start + chunk_len if i < steps - 1 else len(y)
        chunk = y[start:end]
        
        if len(chunk) < sr * 0.05:
             chunks.append(chunk)
             continue
             
        # 미리 계산해둔 급격한 곡선에서 목표 BPM을 가져옴
        current_target_bpm = bpm_curve[i]
        
        # Rate 계산
        rate = current_target_bpm / base_bpm
        
        # Rubberband Stretch
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
    # 모델명 확인 (htdemucs_ft)
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

# ====================================================
# 🧨 [Strategy 1] Drop Mix Logic (Trust Vocal Stem)
# ====================================================
def run_drop_mix(y_a, y_a_vocals, y_b, bpm_a, bpm_b, sr, cut_point_a, vocal_end_point):
    print(f"\n🚀 [Strategy: Drop Mix] Extreme Riser Mode!")
    
    target_bpm = bpm_b * 50.0 
    print(f"   🔥 Speed Build-up: {bpm_a:.1f} -> {target_bpm:.1f} BPM (Max 50x)")
    
    source_chunk = None
    samples_per_beat_a = int(60.0 / bpm_a * sr)
    
    # 기본 컷 포인트는 곡의 끝부분이지만...
    actual_cut_point = cut_point_a 

    # ----------------------------------------------------
    # 🔥 [핵심 수정] Vocal Anchor Strategy
    # ----------------------------------------------------
    # "스템이 잘 분리되었다"면 vocal_end_point는 정확할 것입니다.
    # 곡의 끝(cut_point_a)에서 찾지 말고, vocal_end_point 지점을 직접 타격합니다.
    
    if vocal_end_point is not None and vocal_end_point > samples_per_beat_a:
        # 보컬이 끝나는 지점 바로 앞 1박자를 가져옴
        vocal_chunk = y_a_vocals[vocal_end_point - samples_per_beat_a : vocal_end_point]
        
        # 에너지 확인 (혹시 모르니)
        rms = np.sqrt(np.mean(vocal_chunk**2))
        print(f"   🎤 Checking Vocal End Point... RMS: {rms:.4f}")
        
        if rms > 0.001: # 아주 작은 소리라도 있으면 채택
            print("      ✅ Targeted Vocal End Point directly!")
            
            # [볼륨 보정] 스템의 볼륨을 원곡 레벨에 맞춤
            full_ref = y_a[vocal_end_point - samples_per_beat_a : vocal_end_point]
            full_rms = np.sqrt(np.mean(full_ref**2))
            
            if rms > 0:
                gain = full_rms / rms
                gain = np.clip(gain, 1.5, 4.0) # 최대 4배까지 허용 (확실하게 들리게)
                source_chunk = vocal_chunk * gain
            else:
                source_chunk = vocal_chunk * 2.0
            
            # 🔥 [중요] 실제 자르는 위치를 '보컬이 끝나는 지점'으로 강제 이동
            # 뒤에 반주가 남았어도 무시하고 여기서 자름 -> 바로 루프 시작
            actual_cut_point = vocal_end_point
            print(f"      ✂️ Cut Point Moved: Syncing to Vocal End ({actual_cut_point/sr:.2f}s)")
            
    # ----------------------------------------------------
    # [Fallback] 만약 vocal_end_point가 이상하면 기존 탐색 로직 가동
    # ----------------------------------------------------
    if source_chunk is None:
        print("   ⚠️ Vocal End Point missed. Scanning backwards from instrumental end...")
        # (기존의 for loop 탐색 로직 - 비상용)
        for i in range(16): 
            end = cut_point_a - (samples_per_beat_a * i)
            start = end - samples_per_beat_a
            if start < 0: break
            
            chunk = y_a_vocals[start:end]
            rms = np.sqrt(np.mean(chunk**2))
            if rms > 0.005:
                # ... (발견 시 처리 로직 동일) ...
                source_chunk = chunk * 2.0 # 간략화
                actual_cut_point = end
                break

    # 여전히 없으면 비트
    if source_chunk is None:
        print("   🥁 Fallback to Beat Loop.")
        source_chunk = get_best_loop_segment(y_a, sr, cut_point_a, bpm_a)
        if source_chunk is None:
            source_chunk = y_a[cut_point_a - samples_per_beat_a : cut_point_a]

    # ----------------------------------------------------
    # Tightening & Ramp (50x Extreme)
    # ----------------------------------------------------
    # 루프 타이트닝
    tight_len = int(len(source_chunk) * 0.97)
    source_chunk = source_chunk[:tight_len]

    # 12마디 반복
    bars = 12 
    repeats = bars * 4 
    raw_bridge = np.tile(source_chunk, repeats)
    
    # 시작 속도 5% 부스트
    adjusted_start_bpm = bpm_a * 1.05 
    
    print(f"   ⏱️ Generating Bridge ({bars} bars)...")
    
    ramped_bridge = create_tempo_ramp(
        raw_bridge, 
        sr, 
        start_bpm=adjusted_start_bpm, 
        end_bpm=target_bpm, 
        base_bpm=bpm_a, 
        steps=repeats
    )
    
    # 이펙트
    filtered_bridge = apply_high_pass(ramped_bridge, sr, cutoff=400)
    fade_in = np.linspace(0.6, 1.0, len(filtered_bridge))
    final_bridge = filtered_bridge * fade_in
    
    # Track B 무음 제거
    y_b_trimmed, _ = librosa.effects.trim(y_b, top_db=20)

    # Hard Cut 연결
    part_1 = smooth_concatenate([y_a[:actual_cut_point], final_bridge], fade_samples=512)
    final_mix = np.concatenate([part_1, y_b_trimmed])
    
    return final_mix

# ====================================================
# 🍹 [Strategy 2] Blend Mix Logic (Padding & Timing Fix)
# ====================================================
def run_blend_mix(y_a_full, y_a_no_rhythm, y_a_vocals, y_b_full, y_b_bass, bpm_a, bpm_b, sr, 
                  overlap_samples, vocal_end, trim_point, track_b_name):
    
    print(f"\n🍹 [Strategy: Blend Mix] Fixed Timing Transition...")

    # [Step 3] Processing Track B
    samples_needed_from_b = int(overlap_samples * (bpm_a / bpm_b))
    y_b_intro_raw = y_b_bass[:samples_needed_from_b]
    
    y_b_intro_raw = y_b_intro_raw * 1.5
    y_b_blend_synced = match_bpm_with_safety_margin(y_b_intro_raw, sr, bpm_b, bpm_a, overlap_samples)

    # [Step 4] Mixing
    y_a_no_bass = load_and_merge_stems(TRACK_A_NAME, ['vocals', 'drums', 'other'], OUTPUT_DIR, sr)
    
    part_a_main = y_a_full[:vocal_end]
    
    # 🔥 [수정 1] Track A 조각 가져오기 (범위 초과 방지 및 패딩)
    end_sample_a = min(len(y_a_no_bass), vocal_end + overlap_samples)
    chunk_a_raw = y_a_no_bass[vocal_end : end_sample_a]
    
    if len(chunk_a_raw) < overlap_samples:
        pad_len = overlap_samples - len(chunk_a_raw)
        chunk_a_no_bass = np.pad(chunk_a_raw, (0, pad_len))
        print(f"   ⚠️ Track A is short. Padding {pad_len} samples to keep rhythm.")
    else:
        chunk_a_no_bass = chunk_a_raw

    # 이제 두 조각의 길이는 무조건 overlap_samples로 동일
    chunk_b_bass = y_b_blend_synced
    
    # 🔥 [수정 2] 정확한 길이로 믹싱 (min 제거)
    mix_len = overlap_samples 
    
    fade_out_curve = np.linspace(1.0, 0.0, mix_len)
    mixed_chunk = (chunk_a_no_bass * fade_out_curve * 0.8) + (chunk_b_bass * 0.8)
    
    # [Step 5] Finalizing
    part_b_body = y_b_full[samples_needed_from_b:]

    transition_a_to_blend = smooth_concatenate([part_a_main, mixed_chunk], fade_samples=512)
    
    # 🔥 정확한 타이밍 연결 (Micro-Fade)
    final_mix = smooth_concatenate([transition_a_to_blend, part_b_body], fade_samples=256)
    
    return final_mix

# ====================================================
# 🚀 메인 실행 로직
# ====================================================
def main():
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    file_a = os.path.join(INPUT_DIR, TRACK_A_NAME)
    file_b = os.path.join(INPUT_DIR, TRACK_B_NAME)

    if not os.path.exists(file_a) or not os.path.exists(file_b):
        print("❌ 파일을 찾을 수 없습니다.")
        return

    print(f"\n🎧 Mixing Track A: {TRACK_A_NAME}")
    print(f"🎧 Mixing Track B: {TRACK_B_NAME}")

    print("\n[Step 0] Preparing Stems...")
    separate_stems(TRACK_A_NAME)
    separate_stems(TRACK_B_NAME)

    y_a_full, sr = librosa.load(file_a, sr=TARGET_SR)
    y_b_full, _ = librosa.load(file_b, sr=TARGET_SR)

    y_a_no_rhythm = load_and_merge_stems(TRACK_A_NAME, ['vocals', 'other'], OUTPUT_DIR, TARGET_SR)
    y_b_rhythm = load_and_merge_stems(TRACK_B_NAME, ['bass', 'drums'], OUTPUT_DIR, TARGET_SR)
    y_a_vocals_only = load_and_merge_stems(TRACK_A_NAME, ['vocals'], OUTPUT_DIR, TARGET_SR)
    y_b_bass_only = load_and_merge_stems(TRACK_B_NAME, ['bass'], OUTPUT_DIR, TARGET_SR)

    print("\n[Step 1] Analyzing Audio...")
    info_a = get_beat_info(file_a)
    info_b = get_beat_info(file_b)
    bpm_a, bpm_b = info_a['bpm'], info_b['bpm']
    
    bpm_diff = abs(bpm_a - bpm_b)
    print(f"\n⚖️ BPM Difference: {bpm_diff:.1f} (Threshold: {BPM_THRESHOLD})")

    trim_point_vol = find_outro_endpoint(y_a_full, sr)
    snapped_point = find_smart_trim_point(y_a_full, sr, trim_point_vol, bpm_a)
    final_trim_point = snapped_point

    # 🔥 공통: 보컬 끝나는 지점 계산 (Drop Mix에서도 사용하기 위해 위로 이동)
    vocal_end_point = find_vocal_end_point(y_a_vocals_only, sr)

    if bpm_diff > BPM_THRESHOLD:
        final_mix = run_drop_mix(
            y_a=y_a_full,
            y_a_vocals=y_a_vocals_only, # 보컬 스템 전달
            y_b=y_b_full,
            bpm_a=bpm_a,
            bpm_b=bpm_b,
            sr=sr,
            cut_point_a=final_trim_point,
            vocal_end_point=vocal_end_point # 보컬 끝 지점 전달
        )
        strategy_name = "drop_mix"
    else:
        intro_sec_raw_b = get_intro_duration(file_b)
        intro_beats = max(4, int(round(intro_sec_raw_b * (bpm_b / 60.0))))
        overlap_duration_target = intro_beats * (60.0 / bpm_a)
        overlap_samples_target = int(overlap_duration_target * sr)
        
        # 키 매칭
        key_a, _ = get_key_from_audio(y_a_full, sr)
        key_b, _ = get_key_from_audio(y_b_bass_only, sr)
        shift_steps = get_pitch_shift_steps(key_a, key_b)
        if shift_steps != 0:
            print(f"   🎹 Auto Pitch Shift: {shift_steps} semitones")
            y_b_bass_only = pyrb.pitch_shift(y_b_bass_only, sr, n_steps=shift_steps)

        final_mix = run_blend_mix(
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
            track_b_name=TRACK_B_NAME
        )
        strategy_name = "blend_mix"

    final_mix = normalize_audio(final_mix)
    name_a = os.path.splitext(TRACK_A_NAME)[0]
    name_b = os.path.splitext(TRACK_B_NAME)[0]
    output_path = os.path.join(OUTPUT_DIR, f"mix_{strategy_name}_{name_a}_to_{name_b}.wav")
    
    sf.write(output_path, final_mix, sr)
    print(f"\n✨ Success! [{strategy_name}] saved to: {output_path}")

if __name__ == "__main__":
    main()