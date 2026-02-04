# server/services/extract_beat.py

import sys
import os
import numpy as np
import librosa
import soundfile as sf
from scipy.spatial.distance import cdist
from scipy import signal 

# =========================================================
# [필수] Madmom 호환성 패치
# =========================================================
try:
    import warnings
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
    pass

# =========================================================
# 🔊 [Helper] 위상(Phase) 검증 함수
# =========================================================
def get_low_freq_energy(y, sr):
    """150Hz 이하 킥/베이스 에너지 측정"""
    sos = signal.butter(4, 150, 'lp', fs=sr, output='sos')
    y_low = signal.sosfilt(sos, y)
    return np.sqrt(np.mean(y_low**2))

def validate_and_fix_phase(y_drums, sr, start_idx, beat_samples, downbeat_idx):
    """
    Madmom이 잡은 1번 박자가 진짜 1번인지, 3번(Snare)인지 
    저음 에너지를 비교하여 수정
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
        print(f"      🔄 Phase Fix: 3rd beat is louder ({energy_3:.3f} > {energy_1:.3f}). Shifting...")
        return idx_3
        
    return idx_1

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
# 🚀 메인 추출 함수
# =========================================================
def extract_best_loop(input_folder, bpm_hint=None, shift_idx=0, fine_tune=0.0):
    try:
        # 1. 경로 설정 (server/output/beat_loops)
        # input_folder 예: .../output/htdemucs/SongName
        track_id = os.path.basename(os.path.normpath(input_folder))
        
        # 현재 파일(extract_beat.py) 위치: server/services/
        # base_dir: server/
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
        save_dir = os.path.join(base_dir, 'output', 'beat_loops')
        
        # 폴더가 없으면 생성
        os.makedirs(save_dir, exist_ok=True)
        
        output_filename = f"loop_{track_id}.wav"
        output_path = os.path.join(save_dir, output_filename)

        print(f"   🔍 Loop Analysis (Phase-Fixed, Other-Only): {track_id}")
        
        # 2. 스템 로드
        y_drums = load_stem(input_folder, 'drums.wav')
        y_other = load_stem(input_folder, 'other.wav')
        
        if y_drums is None: y_drums = load_stem(input_folder, 'bass.wav')

        # 분석은 드럼(리듬)으로, 저장은 Other(반주)로
        y_anal = y_drums if y_drums is not None else y_other
        y_save = y_other if y_other is not None else y_drums

        sr = 44100
        max_len = max(len(y_anal), len(y_save))
        
        def pad(y, l):
            if len(y) < l: return np.pad(y, (0, l - len(y)))
            return y[:l]
            
        y_anal = pad(y_anal, max_len)
        y_save = pad(y_save, max_len)

        # 3. Madmom 분석
        proc = RNNDownBeatProcessor()
        y_proc = y_anal * 2.0 
        y_proc = np.sign(y_proc) * (np.abs(y_proc) ** 2)
        act = proc(y_proc)
        
        min_b = bpm_hint * 0.8 if bpm_hint else 60
        max_b = bpm_hint * 1.2 if bpm_hint else 200
        
        tracker = DBNDownBeatTrackingProcessor(beats_per_bar=[4], fps=100, min_bpm=min_b, max_bpm=max_b)
        beats_info = tracker(act)
        
        beat_samples = (beats_info[:, 0] * sr).astype(int)
        beat_nums = beats_info[:, 1]
        
        # 다운비트(1번) 인덱스들
        downbeat_indices_map = np.where(beat_nums == 1)[0]
        
        candidate_specs = []
        candidate_indices = []

        # 4. 후보 루프 추출 및 위상 보정
        for db_idx in downbeat_indices_map:
            if db_idx + 16 >= len(beat_samples): break
            
            start_samp = beat_samples[db_idx]
            end_samp = beat_samples[db_idx + 16]
            
            # 🔥 위상 보정 실행
            corrected_start = validate_and_fix_phase(y_anal, sr, start_samp, beat_samples, db_idx)
            
            loop_len = end_samp - start_samp
            corrected_end = corrected_start + loop_len
            
            if corrected_end > len(y_anal): continue

            # 스펙트로그램 비교용
            seg = y_anal[corrected_start:corrected_end]
            if len(seg) < sr*2: continue
            
            mels = librosa.feature.melspectrogram(y=seg, sr=sr)
            mels = librosa.util.fix_length(mels, size=512, axis=1)
            candidate_specs.append(mels.flatten())
            candidate_indices.append((corrected_start, corrected_end))

        if not candidate_specs: return None

        # 5. 최적 루프 선정
        stack = np.array(candidate_specs)
        dists = cdist(stack, np.mean(stack, axis=0).reshape(1, -1), 'euclidean')
        best_idx = np.argmin(dists)
        
        target_idx = max(0, min(len(candidate_indices)-1, best_idx + shift_idx))
        final_start, final_end = candidate_indices[target_idx]

        # 6. 저장 (y_save -> Other Stem 사용)
        final_loop = y_save[final_start:final_end]
        
        # Normalize & De-click Fade
        mx = np.max(np.abs(final_loop))
        if mx > 0: final_loop = final_loop / mx * 0.85
        
        f_len = 128
        final_loop[:f_len] *= np.linspace(0, 1, f_len)
        final_loop[-f_len:] *= np.linspace(1, 0, f_len)

        # 파일 쓰기
        sf.write(output_path, final_loop, sr)
        print(f"   💾 Saved Beat Loop to: {output_path}")
        
        return output_path

    except Exception as e:
        print(f"Error extracting beat: {e}")
        return None

if __name__ == '__main__':
    if len(sys.argv) > 1: extract_best_loop(sys.argv[1])