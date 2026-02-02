# server/services/extract_beat.py
# Pure Madmom Version (Improved for Shuffle Rhythms like 'Rosanna')

import sys
import json
import os
import numpy as np
import librosa
import soundfile as sf
from scipy.spatial.distance import cdist

# 한글 출력 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

# =========================================================
# [필수] Madmom 호환성 패치
# =========================================================
try:
    import warnings
    # numpy 경고를 잠시 무시하고 패치 적용
    with warnings.catch_warnings():
        warnings.filterwarnings("ignore", category=DeprecationWarning)
        try:
            if not hasattr(np, 'float'):
                np.float = float
            if not hasattr(np, 'int'):
                np.int = int
            if not hasattr(np, 'bool'):
                np.bool = bool
        except:
            pass
    
    import collections
    import collections.abc
    if not hasattr(collections, 'MutableSequence'):
        collections.MutableSequence = collections.abc.MutableSequence
except Exception:
    pass

# =========================================================
# [필수] 라이브러리 로드 (다운비트 전용 모듈)
# =========================================================
try:
    import madmom
    from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor
except ImportError as e:
    print(json.dumps({"success": False, "error": f"Madmom Import Error: {str(e)}"}, ensure_ascii=False))
    sys.exit(1)

# =========================================================
# 메인 로직
# =========================================================
def load_stem(folder, stem_name, sr=44100):
    path = os.path.join(folder, stem_name)
    if os.path.exists(path):
        try:
            y, _ = librosa.load(path, sr=sr)
            return y
        except:
            return None
    return None

