import librosa
import numpy as np

class TimeStretcher:
    def __init__(self, sr=44100):
        self.sr = sr

    def apply_rate(self, audio, rate):
        """기본 속도 변환"""
        if len(audio) == 0: return audio
        if rate <= 0: return audio
        if abs(rate - 1.0) < 0.001: return audio.copy()
        return librosa.effects.time_stretch(audio, rate=rate)

    def match_bpm(self, audio, source_bpm, target_bpm):
        """단순 BPM 맞추기"""
        if source_bpm <= 0 or target_bpm <= 0: return audio.copy()
        rate = target_bpm / source_bpm
        return self.apply_rate(audio, rate)

    def match_length(self, audio, target_samples):
        """특정 길이에 맞추기"""
        if len(audio) == 0: return audio
        if target_samples <= 0: return np.array([])
        rate = len(audio) / target_samples
        stretched = librosa.effects.time_stretch(audio, rate=rate)
        return librosa.util.fix_length(stretched, size=target_samples)

    # =========================================================
    # [Drop Mix용] 오디오 자체를 가속/감속 (단순 Ramp)
    # =========================================================
    def apply_ramp(self, audio, start_bpm, end_bpm, steps=8):
        if len(audio) == 0: return audio
        if start_bpm == end_bpm: return audio

        chunk_len = len(audio) // steps
        chunks = []
        
        # 목표 BPM 리스트 (예: 100, 105, 110...)
        target_bpms = np.linspace(start_bpm, end_bpm, steps)

        for i in range(steps):
            start_idx = i * chunk_len
            end_idx = (i + 1) * chunk_len if i < steps - 1 else len(audio)
            
            chunk = audio[start_idx : end_idx]
            
            # 현재 조각의 목표 속도 계산
            # (현재 start_bpm 상태인 조각을 target_bpm으로 바꾸려면?)
            current_target = target_bpms[i]
            rate = current_target / start_bpm
            
            processed_chunk = self.apply_rate(chunk, rate)
            chunks.append(processed_chunk)

        return np.concatenate(chunks)

    # =========================================================
    # [Blend Mix용] 시간 길이를 변속 곡선에 동기화 (Dynamic Sync)
    # =========================================================
    def sync_to_ramp(self, audio, input_bpm, start_bpm, end_bpm, steps=32):
        if len(audio) == 0: return audio

        chunk_len = len(audio) // steps
        processed_chunks = []
        
        target_bpms = np.linspace(start_bpm, end_bpm, steps)
        
        for i in range(steps):
            start_idx = i * chunk_len
            end_idx = (i + 1) * chunk_len if i < steps - 1 else len(audio)
            chunk = audio[start_idx : end_idx]
            
            current_target_bpm = target_bpms[i]
            
            # 길이 비율 계산 (핵심 차이점)
            # 입력 BPM 대비 목표 BPM의 비율만큼 '길이'를 조절
            length_ratio = input_bpm / current_target_bpm
            target_samples = int(len(chunk) * length_ratio)
            
            processed = self.match_length(chunk, target_samples)
            processed_chunks.append(processed)

        return np.concatenate(processed_chunks)