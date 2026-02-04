import numpy as np
from engine.transitions.base_transition import BaseTransition

class DropMixStrategy(BaseTransition):
    def process(self, data_a, data_b, bars=4): 
        
        y_a, bpm_a, dbs_a = data_a['audio'], data_a['bpm'], data_a['downbeats']
        y_b, bpm_b, dbs_b = data_b['audio'], data_b['bpm'], data_b['downbeats']

        # ====================================================
        # [FINAL LOGIC] 2x Speed Build-up
        # 목표: A 속도에서 시작해서 -> B 속도의 2배까지 가속
        # ====================================================
        target_bpm = bpm_b * 2.0 
        
        print(f"   🚀 Running Drop Mix (Ramp to 2x Target)")
        print(f"   🔥 Speed Change: {bpm_a:.1f} BPM -> {target_bpm:.1f} BPM (200% of Track B)")
        print(f"   ⏱️ Bridge Length: {bars} Bars")

        if len(dbs_a) < 2 or len(dbs_b) < 1:
            raise ValueError("Tracks too short.")

        # 1. 포인트 설정
        cut_point_a = dbs_a[-1] 
        start_point_b = dbs_b[0] 

        # 2. 소스 추출 (마지막 1박자)
        samples_per_beat_a = int(60.0 / bpm_a * self.sr)
        source_chunk = y_a[cut_point_a - samples_per_beat_a : cut_point_a]
        
        # 3. 브릿지 생성 (반복)
        # bars 마디만큼 채우기
        repeats = bars * 4
        raw_bridge = np.tile(source_chunk, repeats)

        # 4. Tempo Ramp 적용
        # start_bpm(A) -> end_bpm(2 * B) 로 변환
        ramped_bridge = self.ts.apply_ramp(
            raw_bridge, 
            start_bpm=bpm_a, 
            end_bpm=target_bpm, # 여기가 핵심 변경사항
            steps=repeats
        )

        # 5. 이펙트 (Low Cut & Volume Up)
        # 빨라질수록 고음 위주로 들려야 긴장감이 살음
        filtered_bridge = self.eq.apply_high_pass(ramped_bridge, cutoff=400)
        
        # 볼륨 Fade In
        fade_in = np.linspace(0.6, 1.0, len(filtered_bridge))
        final_bridge = filtered_bridge * fade_in

        # 6. 연결
        # [A 앞부분] -> [미친듯이 빨라지는 브릿지] -> [B 쾅! (상대적으로 느림)]
        return np.concatenate((y_a[:cut_point_a], final_bridge, y_b[start_point_b:]))