def extract_best_loop(input_folder, bpm_hint=None, shift_idx=0, fine_tune=0.0):
    try:
        track_id = os.path.basename(os.path.normpath(input_folder))
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) 
        save_dir = os.path.join(base_dir, 'output', 'beat_loops')
        os.makedirs(save_dir, exist_ok=True)

        output_filename = f"loop_{track_id}.wav"
        output_path = os.path.join(save_dir, output_filename)

        print(f"🔍 Loop Analysis [Improved Madmom]: {track_id}")
        
        # 1. Load Stems
        y_drums = load_stem(input_folder, 'drums.wav')
        y_bass = load_stem(input_folder, 'bass.wav')
        y_other = load_stem(input_folder, 'other.wav')

        if y_drums is None and y_bass is None and y_other is None:
            raise ValueError("No audio stems found.")

        # Reference 선택 (드럼 우선)
        if y_drums is not None:
            y_ref = y_drums.copy()
        elif y_bass is not None:
            y_ref = y_bass.copy()
        else:
            y_ref = y_other.copy()

        sr = 44100

        # 길이 맞추기
        max_len = len(y_ref)
        if y_bass is not None: max_len = max(max_len, len(y_bass))
        if y_other is not None: max_len = max(max_len, len(y_other))

        def pad_audio(y, length):
            if y is None: return np.zeros(length)
            if len(y) < length: return np.pad(y, (0, length - len(y)))
            return y[:length]

        y_drums = pad_audio(y_drums, max_len)
        y_bass = pad_audio(y_bass, max_len)
        y_other = pad_audio(y_other, max_len)
        # y_ref도 패딩 처리 (원본 신호 보존용)
        y_ref = pad_audio(y_ref, max_len)

        # ---------------------------------------------------------
        # [핵심 수정 1] 신호 전처리 (Signal Preprocessing)
        # Rosanna 문제 해결: 고스트 노트(작은 소리)를 억제하고 킥/스네어를 강조
        # ---------------------------------------------------------
        # 신호를 증폭 후 제곱하여 SNR(Signal-to-Noise Ratio)을 인위적으로 높임
        y_ref_processed = y_ref * 2.0 
        y_ref_processed = np.sign(y_ref_processed) * (np.abs(y_ref_processed) ** 2)

        # ---------------------------------------------------------
        # [핵심 수정 2] Madmom 파라미터 튜닝 (BPM Constraint)
        # ---------------------------------------------------------
        # 1. RNN으로 확률 계산 (전처리된 신호 사용)
        proc = RNNDownBeatProcessor()
        act = proc(y_ref_processed)
        
        # 2. 파라미터 설정
        min_bpm = 60
        max_bpm = 200
        transition_lambda = 100 # 기본값

        # BPM 힌트가 유효하게 들어왔다면 범위를 좁힘 (더블 템포/하프 템포 방지)
        if bpm_hint is not None and bpm_hint > 10:
            min_bpm = bpm_hint * 0.8   # ±20% 여유
            max_bpm = bpm_hint * 1.2
            transition_lambda = 150    # 템포 변화에 덜 민감하게(안정적으로) 설정
            print(f" 🔒 BPM Locked to range: {min_bpm:.1f} - {max_bpm:.1f} (lambda: {transition_lambda})")

        # 3. DBN으로 비트 위치 확정
        tracker = DBNDownBeatTrackingProcessor(
            beats_per_bar=[4], 
            fps=100,
            min_bpm=min_bpm,
            max_bpm=max_bpm,
            transition_lambda=transition_lambda
        )
        beats_info = tracker(act)
        
        # beats_info 구조: [시간(초), 비트번호(1~4)]
        if len(beats_info) < 17:
            raise ValueError("Not enough beats detected (requires > 4 bars).")

        beat_times = beats_info[:, 0]
        beat_nums = beats_info[:, 1]
        
        # BPM 계산
        intervals = np.diff(beat_times)
        tempo = 60.0 / np.mean(intervals)

        # 다운비트(비트 번호가 1인 것) 추출
        downbeat_indices_in_result = np.where(beat_nums == 1)[0]
        
        if len(downbeat_indices_in_result) == 0:
            print(" ⚠️ No downbeats found. Defaulting to first beat.")
            downbeat_indices_in_result = [0]
        else:
            print(f" 🎯 Madmom Detected {len(downbeat_indices_in_result)} Downbeats")

        # 샘플 단위 변환
        beat_samples = (beat_times * sr).astype(int)

        # ---------------------------------------------------------
        # 루프 자르기 및 저장
        # ---------------------------------------------------------
        candidate_specs = []
        candidate_indices = []

        for idx_in_result in downbeat_indices_in_result:
            # 16비트(4마디) 뒤가 존재하는지 확인
            if idx_in_result + 16 >= len(beat_samples): break
            
            start_sample = beat_samples[idx_in_result]
            end_sample = beat_samples[idx_in_result + 16]
            
            # 원본(패딩된) 신호에서 자름 (y_ref_processed 아님)
            segment_ref = y_ref[start_sample:end_sample]
            if len(segment_ref) < sr * 2.0: continue 
            
            mels = librosa.feature.melspectrogram(y=segment_ref, sr=sr, n_mels=128)
            mels_resized = librosa.util.fix_length(mels, size=512, axis=1)
            candidate_specs.append(mels_resized.flatten())
            candidate_indices.append((start_sample, end_sample))

        if not candidate_specs:
            raise ValueError("No valid loops generated.")

        # 최적 루프 선정 (중앙값 유사도)
        stack = np.array(candidate_specs)
        distances = cdist(stack, np.mean(stack, axis=0).reshape(1, -1), metric='euclidean')
        best_idx = np.argmin(distances)
        
        target_idx = max(0, min(len(candidate_indices) - 1, best_idx + shift_idx))
        best_start, best_end = candidate_indices[target_idx]

        # Fine-tune
        if fine_tune != 0:
            samples_per_beat = int((60.0 / tempo) * sr)
            shift_samples = int(samples_per_beat * fine_tune)
            best_start += shift_samples
            best_end += shift_samples
            if best_start < 0: best_start = 0
            if best_end > max_len: best_end = max_len

        # Mix & Save
        final_mix = y_drums[best_start:best_end] + y_bass[best_start:best_end] + y_other[best_start:best_end]
        max_val = np.max(np.abs(final_mix))
        if max_val > 0: final_mix = final_mix / max_val * 0.9

        # Fade In/Out
        fade_len = int(0.01 * sr)
        if len(final_mix) > fade_len * 2:
            final_mix[:fade_len] *= np.linspace(0, 1, fade_len)
            final_mix[-fade_len:] *= np.linspace(1, 0, fade_len)

        sf.write(output_path, final_mix, sr)
        
        print(json.dumps({
            "success": True,
            "tempo": float(tempo),
            "folder": "beat_loops",
            "filename": output_filename,
            "full_path": output_path,
            "engine": "madmom_improved",
            "shift": shift_idx,
            "fine_tune": fine_tune
        }, ensure_ascii=False))

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)

if __name__ == '__main__':
    if len(sys.argv) < 2: sys.exit(1)
    input_f = sys.argv[1]
    bpm = None; shift = 0; fine_tune = 0.0
    
    # Argv Parsing
    if len(sys.argv) > 2:
        try: bpm = float(sys.argv[2])
        except: pass
    if len(sys.argv) > 3:
        try: shift = int(sys.argv[3])
        except: pass
    if len(sys.argv) > 4:
        try: fine_tune = float(sys.argv[4])
        except: pass
        
    extract_best_loop(input_f, bpm, shift, fine_tune)