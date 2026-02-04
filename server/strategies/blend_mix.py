import numpy as np
import config # 🔥 config 임포트
from utils.dsp import (
    match_bpm_with_safety_margin, 
    load_and_merge_stems, 
    smooth_concatenate
)

class BlendMixStrategy:
    def process(self, y_a_full, y_a_no_rhythm, y_a_vocals, y_b_full, y_b_bass, bpm_a, bpm_b, sr, 
                overlap_samples, vocal_end, trim_point, track_a_name, output_dir):
        
        print(f"\n🍹 [Strategy: Blend Mix] Fixed Timing Transition...")

        samples_needed_from_b = int(overlap_samples * (bpm_a / bpm_b))
        y_b_intro_raw = y_b_bass[:samples_needed_from_b]
        y_b_intro_raw = y_b_intro_raw * 1.5
        
        y_b_blend_synced = match_bpm_with_safety_margin(y_b_intro_raw, sr, bpm_b, bpm_a, overlap_samples)

        y_a_no_bass = load_and_merge_stems(track_a_name, ['vocals', 'drums', 'other'], output_dir, sr)
        
        part_a_main = y_a_full[:vocal_end]
        
        end_sample_a = min(len(y_a_no_bass), vocal_end + overlap_samples)
        chunk_a_raw = y_a_no_bass[vocal_end : end_sample_a]
        
        if len(chunk_a_raw) < overlap_samples:
            pad_len = overlap_samples - len(chunk_a_raw)
            chunk_a_no_bass = np.pad(chunk_a_raw, (0, pad_len))
            print(f"   ⚠️ Track A is short. Padding {pad_len} samples.")
        else:
            chunk_a_no_bass = chunk_a_raw

        chunk_b_bass = y_b_blend_synced
        mix_len = overlap_samples 
        
        fade_out_curve = np.linspace(1.0, 0.0, mix_len)
        mixed_chunk = (chunk_a_no_bass * fade_out_curve * 0.8) + (chunk_b_bass * 0.8)
        
        part_b_body = y_b_full[samples_needed_from_b:]

        # 🔥 config 값 사용
        transition_a_to_blend = smooth_concatenate([part_a_main, mixed_chunk], fade_samples=config.BLEND_OVERLAP_FADE)
        final_mix = smooth_concatenate([transition_a_to_blend, part_b_body], fade_samples=config.BLEND_MICRO_FADE)
        
        return final_mix