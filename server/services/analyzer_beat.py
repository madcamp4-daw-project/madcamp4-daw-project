import sys
import types
import collections
import collections.abc
import numpy as np
import librosa
from unittest.mock import MagicMock

# =================================================================
# 🚑 [1순위] 가장 먼저 가짜 모듈을 등록해야 합니다! (순서 중요)
# =================================================================

# 1. PyAudio 가짜 모듈 생성 (BeatNet이 import하기 전에 미리 등록)
try:
    import pyaudio
except ImportError:
    # 가짜 모듈 객체 생성
    m = types.ModuleType("pyaudio")
    m.PyAudio = MagicMock()
    m.paFloat32 = 1
    m.paInt16 = 2
    # 시스템 모듈 목록에 강제로 등록
    sys.modules["pyaudio"] = m

# 2. Collections 호환성 패치 (혹시 모를 에러 방지)
if not hasattr(collections, 'MutableSequence'):
    collections.MutableSequence = collections.abc.MutableSequence
if not hasattr(collections, 'Iterable'):
    collections.Iterable = collections.abc.Iterable

# =================================================================
# 🤖 BeatNet Import (반드시 패치 이후에 와야 함)
# =================================================================
print("⏳ Loading BeatNet Model...")
estimator = None

try:
    # 위에서 가짜 PyAudio를 만들었기 때문에 이제 에러가 안 납니다.
    try:
        from beatnet.BeatNet import BeatNet
    except ImportError:
        from BeatNet.BeatNet import BeatNet
    
    # 모델 초기화
    estimator = BeatNet(1, mode='offline', inference_model='DBN', plot=[], thread=False)
    print("✅ BeatNet Model Loaded.")

except Exception as e:
    print(f"\n❌ BeatNet Load Error: {e}")
    estimator = None

# =================================================================
# 🛠️ Main Function
# =================================================================

def get_beat_info(file_path, bpm_hint=None):
    """
    BeatNet을 사용한 비트 분석
    """
    print(f"   🤖 Analyzing beats with BeatNet: {file_path}")
    
    # BeatNet 로딩 실패 시 Librosa 사용
    if estimator is None:
        print("   ⚠️ BeatNet is unavailable. Switching to Librosa.")
        return get_beat_info_librosa(file_path)
    
    try:
        # BeatNet 실행
        output = estimator.process(file_path)
        
        if output is None or len(output) == 0:
            raise ValueError("No beats detected")

        # 데이터 추출
        beat_times = output[:, 0]
        beat_probs = output[:, 1]

        # BPM 계산
        intervals = np.diff(beat_times)
        if len(intervals) > 0:
            bpm = 60.0 / np.mean(intervals)
        else:
            bpm = 120.0

        # 다운비트(첫 박자) 추출
        downbeats_sec = beat_times[beat_probs == 1.0]
        if len(downbeats_sec) == 0:
            downbeats_sec = np.array([beat_times[0]])

        # 오디오 로드
        y, sr = librosa.load(file_path, sr=44100)
        downbeats_sample = (downbeats_sec * sr).astype(int)

        return {
            "bpm": bpm,
            "downbeats": downbeats_sample,
            "audio": y,
            "sr": sr
        }

    except Exception as e:
        print(f"   ⚠️ BeatNet runtime failed ({e}). Falling back to Librosa.")
        return get_beat_info_librosa(file_path)

def get_beat_info_librosa(file_path):
    """
    [Fallback] Librosa 사용
    """
    print("   🦆 Using Librosa fallback...")
    y, sr = librosa.load(file_path, sr=44100)
    onset_env = librosa.onset.onset_strength(y=y, sr=sr)
    tempo, beats = librosa.beat.beat_track(onset_envelope=onset_env, sr=sr, units='samples')
    
    candidates = beats[:4]
    if len(candidates) > 0:
        loudness = [np.mean(np.abs(y[max(0, b-1000):min(len(y), b+1000)])) for b in candidates]
        best_offset = np.argmax(loudness)
    else:
        best_offset = 0
        
    downbeats = beats[best_offset::4]
    
    return {
        "bpm": float(tempo),
        "downbeats": downbeats,
        "audio": y,
        "sr": sr
    }