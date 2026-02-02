import os
import soundfile as sf
from services.analyzer_beat import get_beat_info
from engine.mixer import AutoDJMixer  # 이것만 있으면 됨!

def main():
    t1 = "./uploads/tracks/Dream On.mp3"
    t2 = "./uploads/tracks/Get Lucky.mp3"
    
    # 1. Analyze
    d1 = get_beat_info(t1)
    d2 = get_beat_info(t2, bpm_hint=d1['bpm'])
    
    # 2. Initialize Mixer
    mixer = AutoDJMixer()
    
    # 3. Mix - BLEND
    result_blend = mixer.mix(d1, d2, mode="BLEND", bars=16)
    sf.write("output/mix_blend.wav", result_blend, 44100)
    
    # 4. Mix - DROP
    #result_drop = mixer.mix(d1, d2, mode="DROP")
    #sf.write("output/mix_drop.wav", result_drop, 44100)
    
    print("Done!")

if __name__ == "__main__":
    main()