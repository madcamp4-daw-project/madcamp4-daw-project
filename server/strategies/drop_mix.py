import numpy as np
import librosa
import config  # 🔥 config 파일 임포트
from utils.dsp import (
    create_tempo_ramp, 
    smooth_concatenate, 
    apply_high_pass, 
    get_best_loop_segment
)

class DropMixStrategy:
    def process(self, y_a, y_a_vocals, y_b, bpm_a, bpm_b, sr, cut_point_a, vocal_end_point):
        print(f"\n🚀 [Strategy: Drop Mix] Extreme Riser Mode!")
        
        # 🔥 config 값 사용
        target_bpm = bpm_b * config.DROP_TARGET_BPM_MULTIPLIER 
        print(f"   🔥 Speed Build-up: {bpm_a:.1f} -> {target_bpm:.1f} BPM (Max {config.DROP_TARGET_BPM_MULTIPLIER}x)")
        
        source_chunk = None
        samples_per_beat_a = int(60.0 / bpm_a * sr)
        actual_cut_point = cut_point_a 

        # ----------------------------------------------------
        # 🔥 Hybrid Vocal Anchor Strategy
        # ----------------------------------------------------
        if vocal_end_point is not None and vocal_end_point > samples_per_beat_a:
            check_chunk = y_a_vocals[vocal_end_point - samples_per_beat_a : vocal_end_point]
            rms = np.sqrt(np.mean(check_chunk**2))
            print(f"   🎤 Checking Vocal Stem RMS: {rms:.4f}")
            
            # 🔥 config 값 사용
            if rms > config.DROP_VOCAL_SENSITIVITY: 
                print("      ✅ Vocal confirmed in Stem!")
                source_chunk = y_a[vocal_end_point - samples_per_beat_a : vocal_end_point]
                source_chunk = source_chunk * 1.0 
                
                actual_cut_point = vocal_end_point
                print(f"      ✂️ Cut Point Moved: Syncing to Vocal End ({actual_cut_point/sr:.2f}s)")
                
        # ----------------------------------------------------
        # [Fallback]
        # ----------------------------------------------------
        if source_chunk is None:
            print("   ⚠️ Vocal End Point missed. Scanning backwards...")
            for i in range(16): 
                end = cut_point_a - (samples_per_beat_a * i)
                start = end - samples_per_beat_a
                if start < 0: break
                
                stem_chunk = y_a_vocals[start:end]
                rms_stem = np.sqrt(np.mean(stem_chunk**2))
                
                # 🔥 config 값 사용
                if rms_stem > config.DROP_VOCAL_SENSITIVITY: 
                    print(f"      ✅ Found Vocal at beat -{i+1}")
                    source_chunk = y_a[start:end] 
                    actual_cut_point = end
                    break

        if source_chunk is None:
            print("   🥁 Fallback to Instrumental Beat.")
            source_chunk = get_best_loop_segment(y_a, sr, cut_point_a, bpm_a)
            if source_chunk is None:
                source_chunk = y_a[cut_point_a - samples_per_beat_a : cut_point_a]

        # ----------------------------------------------------
        # Tightening & Ramp
        # ----------------------------------------------------
        # 🔥 config 값 사용
        tight_len = int(len(source_chunk) * config.DROP_TIGHTEN_RATIO)
        source_chunk = source_chunk[:tight_len]

        bars = config.DROP_LOOP_BARS 
        repeats = bars * 4 
        raw_bridge = np.tile(source_chunk, repeats)
        
        adjusted_start_bpm = bpm_a * config.DROP_START_BPM_BOOST 
        
        print(f"   ⏱️ Generating Bridge ({bars} bars)...")
        
        ramped_bridge = create_tempo_ramp(
            raw_bridge, 
            sr, 
            start_bpm=adjusted_start_bpm, 
            end_bpm=target_bpm, 
            base_bpm=bpm_a, 
            steps=repeats
        )
        
        filtered_bridge = apply_high_pass(ramped_bridge, sr, cutoff=400)
        fade_in = np.linspace(0.6, 1.0, len(filtered_bridge))
        final_bridge = filtered_bridge * fade_in
        
        y_b_trimmed, _ = librosa.effects.trim(y_b, top_db=20)
        
        # 🔥 config 값 사용 (Blend Fade는 여기서도 씀)
        part_1 = smooth_concatenate([y_a[:actual_cut_point], final_bridge], fade_samples=config.BLEND_OVERLAP_FADE)
        final_mix = np.concatenate([part_1, y_b_trimmed])
        
        return final_mix