# Python 백엔드 API 명세서 v2.0 (Server Native)

> **중요:** 실제 Server 구현(`server/routes/audio.js`)에 맞춰 완전히 수정된 명세서입니다.
> 모든 API 요청은 `/api/sound` 하위 경로를 사용합니다.

---

## 📋 개요

### Base URL

```
NEXT_PUBLIC_API_BASE_URL = http://localhost:8000/api/sound
```

### 공통 흐름 (Workflow)

대부분의 작업은 **2단계(2-Step)**로 이루어집니다.

1. `POST /upload`: 파일을 서버에 업로드하고 `trackId` (파일명)를 발급받음.
2. `POST /split` 또는 `POST /blend`: 발급받은 `trackId`를 사용하여 실제 오디오 작업을 요청.
3. `GET /status/:jobId`: 작업 상태를 폴링(Polling).

---

## 📂 1. 파일 업로드 (공통)

**POST** `/api/sound/upload`

#### Request (multipart/form-data)

- `file`: 오디오 파일

#### Response

```json
{
  "success": true,
  "trackId": "1706954400512.mp3", // 이 ID(=파일명)를 이후 작업에 사용
  "originalName": "myfile.mp3",
  "analysis": { ... }, // 업로드 시 자동 수행된 기본 분석 결과
  "message": "업로드 및 분석 완료"
}
```

---

## 🎵 2. Stem Separation (음원 분리)

### 2.1 분리 요청

**POST** `/api/sound/split`

#### Request (JSON)

```json
{
  "trackId": "1706954400512.mp3" // 업로드 시 받은 trackId
}
```

#### Response

```json
{
  "success": true,
  "jobId": "job_split_1706954500000",
  "message": "분리 작업이 백그라운드에서 시작되었습니다."
}
```

### 2.2 상태 조회

**GET** `/api/sound/status/{jobId}`

#### Response (처리 중)

```json
{
  "success": true,
  "status": "processing",
  "type": "separation",
  "startTime": 1706954500000
}
```

#### Response (완료)

```json
{
  "success": true,
  "status": "completed",
  "result": { ... }, // 분리된 파일 경로 등 (Server 구현에 따라 다름)
  "completedAt": 1706954600000
}
```

---

## 🔀 3. Transition Mix (블렌딩)

### 3.1 블렌드/드롭 믹스 요청

**POST** `/api/sound/blend`

#### Request (JSON)

```json
{
  "sourceId": "track_a.mp3", // Track A (기존 파일)
  "targetId": "track_b.mp3", // Track B (새로 들어올 파일)
  "mixType": "blend", // "blend" | "drop"
  "bridgeBars": 4 // Drop mix only (default: 4)
}
```

#### Response

```json
{
  "success": true,
  "jobId": "job_blend_1706954600000",
  "mixType": "blend",
  "message": "Blend Mix 작업이 시작되었습니다."
}
```

---

## 📝 4. 결과물 접근 (Static)

서버는 결과 파일을 정적 경로로 제공합니다.

- **업로드된 트랙**: `http://localhost:8000/uploads/tracks/{filename}`
- **분리된 스템**: (Server 구현에 따라 경로 확인 필요, 보통 output 폴더)
- **믹스 결과**: `http://localhost:8000/output/blends/{filename}` (예상)

---

## 📅 버전 히스토리

| 버전  | 날짜       | 변경사항                                         |
| ----- | ---------- | ------------------------------------------------ |
| 2.0.0 | 2026-02-04 | 실제 Server (`/api/sound`) 구현에 맞춰 전면 수정 |
