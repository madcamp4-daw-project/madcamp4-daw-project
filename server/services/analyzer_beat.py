# services/analyzer_beat.py
import numpy as np
import librosa
import collections
import collections.abc
# collections.MutableSequence가 없으면 collections.abc.MutableSequence를 가리키게 함
if not hasattr(collections, 'MutableSequence'):
    collections.MutableSequence = collections.abc.MutableSequence
from madmom.features.downbeats import RNNDownBeatProcessor, DBNDownBeatTrackingProcessor

def get_beat_info(file_path, bpm_hint=None):
    """
    오디오 파일을 분석하여 BPM과 다운비트의 샘플 위치(Indices)를 반환합니다.
    """
    y, sr = librosa.load(file_path, sr=44100)
    
    # 1. Madmom 분석 (전처리 및 파라미터는 앞서 최적화한 내용 적용)
    # (Rosanna 문제 해결을 위한 전처리 포함)
    y_processed = y * 2.0
    y_processed = np.sign(y_processed) * (np.abs(y_processed) ** 2)

    proc = RNNDownBeatProcessor()
    act = proc(y_processed)

    # BPM Hint 적용
    min_bpm, max_bpm, transition_lambda = 60, 200, 100
    if bpm_hint:
        min_bpm = bpm_hint * 0.8
        max_bpm = bpm_hint * 1.2
        transition_lambda = 150
        
    tracker = DBNDownBeatTrackingProcessor(
        beats_per_bar=[4], fps=100,
        min_bpm=min_bpm, max_bpm=max_bpm, transition_lambda=transition_lambda
    )
    beats_info = tracker(act) # [시간, 비트번호]

    # 2. 결과 가공
    beat_times = beats_info[:, 0]
    beat_nums = beats_info[:, 1]
    
    # BPM 계산
    intervals = np.diff(beat_times)
    bpm = 60.0 / np.mean(intervals)

    # 다운비트(1번 비트)의 샘플 인덱스 추출
    downbeat_times = beat_times[beat_nums == 1]
    downbeat_samples = (downbeat_times * sr).astype(int)

    return {
        "bpm": bpm,
        "downbeats": downbeat_samples, # [sample_idx1, sample_idx2, ...]
        "audio": y,
        "sr": sr
    }