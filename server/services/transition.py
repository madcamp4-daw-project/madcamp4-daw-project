# server/services/transition.py
# 두 트랙 간 블렌드 시퀀스 생성 (Bass Swap 기법)
# 리팩토링됨 - 함수명/변수명 변경

import ffmpeg
import json
import logging
import os

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def create_blend_sequence(source_layers, target_layers, source_analysis, target_analysis, blend_point_sec):
    """
    두 트랙 간 블렌드 시퀀스 생성 (Bass Swap 기법)
    
    Args:
        source_layers: dict {'drums': path, 'bass': path, 'vocals': path, 'other': path}
        target_layers: dict {'drums': path, 'bass': path, 'vocals': path, 'other': path}
        source_analysis: dict {'bpm': float, 'beats': list, 'downbeats': list}
        target_analysis: dict {'bpm': float, 'beats': list, 'downbeats': list}
        blend_point_sec: float (블렌드 시작 시점, 초 단위)
    
    Returns:
        str: 출력 파일 경로
    
    Raises:
        FileNotFoundError: 레이어 파일을 찾을 수 없는 경우
        RuntimeError: 블렌드 생성 중 오류 발생 시
    """
    try:
        logger.info(f"블렌드 시퀀스 생성 시작: blend_point={blend_point_sec}초")
        
        # 레이어 파일 존재 확인
        for layer_type in ['drums', 'bass', 'vocals', 'other']:
            if layer_type not in source_layers or not os.path.exists(source_layers[layer_type]):
                raise FileNotFoundError(f"Source의 {layer_type} 레이어 파일을 찾을 수 없습니다")
            if layer_type not in target_layers or not os.path.exists(target_layers[layer_type]):
                raise FileNotFoundError(f"Target의 {layer_type} 레이어 파일을 찾을 수 없습니다")
        
        # BPM 동기화 (필요시)
        source_bpm = source_analysis.get('bpm', 120)
        target_bpm = target_analysis.get('bpm', 120)
        
        if abs(source_bpm - target_bpm) > 0.5:
            logger.info(f"BPM 정렬 필요: {target_bpm} -> {source_bpm}")
            target_layers = align_tempo_layers(target_layers, target_bpm, source_bpm)
        
        # FFmpeg 필터 그래프 구성
        # Bass: 하드 컷 (짧은 크로스페이드)
        logger.info("Bass 블렌드 구성 중...")
        bass_src = ffmpeg.input(source_layers['bass'])
        bass_tgt = ffmpeg.input(target_layers['bass'])
        bass_blend = ffmpeg.filter(
            [bass_src, bass_tgt],
            'xfade',
            transition='cut',
            duration=0.1,
            offset=blend_point_sec
        )
        
        # Other: 부드러운 크로스페이드 (15초)
        logger.info("Other 블렌드 구성 중...")
        other_src = ffmpeg.input(source_layers['other'])
        other_tgt = ffmpeg.input(target_layers['other'])
        fade_duration = 15.0
        other_blend = ffmpeg.filter(
            [other_src, other_tgt],
            'xfade',
            transition='fade',
            duration=fade_duration,
            offset=blend_point_sec - (fade_duration / 2)
        )
        
        # Vocals: 부드러운 크로스페이드 (15초)
        logger.info("Vocals 블렌드 구성 중...")
        vocals_src = ffmpeg.input(source_layers['vocals'])
        vocals_tgt = ffmpeg.input(target_layers['vocals'])
        vocals_blend = ffmpeg.filter(
            [vocals_src, vocals_tgt],
            'xfade',
            transition='fade',
            duration=fade_duration,
            offset=blend_point_sec - (fade_duration / 2)
        )
        
        # Drums: 하드 컷 (짧은 크로스페이드)
        logger.info("Drums 블렌드 구성 중...")
        drums_src = ffmpeg.input(source_layers['drums'])
        drums_tgt = ffmpeg.input(target_layers['drums'])
        drums_blend = ffmpeg.filter(
            [drums_src, drums_tgt],
            'xfade',
            transition='cut',
            duration=0.1,
            offset=blend_point_sec
        )
        
        # 최종 병합 (4개 레이어 믹싱)
        logger.info("최종 믹싱 중...")
        final_output = ffmpeg.filter(
            [bass_blend, other_blend, vocals_blend, drums_blend],
            'amix',
            inputs=4,
            duration='longest'
        )
        
        # 출력 디렉토리 생성
        output_dir = 'output/blends'
        os.makedirs(output_dir, exist_ok=True)
        
        # 렌더링
        output_file = f"blend_{int(blend_point_sec)}s.mp3"
        output_path = os.path.join(output_dir, output_file)
        
        logger.info(f"렌더링 시작: {output_path}")
        ffmpeg.output(
            final_output,
            output_path,
            audio_bitrate='320k',
            acodec='libmp3lame'
        ).overwrite_output().run(quiet=True)
        
        logger.info(f"블렌드 시퀀스 생성 완료: {output_path}")
        return output_path
        
    except Exception as e:
        logger.error(f"블렌드 생성 중 오류 발생: {str(e)}")
        raise RuntimeError(f"블렌드 생성 실패: {str(e)}")

