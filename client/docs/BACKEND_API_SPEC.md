# Python 백엔드 API 명세서 v1.0

> **목적:** 프론트엔드(Next.js)와 Python 백엔드(Demucs, Madmom, BeatNet) 연동을 위한 API 인터페이스 명세

---

## 📋 개요

### 기술 스택

| 구분                | 기술                          | 역할                                      |
| ------------------- | ----------------------------- | ----------------------------------------- |
| **Stem Separation** | Demucs (htdemucs/htdemucs_ft) | 4-Track 분리 (Vocals, Bass, Drums, Other) |
| **Beat Tracking**   | Madmom                        | 다운비트/박자 정밀 분석                   |
| **Transition Mix**  | BeatNet + PyRubberband        | AI 기반 자동 믹싱                         |
| **DSP**             | LibROSA, NumPy, SoundFile     | 오디오 로딩/처리/저장                     |

### Base URL

```
NEXT_PUBLIC_STEM_API_URL = http://localhost:8000/api/stems
NEXT_PUBLIC_TRANSITION_API_URL = http://localhost:8000/api/transition
```

---

## 🎵 1. Stem Separation API

### 1.1 파일 업로드 및 분리 요청

**POST** `/api/stems/extract`

#### Request (multipart/form-data)

```json
{
  "file": "<audio_file>", // MP3, WAV, FLAC 지원
  "stems": ["drums", "bass", "vocals", "instruments"],
  "model": "htdemucs", // htdemucs | htdemucs_ft
  "limitCpu": false // CPU 제한 모드
}
```

#### Response

```json
{
  "jobId": "stem-job-1706954400000",
  "estimatedTime": 120, // 예상 처리 시간 (초)
  "status": "pending"
}
```

---

### 1.2 분리 상태 조회

**GET** `/api/stems/status/{jobId}`

#### Response (처리 중)

```json
{
  "status": "processing",
  "progress": 45, // 0-100
  "message": "Separating vocals..."
}
```

#### Response (완료)

```json
{
  "status": "completed",
  "progress": 100,
  "stems": {
    "drums": {
      "fileId": "drums-abc123",
      "streamUrl": "/api/stems/stream/drums-abc123",
      "duration": 180.5,
      "waveformData": [0.1, 0.3, 0.5, ...]  // 피크 데이터
    },
    "bass": { ... },
    "vocals": { ... },
    "instruments": { ... }
  }
}
```

---

### 1.3 스템 스트리밍

**GET** `/api/stems/stream/{fileId}`

- **Response:** `audio/wav` 또는 `audio/mpeg`
- **Headers:** `Content-Length`, `Accept-Ranges`

---

### 1.4 스템 다운로드

**GET** `/api/stems/download/{jobId}/{stem}`

- stem: `drums` | `bass` | `vocals` | `instruments` | `all`
- `all` 요청 시 ZIP 압축 파일 반환

---

### 1.5 작업 취소

**POST** `/api/stems/cancel/{jobId}`

#### Response

```json
{
  "success": true,
  "message": "Job cancelled"
}
```

---

## 🎛️ 2. Beat/BPM 분석 API (Madmom)

### 2.1 비트 분석 요청

**POST** `/api/transition/analyze`

#### Request

```json
{
  "fileId": "file-abc123" // 업로드된 파일 ID
}
```

#### Response

```json
{
  "fileId": "file-abc123",
  "bpm": 128.5,
  "timeSignature": "4/4",
  "beats": [0.0, 0.469, 0.938, 1.407, ...],     // 비트 타임스탬프 (초)
  "downbeats": [0, 4, 8, 12, ...],              // 다운비트 인덱스
  "sections": [
    { "name": "Intro", "start": 0, "end": 15.2 },
    { "name": "Verse", "start": 15.2, "end": 45.6 },
    { "name": "Chorus", "start": 45.6, "end": 76.0 },
    { "name": "Outro", "start": 150.0, "end": 180.0 }
  ],
  "waveformData": {
    "peaks": [0.1, 0.3, ...],
    "duration": 180.5
  }
}
```

---

## 🔀 3. Transition Mix API (BeatNet)

### 3.1 파일 업로드

**POST** `/api/transition/upload`

#### Request (multipart/form-data)

```json
{
  "file": "<audio_file>"
}
```

#### Response

