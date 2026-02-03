# server/services/analyzer_vocal.py
import numpy as np
import librosa

def find_vocal_end_point(y_vocals, sr):
    """
    보컬 트랙(y_vocals)에서 목소리가 실질적으로 끝나는 지점(샘플 인덱스)을 찾습니다.
    """
    if y_vocals is None or len(y_vocals) == 0:
        return 0

    # 1. RMS 에너지 계산
    hop_length = 512
    frame_length = 2048
    rms = librosa.feature.rms(y=y_vocals, frame_length=frame_length, hop_length=hop_length)[0]
    
    # 2. 정규화 및 임계값 설정
    if np.max(rms) == 0: return 0
    rms_norm = (rms - np.min(rms)) / (np.max(rms) - np.min(rms))
    
    # 임계값: 최대 볼륨의 10% 미만이면 '침묵'으로 간주
    threshold = 0.1 
    
    # 3. 뒤에서부터 검색 (Backwards Scan)
    frames = len(rms_norm)
    for i in range(frames - 1, 0, -1):
        if rms_norm[i] > threshold:
            # 목소리가 발견됨!
            # 잔향(Reverb) 등을 고려해 2초 정도 여유를 두고 반환
            buffer_sec = 2.0
            buffer_frames = int(buffer_sec * sr / hop_length)
            
            end_frame = min(frames, i + buffer_frames)
            return end_frame * hop_length
            
    return 0 # 보컬이 아예 없음