def align_tempo_layers(layers, current_bpm, target_bpm):
    """
    템포 정렬 (FFmpeg atempo 필터 사용)
    
    Args:
        layers: dict {'drums': path, 'bass': path, ...}
        current_bpm: 현재 BPM
        target_bpm: 목표 BPM
    
    Returns:
        dict: 정렬된 레이어 파일 경로 딕셔너리
    """
    tempo_ratio = target_bpm / current_bpm
    
    if abs(tempo_ratio - 1.0) < 0.01:
        return layers
    
    logger.info(f"템포 정렬: {current_bpm} -> {target_bpm} (ratio: {tempo_ratio:.3f})")
    
    aligned_layers = {}
    output_dir = 'output/aligned_layers'
    os.makedirs(output_dir, exist_ok=True)
    
    for layer_type, layer_path in layers.items():
        input_stream = ffmpeg.input(layer_path)
        
        if tempo_ratio > 2.0:
            temp_ratio = tempo_ratio
            processed = input_stream
            while temp_ratio > 2.0:
                processed = ffmpeg.filter(processed, 'atempo', tempo=2.0)
                temp_ratio /= 2.0
            if temp_ratio > 1.0:
                processed = ffmpeg.filter(processed, 'atempo', tempo=temp_ratio)
        elif tempo_ratio < 0.5:
            temp_ratio = tempo_ratio
            processed = input_stream
            while temp_ratio < 0.5:
                processed = ffmpeg.filter(processed, 'atempo', tempo=0.5)
                temp_ratio /= 0.5
            if temp_ratio < 1.0:
                processed = ffmpeg.filter(processed, 'atempo', tempo=temp_ratio)
        else:
            processed = ffmpeg.filter(input_stream, 'atempo', tempo=tempo_ratio)
        
        output_path = os.path.join(output_dir, f"{layer_type}_aligned.wav")
        ffmpeg.output(processed, output_path).overwrite_output().run(quiet=True)
        aligned_layers[layer_type] = output_path
    
    return aligned_layers

# CLI 인터페이스
if __name__ == '__main__':
    import sys
    
    if len(sys.argv) < 2:
        print("사용법: python transition.py '<json_args>'")
        sys.exit(1)
    
    try:
        args_json = sys.argv[1]
        args = json.loads(args_json)
        
        source_layers = args['sourceLayers']
        target_layers = args['targetLayers']
        source_analysis = args['sourceAnalysis']
        target_analysis = args['targetAnalysis']
        blend_point = args['blendPoint']
        
        output_path = create_blend_sequence(
            source_layers,
            target_layers,
            source_analysis,
            target_analysis,
            blend_point
        )
        
        # JSON 형식으로 출력
        result = {
            'outputPath': output_path,
            'duration': 0
        }
        print(json.dumps(result))
        
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