```json
{
  "fileId": "file-1706954400000",
  "filename": "track_a.mp3",
  "duration": 180.5,
  "sampleRate": 44100,
  "channels": 2
}
```

---

### 3.2 트랜지션 믹스 생성

**POST** `/api/transition/mix`

#### Request

```json
{
  "trackA": {
    "fileId": "file-a123",
    "startTime": 120.0, // 믹스 시작 지점 (초)
    "endTime": 180.0 // 트랙 A 종료 지점
  },
  "trackB": {
    "fileId": "file-b456",
    "startTime": 0.0, // 트랙 B 시작 지점
    "endTime": 60.0
  },
  "transitionType": "blend", // blend | drop
  "transitionDuration": 16.0, // 트랜지션 길이 (초)
  "syncBpm": true, // BPM 동기화 여부
  "targetBpm": 128.0 // 목표 BPM (optional)
}
```

#### Response

```json
{
  "mixId": "mix-1706954500000",
  "streamUrl": "/api/transition/stream/mix-1706954500000",
  "duration": 120.0,
  "transitionPoints": {
    "fadeOutStart": 120.0,
    "fadeOutEnd": 136.0,
    "fadeInStart": 0.0,
    "fadeInEnd": 16.0
  }
}
```

---

### 3.3 Stem Visuals 데이터 요청

**GET** `/api/transition/stems/{jobId}/visuals`

> Stem Separation 완료 후 시각화 데이터 요청

#### Response

```json
{
  "vocals": {
    "color": "#00FF00",
    "notes": [
      { "time": 0.0, "pitch": 0.65, "volume": 0.8, "duration": 1.2 },
      { "time": 1.5, "pitch": 0.72, "volume": 0.9, "duration": 0.8 }
    ]
  },
  "bass": {
    "color": "#FF0000",
    "notes": [...]
  },
  "melody": {
    "color": "#FFA500",
    "notes": [...]
  },
  "drums": {
    "kick": {
      "color": "#9B59B6",
      "hits": [
        { "time": 0.0, "intensity": 0.9 },
        { "time": 0.5, "intensity": 0.85 }
      ]
    },
    "snareHihat": {
      "color": "#3498DB",
      "hits": [...]
    }
  }
}
```

---

## 🔊 4. 오디오 스트리밍

### 4.1 스트림 URL 생성

**GET** `/api/transition/stream/{fileId}`

- **Content-Type:** `audio/wav` | `audio/mpeg`
- **Range 요청 지원:** 부분 재생 가능

---

## ⚙️ 5. 시스템 상태

### 5.1 헬스 체크

**GET** `/api/health`

#### Response

```json
{
  "status": "healthy",
  "services": {
    "demucs": true,
    "madmom": true,
    "beatnet": true
  },
  "gpu_available": true,
  "version": "1.0.0"
}
```

---

## 📊 6. 에러 코드

| 코드  | 설명                            |
| ----- | ------------------------------- |
| `400` | 잘못된 요청 (파일 형식 오류 등) |
| `404` | 리소스 없음 (jobId/fileId 오류) |
| `409` | 작업 충돌 (이미 처리 중)        |
| `422` | 처리 불가 (분석 실패)           |
| `500` | 서버 오류                       |
| `503` | 서비스 불가 (GPU 점유 등)       |

---

## 🔗 7. 프론트엔드 연동 가이드

### 7.1 API 클라이언트 위치

```
lib/api/stemSeparation.ts    → Stem Separation API
lib/api/transition.ts        → Transition/Beat API
lib/api/soundcloud.ts        → SoundCloud API
```

### 7.2 환경 변수 설정

```env
NEXT_PUBLIC_STEM_API_URL=http://localhost:8000/api/stems
NEXT_PUBLIC_TRANSITION_API_URL=http://localhost:8000/api/transition
NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID=your_client_id
```

### 7.3 Mock 모드

- 백엔드 미연결 시 자동으로 Mock 데이터 반환
- `lib/api/*.ts`의 `mock*` 함수 사용

---

## 📅 버전 히스토리

| 버전  | 날짜       | 변경사항         |
| ----- | ---------- | ---------------- |
| 1.0.0 | 2026-02-03 | 초기 명세서 작성 |

---

**작성자:** AI Assistant  
**마지막 수정:** 2026-02-03
