# server/services/stem_separation.py

# ⚠️ [중요] pkg_resources 경고 억제 (madmom 관련)
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='pkg_resources')
warnings.filterwarnings('ignore', category=DeprecationWarning, module='pkg_resources')

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
    uploads_dir = os.path.join(base_dir, 'uploads', 'tracks')
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

    # =================================================================
    # 🔥 [수정됨] GPU/CPU 자동 감지
    # =================================================================
    device = "cpu"
    try:
        import torch
        if torch.cuda.is_available():
            device = "cuda"
            gpu_name = torch.cuda.get_device_name(0)
            print(json.dumps({"progress": 0, "message": f"GPU 사용 가능! CUDA 모드로 실행합니다. ({gpu_name})"}), flush=True)
            sys.stderr.write(f"Detected GPU: {gpu_name}\n")
        else:
            print(json.dumps({"progress": 0, "message": "GPU를 찾을 수 없습니다. CPU 모드로 전환합니다. (느림)"}), flush=True)
            sys.stderr.write("No GPU detected. Using CPU.\n")
    except ImportError:
        print(json.dumps({"progress": 0, "message": "Torch 모듈이 설치되지 않았습니다. CPU로 실행합니다."}), flush=True)
    except Exception as e:
        print(json.dumps({"progress": 0, "message": f"Torch 확인 중 오류 발생: {e}. CPU 안전모드로 실행합니다."}), flush=True)

    cmd = [
        sys.executable, "-m", "demucs",
        "-n", MODEL_NAME,     # htdemucs_ft
        "--shifts", SHIFTS,   # 2 (퀄리티 상승)
        "--overlap", OVERLAP, # 0.25
        "-d", device,         # 자동 감지된 장치
        "--out", output_dir,
        input_path
    ]

    try:
        sys.stderr.write(f"Separating track: {os.path.basename(input_path)} (High Quality)...\n")
        print(json.dumps({"progress": 0, "message": "모델 로딩 및 초기화 중..."}), flush=True)
        
        # 4. 실행 (Popen으로 변경하여 실시간 로그 캡처)
        # stderr를 파이프로 연결하여 진행률 파싱
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding='utf-8',
            errors='replace' # 인코딩 에러 방지
        )

        # 실시간 로그 모니터링 (Char-by-Char to catch \r)
        buffer = ""
        full_log = "" # 전체 로그 저장용
        
        while True:
            # 한 글자씩 읽기 (블로킹 방지 및 \r 캐치)
            char = process.stderr.read(1)
            
            if not char and process.poll() is not None:
                break
                
            if char:
                buffer += char
                full_log += char
                # \r(진행바 업데이트) 또는 \n(줄바꿈)을 만나면 버퍼 분석
                if char in ['\r', '\n']:
                    # 진행률 파싱 로직
                    if "%" in buffer:
                        try:
                            import re
                            # " 13%" 형태 찾기
                            match = re.search(r"(\d+)%", buffer)
                            if match:
                                progress = int(match.group(1))
                                # 메시지와 함께 JSON 출력
                                msg = "스템 분리 진행 중..."
                                if progress >= 90: msg = "마무리 및 저장 중..."
                                
                                result_json = json.dumps({"progress": progress, "message": msg})
                                print(result_json, flush=True)
                        except:
                            pass
                    
                    # 버퍼 초기화 (다음 라인/업데이트 대기)
                    buffer = ""
            elif not char:
                # EOF 도달 시 루프 종료
                 break 
        
        # 프로세스 종료 대기 (returncode 확보)
        ret_code = process.wait()

        # 종료 코드 확인
        if ret_code != 0:
             # 에러 메시지 읽기 (이미 다 읽었을 수 있으므로 full_log 사용)
             # 남은게 있다면 읽기
             sidebar = process.stderr.read()
             if sidebar: full_log += sidebar
             
             # 만약 ret_code가 여전히 None이면 (이론상 불가능하지만) 방어 코드
             safe_ret = ret_code if ret_code is not None else -1
             
             # 상세 에러 JSON 출력
             error_response = {
                 "error": f"Demucs exited with code {safe_ret}",
                 "details": full_log[-1000:] # 너무 길면 뒤 1000자만
             }
             print(json.dumps(error_response), flush=True)
             
             # 예외 던지기 (상위 catch에서 잡힘)
             raise subprocess.CalledProcessError(safe_ret, cmd, full_log)
        
        # 5. 결과 확인
        if os.path.exists(expected_result_path):
            # 상대 경로 계산 (output 폴더 기준)
            # expected_result_path: /app/output/htdemucs_ft/filename
            # rel_path needed: htdemucs_ft/filename/drums.wav
            
            rel_folder = os.path.relpath(expected_result_path, output_dir)
            # Windows path separators to forward slashes for URLs
            rel_folder = rel_folder.replace(os.sep, '/')
            
            result = {
                "message": "Separation complete",
                "progress": 100,
                "stems": {
                    "drums": f"{rel_folder}/drums.wav",
                    "bass": f"{rel_folder}/bass.wav",
                    "vocals": f"{rel_folder}/vocals.wav",
                    "other": f"{rel_folder}/other.wav",
                }
            }
            print(json.dumps(result, ensure_ascii=False), flush=True)
        else:
            print(json.dumps({"error": "Separation finished but output folder not found."}), flush=True)

    except subprocess.CalledProcessError as e:
        sys.stderr.write(f"Demucs Failed: {e}\n")
        # 에러 JSON 출력
        print(json.dumps({"error": str(e)}), flush=True)
    except Exception as e:
        sys.stderr.write(f"Unexpected Error: {e}\n")
        print(json.dumps({"error": str(e)}), flush=True)

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
        import traceback
        tb = traceback.format_exc()
        # sys.stderr.write(tb) # 에러는 stderr로
        print(json.dumps({"error": f"{str(e)}\n{tb}"}))