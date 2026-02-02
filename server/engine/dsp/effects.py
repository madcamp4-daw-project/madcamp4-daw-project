import numpy as np
from engine.dsp.filters import EQFilter

class AudioEffects:
    """
    [DSP Module] Audio Effects Processor
    Delay(Echo), Fade 등을 파이썬 numpy 연산으로 구현합니다.
    """

    def __init__(self, sr=44100):
        self.sr = sr
        self.eq = EQFilter(sr)

    def apply_delay(self, audio, bpm, beats=1.0, feedback=0.6, mix=0.5, hi_pass=600):
        """
        [Echo/Delay Effect]
        비트 단위로 에코를 생성합니다.
        
        :param beats: 딜레이 간격 (1.0 = 1박자, 0.5 = 8분음표)
        :param feedback: 반복될 때마다 줄어드는 비율 (0.0 ~ 1.0)
        :param mix: 원음 대비 에코 소리 크기 (0.0 ~ 1.0)
        :param hi_pass: 에코 소리의 저음을 깎을 주파수 (Hz) - 웅웅거림 방지
        """
        # 1. 딜레이 시간(샘플) 계산
        sec_per_beat = 60.0 / bpm
        delay_samples = int(sec_per_beat * beats * self.sr)
        
        # 2. 에코가 지속될 전체 길이 계산 (소리가 거의 사라질 때까지: -60dB 기준)
        # feedback^n < 0.001 이 되는 n을 대략적으로 8~10회 반복으로 가정
        repeats = 8
        tail_len = delay_samples * repeats
        
        # 3. 결과 버퍼 생성 (원본 길이 + 잔향 길이)
        total_len = len(audio) + tail_len
        output = np.zeros(total_len)
        
        # 원본 복사
        output[:len(audio)] = audio

        # 4. Feedback Loop (메아리 생성)
        # 젖은 신호(Wet Signal)만 따로 만듭니다.
        wet_signal = np.zeros(total_len)
        
        # 첫 번째 에코는 원본에서 시작
        current_source = audio
        current_pos = delay_samples
        current_vol = 1.0

        for _ in range(repeats):
            current_vol *= feedback
            
            # 에코 위치가 전체 길이를 넘으면 중단
            if current_pos >= total_len: break
            
            # 복사할 길이 계산
            chunk_len = len(current_source)
            if current_pos + chunk_len > total_len:
                chunk_len = total_len - current_pos
            
            # 더하기 (Overlay)
            wet_signal[current_pos : current_pos + chunk_len] += (current_source[:chunk_len] * current_vol)
            
            # 다음 루프 준비
            current_pos += delay_samples

        # 5. 에코 톤 정리 (High-Pass Filter)
        # 중요: 에코의 킥 소리가 벙벙대지 않게 저음을 깎아줍니다.
        if hi_pass > 0:
            wet_signal = self.eq.apply_high_pass(wet_signal, cutoff=hi_pass)

        # 6. 최종 믹싱 (Dry + Wet)
        # 원본(output에는 이미 audio가 들어있음) + 에코 * mix
        output += (wet_signal * mix)
        
        # 클리핑 방지
        max_val = np.max(np.abs(output))
        if max_val > 1.0:
            output /= max_val

        return output

    def apply_fade(self, audio, mode='in', duration_sec=None, curve='linear'):
        """
        [Volume Fader]
        Fade In / Fade Out을 적용합니다.
        """
        length = len(audio)
        if length == 0: return audio

        # 적용할 샘플 길이 (지정 안 하면 전체 길이)
        if duration_sec:
            fade_samples = int(duration_sec * self.sr)
            fade_samples = min(fade_samples, length)
        else:
            fade_samples = length

        # 커브 생성 (0.0 ~ 1.0)
        if curve == 'linear':
            envelope = np.linspace(0, 1, fade_samples)
        else:
            # exponential (더 자연스러운 페이드)
            envelope = np.geomspace(0.01, 1.0, fade_samples)

        # 모드 적용
        if mode == 'in':
            # 앞부분 Fade In
            audio[:fade_samples] *= envelope
        elif mode == 'out':
            # 뒷부분 Fade Out (커브 뒤집기)
            envelope = envelope[::-1] 
            audio[-fade_samples:] *= envelope
            
        return audio