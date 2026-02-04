import sys
import os
import numpy as np
import librosa
import soundfile as sf
import pyrubberband as pyrb
from scipy import signal
import warnings

warnings.filterwarnings("ignore")

# =========================================================
# 🔧 [Patch] Madmom 호환성 패치 (필수)
# =========================================================
try:
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        try:
            if not hasattr(np, 'float'): np.float = float
            if not hasattr(np, 'int'): np.int = int
            if not hasattr(np, 'bool'): np.bool = bool
        except:
            pass
    import collections
    import collections.abc
    if not hasattr(collections, 'MutableSequence'):
        collections.MutableSequence = collections.abc.MutableSequence
except Exception:
    pass

try:
    import madmom
    from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
except ImportError:
    print("❌ Error: Madmom library not found. Please install it.")
    sys.exit(1)

# =========================================================
# 🔧 [Helper] 저음 에너지 & 위상 보정
# =========================================================
def get_low_freq_energy(y, sr):
    """150Hz 이하 킥/베이스 에너지 측정"""
    try:
        sos = signal.butter(4, 150, 'lp', fs=sr, output='sos')
        y_low = signal.sosfilt(sos, y)
        return np.sqrt(np.mean(y_low**2))
    except:
        return 0

def validate_and_fix_phase(y_drums, sr, start_idx, beat_samples, downbeat_idx):
    """
    Madmom이 잡은 1번 박자가 진짜 1번인지, 3번(Snare)인지 
    저음 에너지를 비교하여 수정 (Phase Correction)
    """
    if downbeat_idx + 2 >= len(beat_samples): return start_idx
    
    # 후보 1: 현재 Madmom이 찍은 1번 박자
    idx_1 = beat_samples[downbeat_idx]
    len_1 = int(0.4 * sr)
    chunk_1 = y_drums[idx_1 : idx_1 + len_1]
    
    # 후보 2: 2박자 뒤 (3번 박자)
    idx_3 = beat_samples[downbeat_idx + 2]
    chunk_3 = y_drums[idx_3 : idx_3 + len_1]
    
    # 에너지 비교
    energy_1 = get_low_freq_energy(chunk_1, sr)
    energy_3 = get_low_freq_energy(chunk_3, sr)
    
    # 3번 박자의 킥 에너지가 1.3배 이상 크면 -> 뒤집힌 것임
    if energy_3 > energy_1 * 1.3:
        # print(f"      🔄 Phase Fix: Shifted to real Downbeat (Beat 3 -> 1)")
        return idx_3
        
    return idx_1

# =========================================================
# 🔧 [Helper] 그리드 퀀타이즈 (박자 다림질)
# =========================================================
def quantize_loop_to_grid(y, sr, bpm, beats):
    """
    추출된 오디오를 강제로 정박자 그리드에 맞춤 (Warping)
    """
    if bpm <= 0: return y
    target_beat_len = int(sr * (60.0 / bpm))
    warped_pieces = []
    
    for i in range(len(beats) - 1):
        start = beats[i]
        end = beats[i+1]
        piece = y[start:end]
        
        if len(piece) == 0: continue

        rate = target_beat_len / len(piece)
        
        if 0.8 < rate < 1.2:
            try:
                stretched = pyrb.time_stretch(piece, sr, 1.0/rate)
                if len(stretched) > target_beat_len:
                    stretched = stretched[:target_beat_len]
                elif len(stretched) < target_beat_len:
                    stretched = np.pad(stretched, (0, target_beat_len - len(stretched)))
                warped_pieces.append(stretched)
            except:
                warped_pieces.append(piece)
        else:
            warped_pieces.append(piece)
            
    if not warped_pieces: return y
    return np.concatenate(warped_pieces)

def load_stem(folder, stem_name, sr=44100):
    path = os.path.join(folder, stem_name)
    if os.path.exists(path):
        try:
            y, _ = librosa.load(path, sr=sr)
            return y
        except:
            return None
    return None

