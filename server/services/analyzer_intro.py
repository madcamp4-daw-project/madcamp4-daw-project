import numpy as np
import librosa

def get_intro_duration(file_path, default_duration=16.0):
    """
    오디오의 에너지(RMS) 변화를 분석하여 Intro가 끝나는 시점을 추정합니다.
    (소리가 갑자기 커지거나 비트가 강해지는 'Drop' 지점을 찾음)
    """
    try:
        print(f"   🔍 Detecting intro duration: {file_path}")
        
        # 1. 오디오 로드 (속도를 위해 sr을 낮춤)
        y, sr = librosa.load(file_path, sr=22050)
        
        # 2. RMS 에너지(소리 크기) 계산
        hop_length = 512
        frame_length = 2048
        rms = librosa.feature.rms(y=y, frame_length=frame_length, hop_length=hop_length)[0]
        
        # 3. 시간축 계산
        times = librosa.frames_to_time(np.arange(len(rms)), sr=sr, hop_length=hop_length)
        
        # 4. 에너지 정규화 (0.0 ~ 1.0)
        rms_norm = (rms - np.min(rms)) / (np.max(rms) - np.min(rms))
        
        # 5. Intro 감지 알고리즘 (First Drop Detection)
        threshold = 0.45  # 기준: 최대 볼륨의 45% 이상
        min_sustain = 2.0 # 기준: 2초 이상 유지
        
        sustain_frames = int(min_sustain * sr / hop_length)
        detected_time = 0.0
        
        for i, energy in enumerate(rms_norm):
            # 5초 이하는 무시 (너무 초반 시작 방지)
            if times[i] < 5.0: 
                continue

            if energy > threshold:
                # 앞으로 2초간 평균 에너지가 계속 높은지 확인
                if i + sustain_frames < len(rms_norm):
                    future_energy = rms_norm[i : i + sustain_frames]
                    if np.mean(future_energy) > threshold:
                        detected_time = times[i]
                        break
        
        # 감지 실패 시(너무 늦거나 못 찾음) 기본값 반환
        duration = librosa.get_duration(y=y, sr=sr)
        if detected_time == 0.0 or detected_time > (duration / 3):
            print(f"      ⚠️ 인트로 감지 실패. 기본값 {default_duration}초 사용")
            return default_duration

        print(f"      ✅ Intro Detected: {detected_time:.2f} seconds")
        return detected_time

    except Exception as e:
        print(f"      ❌ Intro Analysis Error: {e}")
        return default_duration