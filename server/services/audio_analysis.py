# server/services/audio_analysis.py
# Node.js 연동용 최종 최적화 버전

import librosa
import numpy as np
import sys
import json
import os
import warnings

# 경고 메시지 무시 (터미널 출력 오염 방지)
warnings.filterwarnings('ignore')

def analyze_track_properties(file_path):
    """
    오디오 트랙 속성 분석 (최적화 적용됨)
    """
    try:
        # 파일 존재 확인
        if not os.path.exists(file_path):
            raise FileNotFoundError(f"파일을 찾을 수 없습니다: {file_path}")

        # ✅ 최적화 1: 샘플레이트 22050Hz, 모노 로드
        sample_rate = 22050
        samples, sr = librosa.load(file_path, sr=sample_rate, mono=True)
        
        # ✅ 최적화 2: BPM 분석 시 hop_length 증가
        tempo, beat_frames = librosa.beat.beat_track(y=samples, sr=sr, hop_length=1024)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr, hop_length=1024)
        
        # 다운비트 검출
        bar_positions = find_bar_positions(samples, sr, beat_times)
        
        # Key 감지
        musical_key, camelot_code = identify_musical_key(samples, sr)
        
        # ✅ 최적화 3: 구조 분할 (앞부분 90초만 사용, 정밀도 조정)
        section_data = partition_sections(samples, sr)
        
        # Numpy 타입을 Python 기본 타입으로 변환 (JSON 직렬화 오류 방지)
        result = {
            'bpm': float(tempo) if np.ndim(tempo) == 0 else float(tempo[0]),
            'key': musical_key,
            'camelot': camelot_code,
            'beats': beat_times.tolist(),
            'downbeats': bar_positions.tolist(),
            'segments': section_data
        }
        
        return result
        
    except Exception as e:
        # 에러 발생 시 stderr로 로그 출력 (Node.js가 감지)
        sys.stderr.write(f"Error analyzing track: {str(e)}\n")
        raise

def identify_musical_key(samples, sr):
    # ✅ 최적화 4: Key 분석 속도 향상
    chroma_features = librosa.feature.chroma_cqt(
        y=samples, 
        sr=sr, 
        hop_length=4096, 
        bins_per_octave=12
    )
    chroma_mean = np.mean(chroma_features, axis=1)
    
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    
    major_profile = major_profile / np.sum(major_profile)
    minor_profile = minor_profile / np.sum(minor_profile)
    chroma_normalized = chroma_mean / np.sum(chroma_mean)
    
    pitch_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    best_correlation = -1
    detected_key = 'C Major'
    
    for shift in range(12):
        shifted_major = np.roll(major_profile, shift)
        major_corr = np.corrcoef(chroma_normalized, shifted_major)[0, 1]
        shifted_minor = np.roll(minor_profile, shift)
        minor_corr = np.corrcoef(chroma_normalized, shifted_minor)[0, 1]
        
        if major_corr > best_correlation:
            best_correlation = major_corr
            detected_key = f"{pitch_names[shift]} Major"
        if minor_corr > best_correlation:
            best_correlation = minor_corr
            detected_key = f"{pitch_names[shift]} Minor"
    
    camelot_map = {
        'A Minor': '8A', 'B Minor': '3A', 'C Major': '8B', 'D Minor': '10A',
        'E Minor': '12A', 'F Major': '11B', 'G Major': '9B', 'A Major': '11B',
        'B Major': '1B', 'C Minor': '3A', 'D Major': '10B', 'E Major': '12B',
        'F Minor': '4A', 'G Minor': '5A', 'A# Minor': '1A', 'C# Major': '9B',
        'D# Minor': '6A', 'F# Major': '6B', 'G# Major': '4B', 'A# Major': '1B',
        'C# Minor': '4A', 'D# Major': '6B', 'F# Minor': '11A', 'G# Minor': '2A'
    }
    return detected_key, camelot_map.get(detected_key, '1A')

def find_bar_positions(samples, sr, beat_times):
    # ✅ 최적화 5: 다운비트 검출 속도 향상
    onset_env = librosa.onset.onset_strength(y=samples, sr=sr, hop_length=1024)
    beat_frames = librosa.time_to_frames(beat_times, sr=sr, hop_length=1024)
    
    # 인덱스 범위 체크
    beat_frames = beat_frames[beat_frames < len(onset_env)]
    
    if len(beat_frames) == 0:
        return np.array([])
    
    beat_intensities = onset_env[beat_frames]
    
    group_energies = []
    for offset in range(4):
        # 4박자 간격으로 에너지 합산
        if len(beat_intensities) > offset:
            group_energy = np.sum(beat_intensities[offset::4])
            group_energies.append(group_energy)
        else:
            group_energies.append(0)
    
    if not group_energies:
        return np.array([])

    bar_offset = np.argmax(group_energies)
    bar_indices = np.arange(bar_offset, len(beat_times), 4)
    return beat_times[bar_indices]

def partition_sections(samples, sr):
    try:
        # ✅ 최적화 6: 처음 90초만 사용하여 구조 파악 (매우 중요)
        max_duration = 90
        max_samples = int(max_duration * sr)
        samples_cut = samples[:min(max_samples, len(samples))]
        
        # ✅ 최적화 7: MFCC 및 Recurrence Matrix 계산량 대폭 축소
        mfcc = librosa.feature.mfcc(y=samples_cut, sr=sr, n_mfcc=13, hop_length=2048)
        
        similarity_matrix = librosa.segment.recurrence_matrix(
            mfcc, 
            mode='affinity', 
            metric='cosine',
            width=3
        )
        
        # k=3 (Intro, Verse, Chorus 정도만 구분)
        boundary_frames = librosa.segment.agglomerative(similarity_matrix, k=3)
        boundary_times = librosa.frames_to_time(boundary_frames, sr=sr, hop_length=2048)
        
        sections = []
        section_types = ['intro', 'verse', 'chorus', 'outro']
        for i in range(len(boundary_times) - 1):
            section_type = section_types[min(i, len(section_types) - 1)]
            sections.append({
                'type': section_type,
                'start': float(boundary_times[i]),
                'end': float(boundary_times[i + 1])
            })
        return sections
    except Exception as e:
        # 섹션 분석 실패해도 전체 프로세스는 죽지 않게 함
        sys.stderr.write(f"Warning: Section partition failed - {str(e)}\n")
        return []

# --- Node.js 실행 진입점 ---
if __name__ == '__main__':
    # Node.js에서 인자값으로 파일 경로를 받음
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        # 분석 실행
        result = analyze_track_properties(file_path)
        
        # 결과만 JSON으로 출력 (Node.js가 stdout을 읽음)
        print(json.dumps(result, ensure_ascii=False))
        
    except Exception as e:
        # 에러 발생 시 JSON 형태의 에러 메시지 출력
        print(json.dumps({"error": str(e)}))
        sys.exit(1)