# ====================================================
# ⚙️ 프로젝트 설정 파일 (Configuration)
# ====================================================

import os

# 📁 경로 설정
INPUT_DIR = "./uploads"
OUTPUT_DIR = "./output"
MIXED_RESULTS_DIR = os.path.join(OUTPUT_DIR, "mixed_results")

# 🎧 오디오 기본 설정
TARGET_SR = 44100

# ⚖️ 믹싱 판단 기준
BPM_THRESHOLD = 20  # BPM 차이가 이 값보다 크면 Drop Mix

# 🧨 Drop Mix 설정 (Extreme Riser)
DROP_TARGET_BPM_MULTIPLIER = 50.0  # 목표 속도 배율 (50배)
DROP_LOOP_BARS = 12                # 빌드업 마디 수 (12마디)
DROP_START_BPM_BOOST = 1.05        # 초기 속도 부스트 (1.05배)
DROP_TIGHTEN_RATIO = 0.97          # 루프 끝부분 잘라내기 비율 (타이트함)
DROP_VOCAL_SENSITIVITY = 0.001     # 보컬 감지 민감도 (RMS)

# 🍹 Blend Mix 설정
BLEND_OVERLAP_FADE = 512           # 기본 크로스페이드 샘플 수
BLEND_MICRO_FADE = 256             # 타이밍 보정용 마이크로 페이드