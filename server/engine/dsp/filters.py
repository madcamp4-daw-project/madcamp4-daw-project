import numpy as np
from scipy.signal import butter, sosfiltfilt

class EQFilter:
    """
    DJ 스타일의 EQ 조절을 위한 디지털 필터 클래스
    scipy.signal의 Butterworth 필터를 사용합니다.
    """

    def __init__(self, sr=44100):
        self.sr = sr

    def _create_butter_sos(self, cutoff, btype, order=4):
        """
        필터 계수(SOS: Second-Order Sections)를 생성하는 내부 함수
        order가 높을수록(예: 4~6) 칼같이 깎입니다 (DJ Kill Switch 느낌).
        """
        # Nyquist Frequency (샘플링 레이트의 절반)
        nyq = 0.5 * self.sr
        normal_cutoff = cutoff / nyq
        
        # 필터 설계 (sos 포맷이 안정성이 높음)
        sos = butter(order, normal_cutoff, btype=btype, analog=False, output='sos')
        return sos

    def apply_high_pass(self, audio_data, cutoff=300):
        """
        [Low Cut] 저음역대를 제거합니다. (DJ가 Low 노브를 0으로 돌린 상태)
        - audio_data: (samples, channels) 형태의 numpy array
        - cutoff: 차단할 주파수 (Hz). 보통 킥/베이스는 200~300Hz 이하입니다.
        """
        # 0. 0이나 NaN 방지
        if len(audio_data) == 0: return audio_data

        # 1. 필터 생성
        sos = self._create_butter_sos(cutoff, 'highpass')

        # 2. 필터 적용 (axis=0은 시간축)
        # sosfiltfilt는 위상 왜곡 없는(Zero-phase) 필터링을 수행합니다.
        filtered_audio = sosfiltfilt(sos, audio_data, axis=0)
        
        return filtered_audio

    def apply_low_pass(self, audio_data, cutoff=300):
        """
        [High Cut] 고음역대를 제거하고 저음만 남깁니다. (베이스만 듣고 싶을 때)
        - cutoff: 이 주파수 이하만 통과시킵니다.
        """
        if len(audio_data) == 0: return audio_data

        sos = self._create_butter_sos(cutoff, 'lowpass')
        filtered_audio = sosfiltfilt(sos, audio_data, axis=0)
        
        return filtered_audio

    def apply_band_pass(self, audio_data, low_cut=300, high_cut=2000):
        """
        [Isolator] 중간 음역대(보컬 등)만 남깁니다.
        """
        if len(audio_data) == 0: return audio_data

        nyq = 0.5 * self.sr
        low = low_cut / nyq
        high = high_cut / nyq
        
        sos = butter(4, [low, high], btype='band', output='sos')
        filtered_audio = sosfiltfilt(sos, audio_data, axis=0)
        
        return filtered_audio

# ==========================================
# 사용 예시 (테스트용)
# ==========================================
if __name__ == "__main__":
    import librosa
    import soundfile as sf

    # 1. 테스트 파일 로드 (가상의 경로)
    # y의 shape: (samples,) 또는 (channels, samples) -> librosa는 (channels, samples)로 부름
    # 하지만 scipy는 기본적으로 (samples, channels)를 좋아하므로 transpose가 필요할 수 있음
    print("🧪 Testing EQ Filter...")
    
    # 예시용 더미 데이터 (Stereo)
    sr = 44100
    duration = 5.0
    t = np.linspace(0, duration, int(sr * duration))
    # 50Hz(Bass) + 1000Hz(Mid) + 5000Hz(High) 섞인 신호
    y_stereo = np.array([
        np.sin(2 * np.pi * 50 * t) + 0.5 * np.sin(2 * np.pi * 1000 * t), # Left
        np.sin(2 * np.pi * 50 * t) + 0.3 * np.sin(2 * np.pi * 5000 * t)  # Right
    ]).T # Transpose to (Samples, Channels)

    # 2. 필터 객체 생성
    eq = EQFilter(sr=sr)

    # 3. Low Cut (베이스 제거) -> High Pass Filter 적용
    print("Applying High Pass (Removing Bass)...")
    y_no_bass = eq.apply_high_pass(y_stereo, cutoff=300)

    # 4. High Cut (베이스만 남김) -> Low Pass Filter 적용
    print("Applying Low Pass (Isolating Bass)...")
    y_only_bass = eq.apply_low_pass(y_stereo, cutoff=300)

    # 저장 (실제 사용 시)
    # sf.write('output_no_bass.wav', y_no_bass, sr)
    # sf.write('output_only_bass.wav', y_only_bass, sr)
    print("✅ Done.")