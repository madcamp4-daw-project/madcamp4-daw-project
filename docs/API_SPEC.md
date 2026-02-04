# API 명세서

> **프로젝트**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **버전**: 1.3  
> **기준 문서**: [PROJECT_PLAN.md](./PROJECT_PLAN.md), [FILE_STRUCTURE.md](./FILE_STRUCTURE.md) — 본 프로젝트 공식 문서는 PROJECT_PLAN.md, FILE_STRUCTURE.md, API_SPEC.md 3개입니다.  
> **담당**: 서버 스펙·초안 — 개발자 A / 클라이언트 연동 가이드·에러 코드·Tone.js 사용 — 개발자 B

---

## 목차

1. [기본 정보](#1-기본-정보)
2. [인증](#2-인증)
3. [사운드 업로드 및 분석](#3-사운드-업로드-및-분석)
4. [레이어 분리](#4-레이어-분리)
5. [블렌드](#5-블렌드)
6. [프로젝트 관리](#6-프로젝트-관리)
7. [샘플 관리](#7-샘플-관리)
8. [에러 처리](#8-에러-처리)
9. [클라이언트 연동 가이드](#9-클라이언트-연동-가이드)

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

## 6. 프로젝트 관리

### 6.1 프로젝트 저장

**엔드포인트**: `POST /api/project/save`

**설명**: 현재 작업 중인 DAW 프로젝트 전체 상태(패턴, 플레이리스트, 믹서 설정)를 저장합니다.

**요청 본문**:

```json
{
  "title": "My Song",
  "bpm": 128,
  "patterns": { ... },
  "playlist": [ ... ],
  "mixer": [ ... ]
}
```

**응답 예시**:

```json
{
  "success": true,
  "projectId": 123,
  "message": "프로젝트 저장 완료"
}
```

### 6.2 프로젝트 로드

**엔드포인트**: `GET /api/project/:projectId`

**설명**: 저장된 프로젝트를 불러옵니다.

---

## 7. 샘플 관리

### 7.1 샘플 업로드 (브라우저용)

**엔드포인트**: `POST /api/sample/upload`

**설명**: 브라우저나 플레이리스트에 사용할 원샷/루프 샘플을 업로드합니다.

**응답 예시**:

```json
{
  "success": true,
  "sampleId": 456,
  "url": "/uploads/samples/kick.wav",
  "duration": 0.45
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

## 9. 클라이언트 연동 가이드

> **담당**: 개발자 B (프론트엔드). API 호출·에러 처리·재시도·로딩 UI는 `client/src/api/audioApi.js` 및 훅(`useUploadProgress`, `useAudioPlayer`)에서 구현합니다.

### 9.0 API 엔드포인트 사용 가이드

- **범용 업로드**: `uploadSound()` - 일반 오디오 파일 업로드 시 사용 (POST /api/sound/upload)
- **피아노 전용**: `uploadPianoRecord()` - 신스 피아노 녹음 저장 시 사용 (POST /api/piano/record)
  - `CompositionKeyboard.jsx`에서 녹음 시 자동으로 노트 배열 추적 및 전송
  - notes 배열 정보를 포함하여 더 풍부한 메타데이터 제공

### 9.1 Base URL 및 환경 변수

- **개발**: `VITE_API_BASE_URL` 또는 동일 의미의 env 사용 (예: `http://localhost:3001/api`).
- **프로덕션**: `.env.example`에 클라이언트용 항목은 개발자 B가 추가·유지 (PROJECT_PLAN 기준).

### 9.2 에러 코드별 클라이언트 처리 권장

| 에러 코드                 | HTTP | 클라이언트 권장 동작                                 |
| ------------------------- | ---- | ---------------------------------------------------- |
| `INVALID_FILE_TYPE`       | 400  | 업로드 전 확장자/타입 검사, 사용자 안내 메시지       |
| `TRACK_NOT_FOUND`         | 404  | "트랙을 찾을 수 없습니다" 메시지, 목록 새로고침 유도 |
| `LAYER_SEPARATION_FAILED` | 500  | 재시도 버튼 제공, 로딩/스켈레톤 UI로 대기 표시       |
| `BPM_MISMATCH`            | 400  | BPM 차이 안내 및 블렌드 포인트 조정 유도             |
| `BLEND_FAILED`            | 500  | 재시도 또는 파라미터 변경 유도                       |
| `UPLOAD_FAILED`           | 500  | 재시도, `useUploadProgress`로 진행률 표시            |
| 네트워크 오류 / 타임아웃  | -    | 오프라인/재시도 안내, 필요 시 exponential backoff    |

### 9.3 재시도·오프라인

- 장시간 작업(업로드, split, blend)은 폴링 또는 상태 조회 API(`/api/sound/split/:trackId/status`, `/api/sound/blend/:blendId/status`)와 연동하여 진행률 표시.
- 일시적 오류 시 재시도 로직 적용 권장(예: 최대 2~3회, 지수 백오프).

### 9.4 Tone.js 클라이언트 사용

- **역할 구분**: `audioApi.js`는 REST API(업로드, 분석, 레이어 분리, 블렌드 등) 전용입니다. 악기·이펙트·재생 타이밍은 클라이언트 내 **Tone.js**로 처리하며, REST 엔드포인트를 거치지 않습니다.
- **Tone.js 초기화**: 브라우저 정책상 오디오 컨텍스트는 사용자 제스처(클릭·터치) 이후에 활성화됩니다. Studio 페이지 마운트 시 `instrumentManager.initialize()`를 호출하며, 사용자가 Studio에 진입한 뒤 악기·Transport 사용이 가능합니다.
- **전역 타이밍**: `Tone.Transport`가 마스터 클록입니다. BPM·재생/정지는 `useTransport` 훅과 `useProjectStore`의 `bpm`, `isPlaying`과 연동합니다. Toolbar에서 Play/Stop·BPM 입력 시 Transport가 동기됩니다.
- **악기·이펙트**: Studio Instrument Rack(CompositionKeyboard)에서 `instrumentManager`를 통해 Synth, FM, AM, Membrane, Metal, Mono, Duo, Pluck, Sampler 등 악기 타입을 선택·연주합니다. 믹서 Insert FX·Left Fx Panel은 UI만 제공하며, 향후 Tone.js 이펙트 체인과 연동할 수 있습니다.

---

**문서 버전**: 1.3  
**최종 수정일**: 2026-01-31  
**변경 이력**: v1.3 — §9.4 Tone.js 클라이언트 사용 한국어 첨가, 문서 3개 체계 반영(PROJECT_PLAN, FILE_STRUCTURE, API_SPEC). v1.2 — §9 클라이언트 연동 가이드 추가.
