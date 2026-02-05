"""
Transition DJ Backend API Server
FastAPI 기반 Python 백엔드 템플릿

Required packages:
  pip install fastapi uvicorn demucs madmom librosa numpy soundfile pyrubberband

Run:
  uvicorn main:app --host 0.0.0.0 --port 18000 --reload
"""

from fastapi import FastAPI, UploadFile, File, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
import uuid
import os
import asyncio
from pathlib import Path

# ===== FastAPI 앱 초기화 =====
app = FastAPI(
    title="Transition DJ Backend",
    description="Stem Separation (Demucs) 및 Beat Analysis (Madmom) API",
    version="1.0.0"
)

# CORS 설정 (프론트엔드 연동)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ===== 상수 및 설정 =====
UPLOAD_DIR = Path("./uploads")
OUTPUT_DIR = Path("./outputs")
UPLOAD_DIR.mkdir(exist_ok=True)
OUTPUT_DIR.mkdir(exist_ok=True)

# 작업 상태 저장 (실제 서비스에서는 Redis 등 사용)
jobs: Dict[str, Dict[str, Any]] = {}


# ===== Pydantic 모델 =====

class AnalyzeRequest(BaseModel):
    """비트 분석 요청"""
    fileId: str


class StemRequest(BaseModel):
    """스템 분리 요청"""
    fileId: str
    model: str = "htdemucs"  # htdemucs | htdemucs_ft


class MixRequest(BaseModel):
    """트랜지션 믹스 요청"""
    trackA: Dict[str, Any]
    trackB: Dict[str, Any]
    transitionType: str = "blend"  # blend | drop
    transitionDuration: float = 8.0
    syncBpm: bool = True
    targetBpm: Optional[float] = None


class HealthResponse(BaseModel):
    """헬스 체크 응답"""
    status: str
    demucs: str
    madmom: str
    librosa: str


# ===== 헬스 체크 =====

@app.get("/health", response_model=HealthResponse)
async def health_check():
    """
    시스템 상태 확인
    각 라이브러리 로드 가능 여부 체크
    """
    result = {"status": "ok", "demucs": "unknown", "madmom": "unknown", "librosa": "unknown"}
    
    try:
        import demucs
        result["demucs"] = "ok"
    except ImportError:
        result["demucs"] = "not_installed"
    
    try:
        import madmom
        result["madmom"] = "ok"
    except ImportError:
        result["madmom"] = "not_installed"
    
    try:
        import librosa
        result["librosa"] = "ok"
    except ImportError:
        result["librosa"] = "not_installed"
    
    return result


# ===== 파일 업로드 =====

@app.post("/api/transition/upload")
async def upload_audio(file: UploadFile = File(...)):
    """
    오디오 파일 업로드
    지원 포맷: WAV, MP3, FLAC, OGG
    """
    file_id = str(uuid.uuid4())
    file_ext = Path(file.filename).suffix.lower()
    
    if file_ext not in [".wav", ".mp3", ".flac", ".ogg"]:
        raise HTTPException(status_code=400, detail="Unsupported file format")
    
    file_path = UPLOAD_DIR / f"{file_id}{file_ext}"
    
    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)
    
    # 기본 메타데이터 추출 (librosa 사용)
    duration = 0.0
    sample_rate = 44100
    channels = 2
    
    try:
        import librosa
        y, sr = librosa.load(str(file_path), sr=None, mono=False)
        duration = librosa.get_duration(y=y, sr=sr)
        sample_rate = sr
        channels = 1 if y.ndim == 1 else y.shape[0]
    except Exception as e:
        print(f"Metadata extraction failed: {e}")
    
    return {
        "fileId": file_id,
        "filename": file.filename,
        "duration": duration,
        "sampleRate": sample_rate,
        "channels": channels,
    }


# ===== 비트 분석 =====

