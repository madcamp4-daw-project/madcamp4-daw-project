import numpy as np
import scipy.signal

def butter_lowpass_filter(data, cutoff, fs, order=4):
    """
    오디오에서 저음(Bass)만 걸러내는 필터 (Butterworth Filter)
    """
    nyquist = 0.5 * fs
    normal_cutoff = cutoff / nyquist
    # sos (Second-Order Sections) 방식이 안정적입니다.
    sos = scipy.signal.butter(order, normal_cutoff, btype='low', analog=False, output='sos')
    y = scipy.signal.sosfilt(sos, data)
    return y

def apply_eq_mix(y1, y2, sr, overlap_len):
    """
    [사용자 요청 로직]
    1. A 베이스 Out -> B 베이스 In (Bass Swap)
    2. A 전체 Out -> B 전체 In (Transition Complete)
    """
    # 길이 맞추기 (안전장치)
    min_len = min(len(y1), len(y2), overlap_len)
    y1 = y1[-min_len:]  # A의 끝부분
    y2 = y2[:min_len]   # B의 앞부분
    
    # ---------------------------------------------------------
    # 1. 주파수 분리 (Split Frequency)
    # ---------------------------------------------------------
    # 컷오프 주파수: 250Hz (킥 드럼과 베이스라인이 뭉쳐있는 구간)
    cutoff = 250
    
    # A 트랙 분리
    y1_low = butter_lowpass_filter(y1, cutoff, sr) # 저음
    y1_high = y1 - y1_low                          # 나머지 (중고음)
    
    # B 트랙 분리
    y2_low = butter_lowpass_filter(y2, cutoff, sr)
    y2_high = y2 - y2_low

    # ---------------------------------------------------------
    # 2. 볼륨 곡선 만들기 (Volume Automation)
    # ---------------------------------------------------------
    half_len = min_len // 2
    
    # === STEP 1: 베이스 교체 (0% ~ 50% 구간) ===
    # A Low: 1 -> 0 (베이스 빠짐)
    gain_a_low_1 = np.linspace(1.0, 0.0, half_len)
    # B Low: 0 -> 1 (베이스 들어옴)
    gain_b_low_1 = np.linspace(0.0, 1.0, half_len)
    
    # A High: 1 (계속 유지)
    gain_a_high_1 = np.ones(half_len)
    # B High: 0 -> 0.5 (서서히 들어오거나, 2단계에서 확 들어오게 설정 가능)
    # 자연스러움을 위해 1단계에서도 B의 고음이 살짝 들리게 선형 증가 (0 -> 0.5)
    gain_b_high_1 = np.linspace(0.0, 0.5, half_len)

    # === STEP 2: 나머지 교체 (50% ~ 100% 구간) ===
    # A Low: 0 (이미 빠짐)
    gain_a_low_2 = np.zeros(min_len - half_len)
    # B Low: 1 (이미 들어옴)
    gain_b_low_2 = np.ones(min_len - half_len)
    
    # A High: 1 -> 0 (나머지 소리 퇴장)
    gain_a_high_2 = np.linspace(1.0, 0.0, min_len - half_len)
    # B High: 0.5 -> 1 (나머지 소리 완전히 등장)
    gain_b_high_2 = np.linspace(0.5, 1.0, min_len - half_len)

    # 곡선 합치기
    curve_a_low = np.concatenate((gain_a_low_1, gain_a_low_2))
    curve_a_high = np.concatenate((gain_a_high_1, gain_a_high_2))
    
    curve_b_low = np.concatenate((gain_b_low_1, gain_b_low_2))
    curve_b_high = np.concatenate((gain_b_high_1, gain_b_high_2))

    # ---------------------------------------------------------
    # 3. 최종 합성 (Synthesis)
    # ---------------------------------------------------------
    # 각 주파수 대역에 볼륨 곡선 적용
    y1_mixed = (y1_low * curve_a_low) + (y1_high * curve_a_high)
    y2_mixed = (y2_low * curve_b_low) + (y2_high * curve_b_high)
    
    # 두 트랙 더하기
    mixed_segment = y1_mixed + y2_mixed
    
    return mixed_segment

# 테스트용 (이 파일을 직접 실행할 경우)
if __name__ == "__main__":
    print("Mixer module is ready.")