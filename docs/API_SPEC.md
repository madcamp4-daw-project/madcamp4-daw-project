# API 명세서

> **프로젝트**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **버전**: 1.1

---

## 목차

1. [기본 정보](#1-기본-정보)
2. [인증](#2-인증)
3. [사운드 업로드 및 분석](#3-사운드-업로드-및-분석)
4. [레이어 분리](#4-레이어-분리)
5. [블렌드](#5-블렌드)
6. [신스 피아노](#6-신스-피아노)
7. [믹스 컨트롤러](#7-믹스-컨트롤러)
8. [에러 처리](#8-에러-처리)

---

## 1. 기본 정보

### Base URL

```
http://localhost:3001/api
```

### 응답 형식

모든 API는 JSON 형식으로 응답합니다.

### Content-Type

- 일반 요청: `application/json`
- 파일 업로드: `multipart/form-data`

---

## 2. 인증

현재 버전에서는 인증이 선택적입니다. 향후 JWT 토큰 기반 인증을 추가할 예정입니다.

---

## 3. 사운드 업로드 및 분석

### 3.1 사운드 파일 업로드

**엔드포인트**: `POST /api/sound/upload`

**설명**: 오디오 파일을 업로드하고 자동으로 분석합니다.

**요청 형식**: `multipart/form-data`

**요청 파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| file | File | 예 | 오디오 파일 (MP3, WAV, OGG 등) |
| title | string | 아니오 | 트랙 제목 |
| artist | string | 아니오 | 아티스트명 |

**응답 예시**:

```json
{
  "success": true,
  "trackId": 123,
  "analysis": {
    "bpm": 128.5,
    "key": "A Minor",
    "camelot": "8A",
    "beats": [0.0, 0.5, 1.0, 1.5, 2.0],
    "downbeats": [0.0, 2.0, 4.0, 6.0]
  },
  "message": "파일 업로드 및 분석 완료"
}
```

**에러 응답**:

```json
{
  "success": false,
  "error": "파일 형식이 지원되지 않습니다.",
  "code": "INVALID_FILE_TYPE"
}
```

### 3.2 사운드 분석 (재실행)

**엔드포인트**: `POST /api/sound/inspect`

**설명**: 이미 업로드된 트랙의 분석을 재실행합니다.

**요청 본문**:

```json
{
  "trackId": 123
}
```

**응답 예시**:

```json
{
  "success": true,
  "analysis": {
    "bpm": 128.5,
    "key": "A Minor",
    "camelot": "8A",
    "beats": [0.0, 0.5, 1.0, 1.5, 2.0],
    "downbeats": [0.0, 2.0, 4.0, 6.0],
    "segments": [
      {
        "type": "intro",
        "start": 0.0,
        "end": 16.0
      },
      {
        "type": "verse",
        "start": 16.0,
        "end": 48.0
      }
    ]
  }
}
```

---

## 4. 레이어 분리

### 4.1 레이어 분리 실행

**엔드포인트**: `POST /api/sound/split`

**설명**: Demucs AI 모델을 사용하여 오디오를 4개 레이어로 분리합니다.

**요청 본문**:

```json
{
  "trackId": 123
}
```

**응답 예시**:

```json
{
  "success": true,
  "layers": {
    "drums": "/layers/123/drums.wav",
    "bass": "/layers/123/bass.wav",
    "vocals": "/layers/123/vocals.wav",
    "other": "/layers/123/other.wav"
  },
  "message": "레이어 분리 완료"
}
```

**에러 응답**:

```json
{
  "success": false,
  "error": "트랙을 찾을 수 없습니다.",
  "code": "TRACK_NOT_FOUND"
}
```

### 4.2 레이어 분리 상태 확인

**엔드포인트**: `GET /api/sound/split/:trackId/status`

**설명**: 레이어 분리 작업의 진행 상태를 확인합니다.

**응답 예시**:

```json
{
  "status": "processing",
  "progress": 65,
  "estimatedTimeRemaining": 30
}
```

**상태 값**:

- `pending`: 대기 중
- `processing`: 처리 중
- `completed`: 완료
- `failed`: 실패

---

## 5. 블렌드

### 5.1 블렌드 시퀀스 생성

**엔드포인트**: `POST /api/sound/blend`

**설명**: 두 곡 간의 블렌드 시퀀스를 생성합니다 (Bass Swap 기법).

**요청 본문**:

```json
{
  "sourceId": 123,
  "targetId": 456,
  "blendPoint": 120.5
}
```

**파라미터 설명**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| sourceId | number | 예 | 소스 트랙 ID |
| targetId | number | 예 | 타겟 트랙 ID |
| blendPoint | number | 예 | 블렌드 시작 시점 (초 단위) |

**응답 예시**:

```json
{
  "success": true,
  "blendId": 789,
  "outputPath": "/blends/789/mix.mp3",
  "duration": 180.5,
  "message": "블렌드 시퀀스 생성 완료"
}
```

**에러 응답**:

```json
{
  "success": false,
  "error": "두 트랙의 BPM 차이가 너무 큽니다.",
  "code": "BPM_MISMATCH"
}
```

### 5.2 블렌드 상태 확인

**엔드포인트**: `GET /api/sound/blend/:blendId/status`

**설명**: 블렌드 생성 작업의 진행 상태를 확인합니다.

**응답 예시**:

```json
{
  "status": "processing",
  "progress": 45,
  "estimatedTimeRemaining": 60
}
```

---

## 6. 신스 피아노

### 6.1 피아노 연주 녹음 저장

**엔드포인트**: `POST /api/piano/record`

**설명**: 신스 피아노에서 녹음한 연주를 저장합니다.

**요청 본문**:

```json
{
  "title": "My Composition",
  "notes": [
    {
      "time": 0.0,
      "note": "C4",
      "duration": 0.5
    },
    {
      "time": 0.5,
      "note": "E4",
      "duration": 0.5
    }
  ],
  "audioBlob": "base64_encoded_audio_data"
}
```

**응답 예시**:

```json
{
  "success": true,
  "presetId": 101,
  "audioPath": "/piano/101/recording.wav",
  "message": "녹음 저장 완료"
}
```

---

## 7. 믹스 컨트롤러

### 7.1 유닛 상태 조회

**엔드포인트**: `GET /api/mixer/units`

**설명**: 현재 두 유닛의 상태를 조회합니다.

**응답 예시**:

```json
{
  "unit1": {
    "trackId": 123,
    "trackTitle": "Song A",
    "artist": "Artist A",
    "bpm": 128.5,
    "isPlaying": true,
    "currentTime": 45.2,
    "duration": 180.0,
    "fx": "SLICER"
  },
  "unit2": {
    "trackId": null,
    "trackTitle": null,
    "artist": null,
    "bpm": 0,
    "isPlaying": false,
    "currentTime": 0,
    "duration": 0,
    "fx": null
  }
}
```

### 7.2 유닛에 트랙 로드

**엔드포인트**: `POST /api/mixer/load-track`

**설명**: 특정 유닛에 트랙을 로드합니다.

**요청 본문**:

```json
{
  "unit": 1,
  "trackId": 123
}
```

**응답 예시**:

```json
{
  "success": true,
  "message": "트랙 로드 완료",
  "unit": {
    "trackId": 123,
    "trackTitle": "Song A",
    "artist": "Artist A",
    "bpm": 128.5
  }
}
```

### 7.3 유닛 재생 제어

**엔드포인트**: `POST /api/mixer/unit/:unitId/play`

**설명**: 유닛의 재생을 시작/일시정지합니다.

**요청 본문**:

```json
{
  "action": "play"
}
```

**응답 예시**:

```json
{
  "success": true,
  "isPlaying": true,
  "message": "재생 시작"
}
```

### 7.4 이펙트 적용

**엔드포인트**: `POST /api/mixer/unit/:unitId/fx`

**설명**: 유닛에 이펙트를 적용합니다.

**요청 본문**:

```json
{
  "fx": "SLICER"
}
```

**응답 예시**:

```json
{
  "success": true,
  "fx": "SLICER",
  "message": "이펙트 적용 완료"
}
```

---

## 8. 에러 처리

### 8.1 에러 응답 형식

모든 에러 응답은 다음 형식을 따릅니다:

```json
{
  "success": false,
  "error": "에러 메시지",
  "code": "ERROR_CODE"
}
```

### 8.2 HTTP 상태 코드

| 상태 코드 | 설명                  |
| --------- | --------------------- |
| 200       | 성공                  |
| 400       | 잘못된 요청           |
| 404       | 리소스를 찾을 수 없음 |
| 500       | 서버 내부 오류        |

### 8.3 에러 코드 목록

| 에러 코드                 | 설명                    |
| ------------------------- | ----------------------- |
| `NO_FILE`                 | 파일이 업로드되지 않음  |
| `INVALID_FILE_TYPE`       | 지원되지 않는 파일 형식 |
| `TRACK_NOT_FOUND`         | 트랙을 찾을 수 없음     |
| `MISSING_TRACK_ID`        | trackId 누락            |
| `MISSING_PARAMETERS`      | 필수 파라미터 누락      |
| `LAYER_SEPARATION_FAILED` | 레이어 분리 실패        |
| `ANALYSIS_FAILED`         | 분석 실패               |
| `BPM_MISMATCH`            | BPM 차이가 너무 큼      |
| `BLEND_FAILED`            | 블렌드 생성 실패        |
| `UPLOAD_FAILED`           | 업로드 실패             |
| `UNIT_NOT_FOUND`          | 유닛을 찾을 수 없음     |
| `INTERNAL_SERVER_ERROR`   | 서버 내부 오류          |

---

**문서 버전**: 1.1  
**최종 수정일**: 2026-01-29
