import numpy as np
import librosa

def find_outro_endpoint(y, sr):
    """
    [Final Aggressive Mode]
    뒤에서부터 검사하는 게 아니라, 
    '마지막으로 에너지가 폭발했던 지점'을 찾아서 그 뒤를 전부 날려버립니다.
    기준을 높일수록 더 많이 잘려나갑니다.
    """
    try:
        # 1. 분석 범위: 노래의 끝부분 45초
        scan_duration = 45.0
        scan_samples = int(scan_duration * sr)
        
        # 노래가 너무 짧으면 전체 분석
        if len(y) > scan_samples:
            y_scan = y[-scan_samples:]
            global_offset = len(y) - scan_samples
        else:
            y_scan = y
            global_offset = 0

        # 2. RMS(볼륨)와 Onset(비트) 계산
        hop_length = 512
        rms = librosa.feature.rms(y=y_scan, frame_length=2048, hop_length=hop_length)[0]
        onset_env = librosa.onset.onset_strength(y=y_scan, sr=sr, hop_length=hop_length)
        
        # 3. 정규화 (0.0 ~ 1.0)
        # 주의: 1.0은 이 구간 내에서 '가장 시끄러운 순간'을 의미함
        rms_norm = (rms - np.min(rms)) / (np.max(rms) - np.min(rms) + 1e-6)
        onset_norm = (onset_env - np.min(onset_env)) / (np.max(onset_env) - np.min(onset_env) + 1e-6)
        
        # ====================================================
        # 🎚️ 임계값 설정 (여기서 조절하세요)
        # ====================================================
        # 0.4 ~ 0.5 정도가 적당함. 
        # 1.0에 가까울수록 "최고 피크"가 아니면 다 잘라버림.
        vol_threshold = 0.5 
        beat_threshold = 0.4 
        # ====================================================

        # 4. "살아남을 자격이 있는 프레임" 찾기
        # 볼륨과 비트가 모두 기준치 이상인 지점들(True/False 배열)
        strong_frames = (rms_norm > vol_threshold) & (onset_norm > beat_threshold)
        
        # 5. 마지막 생존자 찾기 (Last Strong Point)
        # np.where는 조건에 맞는 인덱스를 찾아줌
        valid_indices = np.where(strong_frames)[0]

        if len(valid_indices) == 0:
            # 기준이 너무 높아서(1.0 등) 살릴 구간이 하나도 없으면?
            # -> 스캔한 45초를 통째로 날려버림 (Body 끝 = 스캔 시작점)
            print("   ✂️ [Aggressive] 기준 만족 구간 없음 -> 45초 전체 삭제")
            cut_frame_local = 0 
        else:
            # 가장 마지막에 기준을 통과한 지점 = Body의 끝
            last_strong_frame = valid_indices[-1]
            cut_frame_local = last_strong_frame

        # 6. 샘플 단위 변환 및 마진 적용
        cut_sample_local = cut_frame_local * hop_length
        
        # 공격적 마진: 감지된 지점보다 1초 더 안쪽을 잘라서 깔끔하게 만듦
        # (단, 너무 짧아지면 0에서 멈춤)
        margin_samples = int(1.0 * sr)
        cut_sample_local = max(0, cut_sample_local - margin_samples)

        # 7. 전체 노래 기준 좌표로 변환
        final_cut_point = global_offset + cut_sample_local

        # 안전장치: 노래의 절반 이상을 날리려고 하면 절반만 날림
        min_length = int(len(y) * 0.5)
        if final_cut_point < min_length:
            print("   ⚠️ 안전장치: 노래의 50% 지점까지만 자릅니다.")
            final_cut_point = min_length

        removed_seconds = (len(y) - final_cut_point) / sr
        print(f"   ✂️ Trimmed: -{removed_seconds:.2f} sec (Threshold: V{vol_threshold}/B{beat_threshold})")
        
        return final_cut_point

    except Exception as e:
        print(f"   ⚠️ Analysis Error: {e}")
        return len(y)