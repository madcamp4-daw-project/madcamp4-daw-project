# ==============================================
# Web DAW Server - Hybrid Node.js + Python
# ==============================================
FROM node:20-slim

# Set working directory
WORKDIR /app

# ==============================================
# 1. System Dependencies
# ==============================================
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

# Install Python dependencies
# Install PyTorch CPU version first (smaller image size)
RUN pip install --no-cache-dir \
    torch==2.1.0+cpu \
    torchaudio==2.1.0+cpu \
    --index-url https://download.pytorch.org/whl/cpu

# Install numpy first
RUN pip install --no-cache-dir "numpy<1.26.0"

# Install remaining Python dependencies
RUN pip install --no-cache-dir --no-build-isolation -r requirements.txt

# ==============================================
# 3. Node.js Dependencies
# ==============================================
# Copy package files first (for Docker layer caching)
COPY package*.json ./

# Install Node.js dependencies
RUN npm install

# ==============================================
# 4. Application Code
# ==============================================
# Copy the rest of the application
COPY . .

# Create necessary directories
RUN mkdir -p uploads output

# ==============================================
# 5. Environment & Runtime
# ==============================================
# Expose the server port
EXPOSE 3001

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the server
CMD ["node", "index.js"]
