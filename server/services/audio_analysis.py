# server/services/audio_analysis.py
# librosa를 활용한 오디오 분석 및 트랙 속성 추출
# 리팩토링됨 - 함수명/변수명 변경

import librosa
import numpy as np
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def analyze_track_properties(file_path):
    """
    오디오 트랙 속성 분석 및 추출
    
    Args:
        file_path: 분석할 오디오 파일 경로
    
    Returns:
        dict: {
            'bpm': float,
            'key': str,  # 'A Minor'
            'camelot': str,  # '8A'
            'beats': list,  # 비트 타임스탬프 배열
            'downbeats': list,  # 다운비트 타임스탬프 배열
            'segments': list  # 구조 분할 정보
        }
    
    Raises:
        FileNotFoundError: 오디오 파일을 찾을 수 없는 경우
        RuntimeError: 분석 중 오류 발생 시
    """
    try:
        logger.info(f"트랙 분석 시작: {file_path}")
        sample_rate = 44100
        
        # 오디오 파일 로드
        samples, sr = librosa.load(file_path, sr=sample_rate)
        logger.info(f"오디오 로드 완료 (길이: {len(samples)/sample_rate:.2f}초)")
        
        # BPM 및 비트 추적
        logger.info("BPM 및 비트 추적 중...")
        tempo, beat_frames = librosa.beat.beat_track(y=samples, sr=sr)
        beat_times = librosa.frames_to_time(beat_frames, sr=sr)
        
        # 다운비트 검출 (4/4 박자 가정)
        logger.info("바 위치 검출 중...")
        bar_positions = find_bar_positions(samples, sr, beat_times)
        
        # Key 감지 및 Camelot Wheel 매핑
        logger.info("조성 식별 중...")
        musical_key, camelot_code = identify_musical_key(samples, sr)
        
        # 구조 분할
        logger.info("섹션 분할 중...")
        section_data = partition_sections(samples, sr)
        
        result = {
            'bpm': float(tempo),
            'key': musical_key,
            'camelot': camelot_code,
            'beats': beat_times.tolist(),
            'downbeats': bar_positions.tolist(),
            'segments': section_data
        }
        
        logger.info(f"트랙 분석 완료: BPM={result['bpm']}, Key={result['key']}, Camelot={result['camelot']}")
        return result
        
    except Exception as e:
        logger.error(f"트랙 분석 중 오류 발생: {str(e)}")
        raise RuntimeError(f"트랙 분석 실패: {str(e)}")

def identify_musical_key(samples, sr):
    """
    조성 식별 및 Camelot Wheel 변환
    
    Args:
        samples: 오디오 신호 데이터
        sr: 샘플레이트
    
    Returns:
        tuple: (key, camelot_code)
    """
    # 크로마그램 추출 (Constant-Q Transform 기반)
    chroma_features = librosa.feature.chroma_cqt(y=samples, sr=sr)
    chroma_mean = np.mean(chroma_features, axis=1)
    
    # Major/Minor 템플릿 매칭 (Krumhansl-Schmuckler 알고리즘)
    major_profile = np.array([6.35, 2.23, 3.48, 2.33, 4.38, 4.09, 2.52, 5.19, 2.39, 3.66, 2.29, 2.88])
    minor_profile = np.array([6.33, 2.68, 3.52, 5.38, 2.60, 3.53, 2.54, 4.75, 3.98, 2.69, 3.34, 3.17])
    
    # 정규화
    major_profile = major_profile / np.sum(major_profile)
    minor_profile = minor_profile / np.sum(minor_profile)
    chroma_normalized = chroma_mean / np.sum(chroma_mean)
    
    # 각 키에 대한 상관관계 계산
    pitch_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    best_correlation = -1
    detected_key = 'C Major'
    
    for shift in range(12):
        # Major 키 매칭
        shifted_major = np.roll(major_profile, shift)
        major_corr = np.corrcoef(chroma_normalized, shifted_major)[0, 1]
        
        # Minor 키 매칭
        shifted_minor = np.roll(minor_profile, shift)
        minor_corr = np.corrcoef(chroma_normalized, shifted_minor)[0, 1]
        
        if major_corr > best_correlation:
            best_correlation = major_corr
            detected_key = f"{pitch_names[shift]} Major"
        
        if minor_corr > best_correlation:
            best_correlation = minor_corr
            detected_key = f"{pitch_names[shift]} Minor"
    
    # Camelot Wheel 매핑
    camelot_map = {
        'A Minor': '8A', 'B Minor': '3A', 'C Major': '8B', 'D Minor': '10A',
        'E Minor': '12A', 'F Major': '11B', 'G Major': '9B', 'A Major': '11B',
        'B Major': '1B', 'C Minor': '3A', 'D Major': '10B', 'E Major': '12B',
        'F Minor': '4A', 'G Minor': '5A', 'A# Minor': '1A', 'C# Major': '9B',
        'D# Minor': '6A', 'F# Major': '6B', 'G# Major': '4B', 'A# Major': '1B',
        'C# Minor': '4A', 'D# Major': '6B', 'F# Minor': '11A', 'G# Minor': '2A'
    }
    
    camelot_code = camelot_map.get(detected_key, '1A')
    return detected_key, camelot_code

