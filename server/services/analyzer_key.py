import numpy as np
import librosa

def get_key_from_audio(y, sr):
    """
    오디오의 키(Key)를 분석하여 (0~11, mode) 형태로 반환합니다.
    0: C, 1: C#, ..., 11: B
    mode: 'major' or 'minor'
    """
    # 1. Chromagram 추출 (음계 에너지 분포)
    # harmonic 성분만 추출해서 분석하면 더 정확함
    y_harmonic = librosa.effects.harmonic(y)
    chroma = librosa.feature.chroma_cqt(y=y_harmonic, sr=sr)
    
    # 시간축 평균 -> 12개의 음계 에너지값 (C, C#, D ... B)
    chroma_vals = np.sum(chroma, axis=1)

    # 2. Key Profiles (Krumhansl-Schmuckler)
    # 각 키가 가질법한 에너지 패턴 (Major / Minor)
    maj_profile = [6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88]
    min_profile = [6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17]

    # 3. 상관관계 분석 (Correlation)
    maj_corrs = []
    min_corrs = []

    for i in range(12):
        # 프로필을 한 칸씩 밀면서(Rotation) 현재 곡과 비교
        maj_shifted = np.roll(maj_profile, i)
        min_shifted = np.roll(min_profile, i)
        
        maj_corrs.append(np.corrcoef(chroma_vals, maj_shifted)[0, 1])
        min_corrs.append(np.corrcoef(chroma_vals, min_shifted)[0, 1])

    # 4. 가장 높은 점수를 얻은 키 찾기
    best_maj = np.argmax(maj_corrs)
    best_min = np.argmax(min_corrs)

    if maj_corrs[best_maj] > min_corrs[best_min]:
        return best_maj, 'major'
    else:
        return best_min, 'minor'

def get_pitch_shift_steps(key_a, key_b):
    """
    Key B를 Key A로 맞추기 위한 최단 거리(semitone) 계산
    예: C(0) -> D(2) : +2
    예: C(0) -> B(11): -1 (11칸 올리는 것보다 1칸 내리는게 자연스러움)
    """
    diff = (key_a - key_b)
    
    # -6 ~ +6 사이의 최단 경로로 보정
    # (예: +11 Semitone -> -1 Semitone)
    steps = (diff + 6) % 12 - 6
    
    return steps