# ==============================================
# Web DAW Server - Hybrid Node.js + Python
# ==============================================
# Node.js 20 (Debian Bookworm 기반) - Python 3.11이 기본 내장됨
FROM node:20-slim

# Set working directory
WORKDIR /app

# ==============================================
# 1. System Dependencies (Updated)
# ==============================================
# pkg-config 추가: Python 라이브러리 빌드 시 필요할 수 있음
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
    && rm -rf /var/lib/apt/lists/*

# Create symlink for python
RUN ln -sf /usr/bin/python3 /usr/bin/python

# ==============================================
# 2. Python Virtual Environment & Dependencies
# ==============================================
# Create virtual environment
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Upgrade pip and install build dependencies
RUN pip install --no-cache-dir --upgrade pip setuptools wheel Cython

# Copy Python requirements first (for Docker layer caching)
COPY requirements.txt ./

# [Step A] PyTorch (CPU Version) - Explicit Install
# requirements.txt에 torch가 있어도, 여기서 CPU 버전을 먼저 강제 설치하여
# 불필요한 GPU 버전(수 GB) 다운로드를 방지합니다.
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchaudio==2.1.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# [Step B] Install Requirements
# 🔥 중요: requirements.txt에 이미 "numpy<2.0.0"이 명시되어 있으므로
# 별도의 numpy 설치 라인을 제거하고 requirements.txt를 따릅니다.
RUN pip install --no-cache-dir -r requirements.txt

# ==============================================
# 3. Node.js Dependencies
# ==============================================
# Copy package files first
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# ==============================================
# 4. Application Code
# ==============================================
COPY . .

# Create necessary directories (권한 문제 방지)
RUN mkdir -p uploads output && chmod 777 uploads output

# ==============================================
# 5. Environment & Runtime
# ==============================================
EXPOSE 3001

ENV NODE_ENV=production
# 포트 환경변수 (필요시 수정)
ENV PORT=3001

# 🔥 주의: 실제 실행 파일명이 index.js인지 server.js인지 확인하세요!
CMD ["node", "index.js"]