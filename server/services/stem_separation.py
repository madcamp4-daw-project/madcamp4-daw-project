# server/services/stem_separation.py

import sys
import os
import subprocess
import json

# 한글 깨짐 방지
sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

def separate_stems(track_filename):
    # ==========================================
    # 🎛️ [설정] 고음질 모델 및 옵션 정의
    # ==========================================
    MODEL_NAME = "htdemucs_ft"  # 기본 htdemucs보다 정교함
    SHIFTS = "2"                # 노이즈 제거를 위한 중복 분석 횟수
    OVERLAP = "0.25"            # 구간 연결 부드러움 정도

    # 1. 경로 설정
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    uploads_dir = os.path.join(base_dir, 'uploads')
    output_dir = os.path.join(base_dir, 'output')
    
    os.environ["PATH"] += os.pathsep + os.path.dirname(os.path.abspath(__file__))

    # 2. 입력 파일 찾기
    input_path = os.path.join(uploads_dir, track_filename)

    if not os.path.exists(input_path):
        if os.path.exists(input_path + ".mp3"): input_path += ".mp3"
        elif os.path.exists(input_path + ".wav"): input_path += ".wav"
        else:
            print(json.dumps({"error": f"File not found: {input_path}"}))
            return

    # =================================================================
    # 🔥 [수정됨] 모델 이름에 맞춰 폴더 경로 자동 변경
    # =================================================================
    track_name_only = os.path.splitext(os.path.basename(input_path))[0]
    
    # 모델 이름(htdemucs_ft)이 폴더명이 되므로 변수 사용 필수!
    expected_result_path = os.path.join(output_dir, MODEL_NAME, track_name_only)
    
    req_files = ["vocals.wav", "drums.wav", "bass.wav", "other.wav"]
    all_exist = all(os.path.exists(os.path.join(expected_result_path, f)) for f in req_files)

    if all_exist:
        print(f"   ⏩ Stems already exist in '{MODEL_NAME}/{track_name_only}'. Skipping.")
        return
    # =================================================================

    # 3. Demucs 명령어 구성 (고음질 옵션 추가)
    cmd = [
        sys.executable, "-m", "demucs",
        "-n", MODEL_NAME,     # htdemucs_ft
        "--shifts", SHIFTS,   # 2 (퀄리티 상승)
        "--overlap", OVERLAP, # 0.25
        "-d", "cuda",         # GPU 필수
        "--out", output_dir,
        input_path
    ]

    try:
        sys.stderr.write(f"Separating track: {os.path.basename(input_path)} (High Quality)...\n")
        
        # 4. 실행
        subprocess.run(cmd, check=True, text=True)
        
        # 5. 결과 확인
        if os.path.exists(expected_result_path):
            result = {
                "message": "Separation complete",
                "path": expected_result_path
            }
            print(json.dumps(result, ensure_ascii=False))
        else:
            print(json.dumps({"error": "Separation finished but output folder not found."}))

    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Demucs Failed: {e}\n")
    except Exception as e:
        sys.stderr.write(f"Unexpected Error: {e}\n")

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No trackId provided"}))
        sys.exit(1)
        
    try:
        input_arg = sys.argv[1]
        target_file = input_arg
        if input_arg.startswith('{'):
            data = json.loads(input_arg)
            target_file = data.get('trackId') or data.get('fileName')
            
        separate_stems(target_file)
        
    except Exception as e:
        print(json.dumps({"error": f"Input parsing error: {str(e)}"}))