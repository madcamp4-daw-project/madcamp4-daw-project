# server/services/stem_separation.py
# Demucs AI 모델을 활용한 오디오 레이어 분리
# 리팩토링됨 - 함수명/변수명 변경

import torch
from demucs.api import Separator
import soundfile as sf
import os
import logging

# 로깅 설정
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def split_track_layers(source_file, dest_folder, compute_device='cpu'):
    """
    Demucs AI 모델을 활용한 오디오 레이어 분리
    
    Args:
        source_file: 입력 오디오 파일 경로
        dest_folder: 출력 디렉토리 경로
        compute_device: 'cpu' 또는 'cuda' (GPU 사용 시)
    
    Returns:
        dict: {
            'drums': str (파일 경로),
            'bass': str,
            'vocals': str,
            'other': str
        }
    
    Raises:
        FileNotFoundError: 입력 파일을 찾을 수 없는 경우
        RuntimeError: 모델 실행 중 오류 발생 시
    """
    try:
        # 입력 파일 존재 확인
        if not os.path.exists(source_file):
            raise FileNotFoundError(f"오디오 파일을 찾을 수 없습니다: {source_file}")
        
        # 출력 디렉토리 생성
        os.makedirs(dest_folder, exist_ok=True)
        logger.info(f"출력 디렉토리 생성: {dest_folder}")
        
        # Demucs Separator 초기화
        # htdemucs 모델 사용 (Hybrid Transformer Demucs)
        # segment=12: 12초 청크로 분할하여 처리 (메모리 효율성)
        logger.info(f"레이어 분리 엔진 초기화 중... (device: {compute_device})")
        stem_processor = Separator(
            model="htdemucs",
            segment=12,
            device=compute_device,
            shifts=1  # 시프트 기법으로 품질 향상
        )
        
        # 오디오 파일 분리 실행
        logger.info(f"레이어 분리 시작: {source_file}")
        origin, separated_layers = stem_processor.separate_audio_file(source_file)
        
        # 분리된 레이어 저장
        output_layers = {}
        sample_rate = 44100
        
        for layer_name, layer_audio in separated_layers.items():
            output_path = os.path.join(dest_folder, f"{layer_name}.wav")
            
            # Tensor를 numpy로 변환 후 저장
            if layer_audio.dim() == 2:
                # 스테레오: (2, Time)
                audio_array = layer_audio.cpu().numpy().T
            else:
                # 모노: (Time,)
                audio_array = layer_audio.cpu().numpy()
            
            # WAV 파일로 저장
            sf.write(output_path, audio_array, sample_rate)
            output_layers[layer_name] = output_path
            logger.info(f"레이어 저장 완료: {layer_name} -> {output_path}")
        
        logger.info("레이어 분리 완료")
        return output_layers
        
    except Exception as e:
        logger.error(f"레이어 분리 중 오류 발생: {str(e)}")
        raise RuntimeError(f"레이어 분리 실패: {str(e)}")

# CPU 전용 버전
def split_layers_cpu(source_file, dest_folder):
    """CPU만 사용하는 버전 (GPU 없이도 동작)"""
    return split_track_layers(source_file, dest_folder, compute_device='cpu')

# GPU 사용 버전
def split_layers_gpu(source_file, dest_folder):
    """GPU 사용 버전 (CUDA 사용 가능 시)"""
    if torch.cuda.is_available():
        logger.info("GPU 모드로 실행")
        return split_track_layers(source_file, dest_folder, compute_device='cuda')
    else:
        logger.warning("GPU를 사용할 수 없습니다. CPU 모드로 전환합니다.")
        return split_track_layers(source_file, dest_folder, compute_device='cpu')

# CLI 인터페이스
if __name__ == '__main__':
    import sys
    import json
    
    if len(sys.argv) < 3:
        print("사용법: python stem_separation.py <source_file> <dest_folder> [device]")
        sys.exit(1)
    
    source_file = sys.argv[1]
    dest_folder = sys.argv[2]
    compute_device = sys.argv[3] if len(sys.argv) > 3 else 'cpu'
    
    try:
        layers = split_track_layers(source_file, dest_folder, compute_device)
        # JSON 형식으로 출력
        print(json.dumps({'layers': layers}))
    except Exception as e:
        print(json.dumps({'error': str(e)}), file=sys.stderr)
        sys.exit(1)
