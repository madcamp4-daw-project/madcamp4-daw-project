# ==============================================
# Web DAW Server - Hybrid Node.js + Python (GPU Enabled)
# ==============================================
FROM node:20-slim

WORKDIR /app

# ==============================================
# 1. System Dependencies
# ==============================================
# pkg-config, build-essential 등 필수 도구 설치
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    ffmpeg \
    libsndfile1 \
    libsndfile1-dev \
    rubberband-cli \
    librubberband-dev \
    git \
    curl \
    build-essential \
    pkg-config \
    alsa-utils \
    portaudio19-dev \
    && rm -rf /var/lib/apt/lists/*

# Symlink python3 -> python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# ==============================================
# 2. Python Setup
# ==============================================
# 가상환경 생성 및 활성화
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# pip 업그레이드 (setuptools<81: madmom pkg_resources 경고 방지)
RUN pip install --no-cache-dir --upgrade pip "setuptools<81" wheel

# [Build Dependencies]
# Madmom, Librosa 빌드를 위해 Numpy(<2.0.0)와 Cython을 먼저 설치
RUN pip install --no-cache-dir "numpy<2.0.0" "Cython>=0.29.30"

# requirements.txt 복사
COPY requirements.txt ./

# 🔥 [PyTorch GPU Version] - 핵심 변경 사항
# Linux/CUDA 12.1 환경에 맞는 버전을 강제 설치합니다.
# (서버 드라이버 버전에 따라 cu118로 변경 가능)
RUN pip install --no-cache-dir \
    torch==2.1.2+cu121 \
    torchaudio==2.1.2+cu121 \
    --index-url https://download.pytorch.org/whl/cu121

# [Install Remaining Dependencies]
# --no-build-isolation: 위에서 설치한 numpy/Cython을 활용해 빌드
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# [Install Extra Dependencies]
COPY requirements_extra.txt ./
RUN pip install --no-cache-dir -r requirements_extra.txt

# ==============================================
# 3. Node.js Setup
# ==============================================
COPY package*.json ./
RUN npm install

# ==============================================
# 4. Finalize
# ==============================================
COPY . .

# 권한 설정 (mixed_results 폴더 포함)
RUN mkdir -p uploads output mixed_results && chmod 777 uploads output mixed_results

EXPOSE 3001
ENV NODE_ENV=production
ENV PORT=3001

CMD ["node", "index.js"]