# =========================================================
# 🚀 메인 추출 함수 (Madmom + Smart Features)
# =========================================================
def extract_best_loop_v2(input_folder, bpm_hint=None):
    try:
        track_id = os.path.basename(os.path.normpath(input_folder))
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
        save_dir = os.path.join(base_dir, 'output', 'beat_loops')
        os.makedirs(save_dir, exist_ok=True)
        output_path = os.path.join(save_dir, f"loop_{track_id}_v2.wav")

        print(f"   🔍 Loop Analysis (Madmom + Phase Fix): {track_id}")

        # 1. 스템 로드
        y_drums = load_stem(input_folder, 'drums.wav')
        y_other = load_stem(input_folder, 'other.wav')
        
        if y_drums is None: y_drums = load_stem(input_folder, 'bass.wav')
        y_anal = y_drums if y_drums is not None else y_other # 분석은 드럼
        y_save = y_other if y_other is not None else y_drums # 저장은 반주
        
        if y_anal is None or y_save is None: return None

        sr = 44100
        max_len = max(len(y_anal), len(y_save))
        def pad(y, l):
            if len(y) < l: return np.pad(y, (0, l - len(y)))
            return y[:l]
        y_anal = pad(y_anal, max_len)
        y_save = pad(y_save, max_len)

        # 2. Madmom 분석 (RNN)
        proc = RNNDownBeatProcessor()
        y_proc = y_anal * 2.0 
        y_proc = np.sign(y_proc) * (np.abs(y_proc) ** 2)
        act = proc(y_proc)
        
        min_b = bpm_hint * 0.8 if bpm_hint else 60
        max_b = bpm_hint * 1.2 if bpm_hint else 200
        
        tracker = DBNDownBeatTrackingProcessor(beats_per_bar=[4], fps=100, min_bpm=min_b, max_bpm=max_b)
        beats_info = tracker(act) # [time, beat_num]
        
        beat_times = beats_info[:, 0]
        beat_nums = beats_info[:, 1]
        beat_samples = (beat_times * sr).astype(int)
        
        # 다운비트(1번) 인덱스들
        downbeat_indices_map = np.where(beat_nums == 1)[0]
        
        best_score = -1
        final_start = 0
        final_end = 0
        selected_beats = []

        # 3. 최적 루프 찾기 + 위상 보정
        for db_idx in downbeat_indices_map:
            if db_idx + 16 >= len(beat_samples): break
            
            start_samp = beat_samples[db_idx]
            
            # 🔥 [Phase Fix] 킥 에너지 검증
            corrected_start = validate_and_fix_phase(y_anal, sr, start_samp, beat_samples, db_idx)
            
            # 보정된 위치 기준으로 16비트 뒤 찾기
            # (정확히 하려면 보정된 인덱스부터 다시 세야 함)
            # 여기서는 간단히: 보정된 시작점부터 16비트 뒤의 샘플을 beat_samples에서 찾거나 추정
            
            # 보정된 시작점이 beat_samples의 몇 번째인지 찾기
            corrected_beat_idx_arr = np.where(beat_samples == corrected_start)[0]
            if len(corrected_beat_idx_arr) == 0: continue
            corrected_beat_idx = corrected_beat_idx_arr[0]
            
            if corrected_beat_idx + 16 >= len(beat_samples): continue
            
            corrected_end = beat_samples[corrected_beat_idx + 16]
            
            # 에너지 점수 계산
            segment = y_anal[corrected_start:corrected_end]
            score = np.sqrt(np.mean(segment**2))
            
            if score > best_score:
                best_score = score
                final_start = corrected_start
                final_end = corrected_end
                # 퀀타이즈를 위해 해당 구간의 모든 비트 샘플 저장
                selected_beats = beat_samples[corrected_beat_idx : corrected_beat_idx + 17]

        if best_score == -1: return None

        # 4. 루프 추출 (Other Stem 사용)
        raw_loop = y_save[final_start:final_end]
        
        # 5. 그리드 퀀타이즈 (박자 다림질)
        # Madmom이 찾은 비트 간격을 기계적인 정박으로 펴줌
        bpm = bpm_hint if bpm_hint else 120.0
        relative_beats = selected_beats - selected_beats[0]
        final_loop = quantize_loop_to_grid(raw_loop, sr, bpm, relative_beats)
        
        # 6. 마무리 (Normalize & De-click)
        mx = np.max(np.abs(final_loop))
        if mx > 0: final_loop = final_loop / mx * 0.85
        
        f_len = 128
        final_loop[:f_len] *= np.linspace(0, 1, f_len)
        final_loop[-f_len:] *= np.linspace(1, 0, f_len)

        sf.write(output_path, final_loop, sr)
        print(f"   💾 Saved Loop to: {output_path}")
        return output_path

    except Exception as e:
        print(f"Error extracting loop: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1: extract_best_loop_v2(sys.argv[1])