import numpy as np
from engine.transitions.base_transition import BaseTransition

class BlendMixStrategy(BaseTransition):
    def process(self, data_a, data_b, bars=32):
        print(f"   🎛️ Running Blend Mix (Dynamic Tempo Bridge) - {bars} Bars")
        
        y_a, bpm_a, dbs_a = data_a['audio'], data_a['bpm'], data_a['downbeats']
        y_b, bpm_b, dbs_b = data_b['audio'], data_b['bpm'], data_b['downbeats']

        # 1. 구간 설정
        if len(dbs_a) < bars + 1 or len(dbs_b) < bars + 1:
            raise ValueError(f"Tracks too short. Need {bars} bars.")

        # A: 끝에서 bars만큼
        idx_start_a = dbs_a[-(bars + 1)]
        idx_end_a = dbs_a[-1]
        
        # B: 처음부터 bars만큼
        idx_start_b = dbs_b[0]
        idx_end_b = dbs_b[bars] # B도 정확히 bars만큼 가져옵니다.

        # 2. 원본 조각 가져오기
        segment_a_raw = y_a[idx_start_a : idx_end_a]
        segment_b_raw = y_b[idx_start_b : idx_end_b]

        # 3. Dynamic Tempo Sync (핵심!)
        # 목표: BPM A 에서 시작해서 BPM B 로 끝나는 곡선
        
        # Track A 변환: (입력: A) -> (목표: A -> B)
        # 결과: A가 점점 빨라지거나 느려지면서 B 속도에 도달함
        segment_a_sync = self.ts.sync_to_ramp(
            segment_a_raw, 
            input_bpm=bpm_a, 
            start_bpm=bpm_a, 
            end_bpm=bpm_b, 
            steps=bars
        )
        
        # Track B 변환: (입력: B) -> (목표: A -> B)
        # 결과: B가 A 속도에서 시작해서 점점 자기 속도(B)를 찾음
        segment_b_sync = self.ts.sync_to_ramp(
            segment_b_raw, 
            input_bpm=bpm_b, 
            start_bpm=bpm_a, 
            end_bpm=bpm_b, 
            steps=bars
        )

        # 4. 길이 보정 (Sample-Perfect Alignment)
        # 두 오디오가 계산 오차로 인해 1~2샘플 차이날 수 있으므로 맞춤
        min_len = min(len(segment_a_sync), len(segment_b_sync))
        if min_len % 2 != 0: min_len -= 1 # 짝수로 맞춤 (반으로 쪼개기 위해)
        
        seg_a = segment_a_sync[:min_len]
        seg_b = segment_b_sync[:min_len]

        # 5. Bass Swap (기존과 동일)
        half = min_len // 2
        
        # EQ
        seg_a_hpf = self.eq.apply_high_pass(seg_a, 300)
        seg_b_hpf = self.eq.apply_high_pass(seg_b, 300)

        # Crossfade
        fade_in = np.linspace(0.5, 1.0, half)
        fade_out = np.linspace(1.0, 0, half)

        # Mix Part 1: A Bass + B High
        part1 = seg_a[:half] + (seg_b_hpf[:half] * fade_in)
        
        # Mix Part 2: A High + B Bass
        part2 = (seg_a_hpf[half:] * fade_out) + seg_b[half:]
        
        mix_region = np.concatenate((part1, part2))

        # 6. 최종 연결
        # 믹스 구간이 끝나면 Track B는 이미 bpm_b 상태이므로,
        # 원본 Track B의 뒷부분을 그냥 붙이면 자연스럽게 이어짐!
        
        return np.concatenate((
            y_a[:idx_start_a],          # A 앞부분
            mix_region,                 # 변속 믹싱 구간 (A->B)
            y_b[idx_end_b:]             # B 뒷부분 (BPM B)
        ))