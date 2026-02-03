import numpy as np
import librosa
import librosa.display

class StructureAnalyzer:
    def __init__(self, sr=44100):
        self.sr = sr

    def analyze(self, file_path):
        """
        곡의 구조를 분석하여 세그먼트 정보를 반환합니다.
        Return: [{'start': 0.0, 'end': 15.5, 'label': 'Intro', 'confidence': 0.8}, ...]
        """
        # 1. 오디오 로드
        y, sr = librosa.load(file_path, sr=self.sr)
        
        # 2. 특징 추출 (Chroma + MFCC)
        # Chroma: 화성(코드) 정보 -> Verse/Chorus 구분에 유리
        # MFCC: 음색 정보 -> 악기 구성 변화 감지에 유리
        chroma = librosa.feature.chroma_cqt(y=y, sr=sr, bins_per_octave=12, hop_length=512)
        mfcc = librosa.feature.mfcc(y=y, sr=sr, n_mfcc=13, hop_length=512)
        
        # 두 특징을 합침 (Stack)
        features = np.vstack([chroma, mfcc])
        
        # 3. 유사도 행렬 계산 (Self-Similarity Matrix)
        # 곡 전체에서 반복되는 구간을 찾음
        recurrence = librosa.segment.recurrence_matrix(features, mode='affinity', sym=True)

        # 4. 세그먼트 경계 찾기 (Spectral Clustering)
        # 곡을 크게 5~8개 정도의 덩어리로 나눔
        # n_segments 값을 조절하면 더 잘게/크게 나눌 수 있음
        boundaries = librosa.segment.agglomerative(features, k=6)
        bound_times = librosa.frames_to_time(boundaries, sr=sr, hop_length=512)
        
        # 시작점(0.0)과 끝점(duration) 추가
        bound_times = np.concatenate(([0.0], bound_times, [librosa.get_duration(y=y, sr=sr)]))
        bound_times = np.sort(np.unique(bound_times))

        # 5. 각 구간별 라벨링 (Heuristic Rule)
        segments = []
        
        # 전체 곡의 평균 에너지(RMS) 계산 (기준점)
        rms_full = librosa.feature.rms(y=y)[0]
        avg_loudness = np.mean(rms_full)

        for i in range(len(bound_times) - 1):
            start = bound_times[i]
            end = bound_times[i+1]
            duration = end - start
            
            # 너무 짧은 구간(4초 미만)은 무시하거나 병합 필요 (여기선 일단 패스)
            if duration < 4.0: continue

            # 해당 구간의 오디오 잘라내기
            start_sample = int(start * sr)
            end_sample = int(end * sr)
            segment_y = y[start_sample:end_sample]

            # 구간 특징 분석
            seg_rms = librosa.feature.rms(y=segment_y)[0]
            seg_loudness = np.mean(seg_rms)
            
            # --- 라벨 추론 로직 (규칙 기반) ---
            label = "Verse" # 기본값
            
            # 규칙 1: Intro
            # 곡의 맨 앞 5% 이내에 시작하고, 에너지가 평균보다 낮으면 Intro
            if start < librosa.get_duration(y=y, sr=sr) * 0.05 and seg_loudness < avg_loudness * 0.9:
                label = "Intro"
            
            # 규칙 2: Chorus (Drop)
            # 에너지가 평균보다 1.2배 이상 크면 코러스(하이라이트)로 간주
            elif seg_loudness > avg_loudness * 1.15:
                label = "Chorus"
            
            # 규칙 3: Outro
            # 곡의 마지막 10% 지점에 있고 에너지가 낮으면 Outro
            elif end > librosa.get_duration(y=y, sr=sr) * 0.9 and seg_loudness < avg_loudness * 0.8:
                label = "Outro"

            segments.append({
                "start": start,
                "end": end,
                "duration": duration,
                "label": label,
                "loudness": seg_loudness
            })

        return segments