def find_bar_positions(samples, sr, beat_times):
    """
    바(다운비트) 위치 검출 (4/4 박자 가정)
    
    Args:
        samples: 오디오 신호 데이터
        sr: 샘플레이트
        beat_times: 비트 타임스탬프 배열
    
    Returns:
        np.ndarray: 바 위치 타임스탬프 배열
    """
    # Onset 강도 추출
    onset_env = librosa.onset.onset_strength(y=samples, sr=sr)
    
    # 비트 프레임 인덱스로 변환
    beat_frames = librosa.time_to_frames(beat_times, sr=sr)
    beat_frames = beat_frames[beat_frames < len(onset_env)]
    
    # 각 비트의 강도 추출
    beat_intensities = onset_env[beat_frames]
    
    # 4박자 그룹별 에너지 합계 계산
    group_energies = []
    for offset in range(4):
        group_energy = np.sum(beat_intensities[offset::4])
        group_energies.append(group_energy)
    
    # 가장 강한 그룹의 오프셋 찾기
    bar_offset = np.argmax(group_energies)
    
    # 바 위치 추출 (4박자마다)
    bar_indices = np.arange(bar_offset, len(beat_times), 4)
    bar_times = beat_times[bar_indices]
    
    return bar_times

def partition_sections(samples, sr):
    """
    섹션 분할 (Intro, Verse, Chorus, Outro)
    
    Args:
        samples: 오디오 신호 데이터
        sr: 샘플레이트
    
    Returns:
        list: 섹션 분할 정보 리스트
    """
    try:
        # 자기 유사성 행렬 계산
        similarity_matrix = librosa.segment.recurrence_matrix(
            samples,
            mode='affinity',
            metric='cosine'
        )
        
        # 구조 경계 검출
        boundary_frames = librosa.segment.agglomerative(
            similarity_matrix,
            k=4  # 기본적으로 4개 구간으로 분할
        )
        
        # 시간으로 변환
        boundary_times = librosa.frames_to_time(boundary_frames, sr=sr)
        
        # 구간 타입 라벨링
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
        logger.warning(f"섹션 분할 실패: {str(e)}, 빈 배열 반환")
        return []

# CLI 인터페이스
if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 2:
        print("사용법: python audio_analysis.py <file_path>")
        sys.exit(1)
    
    file_path = sys.argv[1]
    
    try:
        result = analyze_track_properties(file_path)
        # JSON 형식으로 출력 (Node.js에서 파싱하기 위함)
        print(json.dumps(result))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