@app.post("/api/transition/analyze")
async def analyze_beats(request: AnalyzeRequest):
    """
    비트/BPM 분석 (Madmom 기반)
    - BPM 감지
    - 비트 위치 추출
    - 다운비트 추출
    - 섹션 분석
    """
    file_path = find_file(request.fileId)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    try:
        import librosa
        import numpy as np
        
        # 오디오 로드
        y, sr = librosa.load(str(file_path), sr=22050, mono=True)
        duration = librosa.get_duration(y=y, sr=sr)
        
        # BPM 추출
        tempo, beats = librosa.beat.beat_track(y=y, sr=sr)
        beat_times = librosa.frames_to_time(beats, sr=sr).tolist()
        
        # 다운비트 추출 (4박자 기준)
        downbeats = [i for i in range(0, len(beat_times), 4)]
        
        # 웨이브폼 피크 데이터
        hop_length = len(y) // 2000
        peaks = np.abs(y[::hop_length]).tolist()[:2000]
        
        # 기본 섹션 (실제로는 더 정교한 분석 필요)
        sections = [
            {"name": "Intro", "start": 0, "end": duration * 0.1},
            {"name": "Verse", "start": duration * 0.1, "end": duration * 0.3},
            {"name": "Chorus", "start": duration * 0.3, "end": duration * 0.5},
            {"name": "Verse", "start": duration * 0.5, "end": duration * 0.7},
            {"name": "Chorus", "start": duration * 0.7, "end": duration * 0.9},
            {"name": "Outro", "start": duration * 0.9, "end": duration},
        ]
        
        return {
            "fileId": request.fileId,
            "bpm": float(tempo) if isinstance(tempo, np.ndarray) else tempo,
            "timeSignature": "4/4",
            "beats": beat_times,
            "downbeats": downbeats,
            "sections": sections,
            "waveformData": {
                "peaks": peaks,
                "duration": duration,
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {str(e)}")


# ===== 스템 분리 =====

@app.post("/api/transition/stems")
async def request_stem_separation(request: StemRequest, background_tasks: BackgroundTasks):
    """
    Demucs 기반 스템 분리 요청
    백그라운드에서 처리, 상태 폴링으로 확인
    """
    file_path = find_file(request.fileId)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    job_id = str(uuid.uuid4())
    jobs[job_id] = {
        "status": "processing",
        "progress": 0,
        "fileId": request.fileId,
        "model": request.model,
    }
    
    # 백그라운드 태스크로 스템 분리 실행
    background_tasks.add_task(run_stem_separation, job_id, file_path, request.model)
    
    return {
        "jobId": job_id,
        "estimatedTime": 120,  # 약 2분 예상 (파일 크기에 따라 다름)
    }


async def run_stem_separation(job_id: str, file_path: Path, model: str):
    """
    Demucs 스템 분리 실행 (백그라운드)
    """
    try:
        # 진행 상태 업데이트
        jobs[job_id]["progress"] = 10
        
        # Demucs 실행 (실제 구현)
        # import demucs.separate
        # demucs.separate.main(["--two-stems", "vocals", "-n", model, str(file_path)])
        
        # 시뮬레이션 (실제 구현 시 제거)
        for i in range(1, 10):
            await asyncio.sleep(1)
            jobs[job_id]["progress"] = i * 10
        
        output_dir = OUTPUT_DIR / job_id
        output_dir.mkdir(exist_ok=True)
        
        # 결과 저장 (실제로는 Demucs 출력 파일 경로)
        jobs[job_id]["status"] = "completed"
        jobs[job_id]["progress"] = 100
        jobs[job_id]["stems"] = {
            "vocals": {"fileId": f"{job_id}_vocals", "streamUrl": f"/api/transition/stream/{job_id}_vocals"},
            "bass": {"fileId": f"{job_id}_bass", "streamUrl": f"/api/transition/stream/{job_id}_bass"},
            "drums": {"fileId": f"{job_id}_drums", "streamUrl": f"/api/transition/stream/{job_id}_drums"},
            "other": {"fileId": f"{job_id}_other", "streamUrl": f"/api/transition/stream/{job_id}_other"},
        }
    except Exception as e:
        jobs[job_id]["status"] = "failed"
        jobs[job_id]["error"] = str(e)


@app.get("/api/transition/stems/{job_id}")
async def get_stem_status(job_id: str):
    """
    스템 분리 상태 조회
    """
    if job_id not in jobs:
        raise HTTPException(status_code=404, detail="Job not found")
    
    return jobs[job_id]


# ===== 트랜지션 믹스 =====

@app.post("/api/transition/mix")
async def create_transition_mix(request: MixRequest):
    """
    트랜지션 믹스 생성 (PyRubberband 기반 시간 스트레칭)
    """
    # TODO: 실제 믹스 로직 구현
    mix_id = str(uuid.uuid4())
    
    return {
        "mixId": mix_id,
        "streamUrl": f"/api/transition/stream/{mix_id}",
        "duration": 300.0,  # 예시
        "transitionPoints": {
            "fadeOutStart": 0,
            "fadeOutEnd": request.transitionDuration,
            "fadeInStart": 0,
            "fadeInEnd": request.transitionDuration,
        }
    }


# ===== 스트리밍 =====

@app.get("/api/transition/stream/{file_id}")
async def stream_audio(file_id: str):
    """
    오디오 스트리밍
    """
    file_path = find_file(file_id)
    if not file_path:
        raise HTTPException(status_code=404, detail="File not found")
    
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        headers={"Accept-Ranges": "bytes"}
    )


# ===== 유틸리티 함수 =====

def find_file(file_id: str) -> Optional[Path]:
    """
    file_id로 파일 찾기
    """
    for ext in [".wav", ".mp3", ".flac", ".ogg"]:
        path = UPLOAD_DIR / f"{file_id}{ext}"
        if path.exists():
            return path
    return None


# ===== 메인 실행 =====

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=18000, reload=True)
