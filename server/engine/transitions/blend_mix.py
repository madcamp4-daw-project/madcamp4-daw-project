import numpy as np
from engine.transitions.base_transition import BaseTransition
from services.analyzer_key import get_key_from_audio, get_pitch_shift_steps # 새로 만든 모듈

class BlendMixStrategy(BaseTransition):
    def process(self, data_a, data_b, bars=32):
        print(f"   🎛️ Running Blend Mix (Harmonic Mixing) - {bars} Bars")
        
        y_a, bpm_a, dbs_a = data_a['audio'], data_a['bpm'], data_a['downbeats']
        y_b, bpm_b, dbs_b = data_b['audio'], data_b['bpm'], data_b['downbeats']

        # -----------------------------------------------------
        # [Step 1] Key Analysis & Matching (추가된 부분)
        # -----------------------------------------------------
        print("      🎹 Analyzing Keys...")
        # 전체 곡을 다 분석하면 느리므로, 믹싱에 쓸 부분만 잘라서 분석 (속도 최적화)
        sample_len = 30 * self.sr # 30초
        
        key_a_idx, mode_a = get_key_from_audio(y_a[:sample_len], self.sr)
        key_b_idx, mode_b = get_key_from_audio(y_b[:sample_len], self.sr)
        
        # 이동해야 할 거리 계산 (Semitone 단위)
        semitone_steps = get_pitch_shift_steps(key_a_idx, key_b_idx)
        
        keys = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        print(f"      🎵 Key A: {keys[key_a_idx]} {mode_a} / Key B: {keys[key_b_idx]} {mode_b}")
        print(f"      🔧 Pitch Shift: {semitone_steps:+.0f} semitones applied to Track B")

        # -----------------------------------------------------
        # [Step 2] Data Preparation
        # -----------------------------------------------------
        if len(dbs_a) < bars + 1 or len(dbs_b) < bars + 1:
            raise ValueError(f"Tracks too short.")

        idx_start_a = dbs_a[-(bars + 1)]
        idx_end_a = dbs_a[-1]
        
        idx_start_b = dbs_b[0]
        idx_end_b = dbs_b[bars]

        segment_a_raw = y_a[idx_start_a : idx_end_a]
        segment_b_raw = y_b[idx_start_b : idx_end_b]

        # -----------------------------------------------------
        # [Step 3] Apply Pitch Shift (Track B)
        # -----------------------------------------------------
        # B의 음정을 A에 맞춤
        if semitone_steps != 0:
            segment_b_shifted = self.ts.apply_pitch_shift(segment_b_raw, semitone_steps)
        else:
            segment_b_shifted = segment_b_raw

        # -----------------------------------------------------
        # [Step 4] Dynamic Tempo Sync
        # -----------------------------------------------------
        # Pitch가 변형된 B를 사용하여 템포 싱크
        segment_a_sync = self.ts.sync_to_ramp(
            segment_a_raw, input_bpm=bpm_a, start_bpm=bpm_a, end_bpm=bpm_b, steps=bars
        )
        
        segment_b_sync = self.ts.sync_to_ramp(
            segment_b_shifted, input_bpm=bpm_b, start_bpm=bpm_a, end_bpm=bpm_b, steps=bars
        )

        # 길이 보정
        min_len = min(len(segment_a_sync), len(segment_b_sync))
        if min_len % 2 != 0: min_len -= 1
        
        seg_a = segment_a_sync[:min_len]
        seg_b = segment_b_sync[:min_len]

        # -----------------------------------------------------
        # [Step 5] Bass Swap
        # -----------------------------------------------------
        half = min_len // 2
        seg_a_hpf = self.eq.apply_high_pass(seg_a, 300)
        seg_b_hpf = self.eq.apply_high_pass(seg_b, 300)
        
        fade_in = np.linspace(0.5, 1.0, half)
        fade_out = np.linspace(1.0, 0, half)

        part1 = seg_a[:half] + (seg_b_hpf[:half] * fade_in)
        part2 = (seg_a_hpf[half:] * fade_out) + seg_b[half:]
        
        mix_region = np.concatenate((part1, part2))

        # -----------------------------------------------------
        # [Step 6] Final Concatenation
        # -----------------------------------------------------
        # 중요: 믹싱 이후의 B곡(뒷부분)도 키가 바뀌어야 하나요?
        # 보통은 믹싱 중에만 맞추고 원곡 키로 돌아가거나,
        # 혹은 아주 자연스럽게 넘어가려면 B곡 전체의 키를 바꿔야 합니다.
        # 여기서는 *믹싱 구간만* 키를 맞추고, 이후에는 원곡 키가 나오도록 둡니다.
        # (만약 B 전체를 바꾸고 싶다면 process 초반에 y_b 전체를 pitch shift 해야 함 -> 매우 느림)
        
        return np.concatenate((
            y_a[:idx_start_a], 
            mix_region, 
            y_b[idx_end_b:]
        ))