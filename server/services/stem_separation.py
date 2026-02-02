# server/services/stem_separation.py
# Demucs CLI Wrapper (Shape 에러 원천 차단 버전)

import sys
import os
import subprocess
import json
import shutil

# 한글 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def separate_stems(track_filename):
    # 1. 경로 설정
    # 현재 파일(stem_separation.py)의 위치를 기준으로 경로를 잡습니다.
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(base_dir, 'uploads', 'tracks')
    output_dir = os.path.join(base_dir, 'output')
    
    # ffmpeg가 같은 폴더에 있다면 경로에 추가 (선택사항)
    os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

    # 2. 입력 파일 찾기
    input_path = os.path.join(uploads_dir, track_filename)

    # (중요) 만약 파일이 없으면 확장자를 바꿔서라도 찾아봄
    if not os.path.exists(input_path):
        # 혹시 .mp3가 빠졌나?
        if os.path.exists(input_path + ".mp3"):
            input_path += ".mp3"
        # 혹시 .wav가 빠졌나?
        elif os.path.exists(input_path + ".wav"):
            input_path += ".wav"
        else:
            print(json.dumps({"error": f"File not found: {input_path}"}))
            return

    # 3. Demucs 명령어 구성 (API 아님, CLI 실행)
    # -n htdemucs: 고성능 모델
    # --two-stems=vocals: (옵션) 보컬/반주 2개로만 나눌거면 추가 (속도 2배 빠름) -> 지금은 4개 다 나눔
    cmd = [
        sys.executable, "-m", "demucs",
        "-n", "htdemucs",  # 모델명
        "-d", "cuda",
        "--out", output_dir, # 출력 폴더
        input_path         # 입력 파일
    ]

    try:
        # 로그 출력 (Node.js가 볼 수 있게 stderr로)
        sys.stderr.write(f"Separating track: {os.path.basename(input_path)}...\n")
        
        # 4. 실행 (여기서 모든 마법이 일어남)
        # capture_output=False로 하면 터미널에 진행바가 보입니다.
        process = subprocess.run(cmd, check=True, text=True)
        
        # 5. 결과 경로 정리
        # Demucs는 output/htdemucs/파일이름/ 폴더에 저장함
        # 파일이름에서 확장자(.mp3)를 뗀 이름이 폴더명이 됨
        track_name_only = os.path.splitext(os.path.basename(input_path))[0]
        result_path = os.path.join(output_dir, "htdemucs", track_name_only)
        
        if os.path.exists(result_path):
            result = {
                "message": "Separation complete",
                "path": result_path,
                "stems": {
                    "vocals": os.path.join(result_path, "vocals.wav"),
                    "drums": os.path.join(result_path, "drums.wav"),
                    "bass": os.path.join(result_path, "bass.wav"),
                    "other": os.path.join(result_path, "other.wav")
                }
            }
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(json.dumps({"error": "Separation finished but output folder not found."}))

    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Demucs Failed: {e}\n")
        print(json.dumps({"error": "Demucs execution failed. Check if FFmpeg is installed."}))
    except Exception as e:
        sys.stderr.write(f"Unexpected Error: {e}\n")
        print(json.dumps({"error": str(e)}))

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No trackId provided"}))
        sys.exit(1)
        
    # Node.js에서 받은 인자 처리
    try:
        input_arg = sys.argv[1]
        target_file = input_arg
        
        # JSON 문자열로 들어온 경우 파싱
        if input_arg.startswith('{'):
            data = json.loads(input_arg)
            target_file = data.get('trackId') or data.get('fileName')
            
        separate_stems(target_file)
        
    except Exception as e:
        print(json.dumps({"error": f"Input parsing error: {str(e)}"}))