# AI 오디오 믹싱 및 변환 시스템 - 상세 진행 계획 명세서

> **프로젝트명**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **팀 구성**: 2명 (개발자 A: 백엔드/AI, 개발자 B: 프론트엔드)  
> **개발 기간**: 7일

---

## 📋 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [파일 구조 및 작업 분할](#2-파일-구조-및-작업-분할)
3. [Git 충돌 방지 전략](#3-git-충돌-방지-전략)
4. [상세 작업 계획](#4-상세-작업-계획)
5. [코드 수정 가이드라인](#5-코드-수정-가이드라인)
6. [API 스펙 정의](#6-api-스펙-정의)
7. [일정표](#7-일정표)

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

Web-DAW의 신스 피아노 기능과 믹스 컨트롤러 인터페이스를 통합하여, **Demucs 오픈소스 AI 모델**과 **librosa 기반 신호 처리**를 활용한 오디오 레이어 분리 및 자동 블렌드 시스템을 구축합니다.

### 1.2 핵심 기능

- ✅ **신스 피아노**: 가상 피아노 인터페이스 (옥타브 시프트, 메트로놈, 녹음, 네온 글로우 테마)
- ✅ **믹스 컨트롤러 인터페이스**: 2개 유닛, 바이닐 플레이어, 오디오 시각화, FX 버튼, 사운드 다이얼
- ✅ **레이어 분리**: Demucs AI 모델 활용 (Drums, Bass, Vocals, Other 분리)
- ✅ **트랙 분석**: librosa 기반 BPM, Key, Beat Grid 추출
- ✅ **블렌드 시스템**: 두 곡 간 자동 믹싱 및 크로스페이드

### 1.3 기술 스택

- **프론트엔드**: React 19, Tone.js, Zustand
- **백엔드**: Express.js, Python 3.9+
- **AI/오디오 처리**: Demucs, librosa, FFmpeg, PyTorch

---

## 2. 파일 구조 및 작업 분할

### 2.1 전체 파일 구조

```
madcamp04/
├── client/
│   └── src/
│       ├── components/
│       │   ├── CompositionKeyboard/          # 개발자 B 담당
│       │   │   ├── CompositionKeyboard.jsx   # SynthPiano 컴포넌트
│       │   │   └── CompositionKeyboard.module.css  # 네온 글로우 스타일
│       │   └── DJMachine/                    # 개발자 B 담당
│       │       ├── DJMachine.jsx            # MixController 컴포넌트
│       │       ├── DJMachine.module.css      # 스타일
│       │       ├── DeckPanel.jsx             # TrackDeck 컴포넌트
│       │       ├── Turntable.jsx             # VinylPlayer 컴포넌트
│       │       ├── WaveformBar.jsx           # AudioVisualizer 컴포넌트
│       │       ├── EffectPad.jsx             # FxButton 컴포넌트
│       │       └── EQKnob.jsx                # SoundDial 컴포넌트
│       ├── store/
│       │   └── useDJStore.js                 # 개발자 B 담당 (신규)
│       └── api/
│           └── audioApi.js                  # 개발자 B 담당 (신규)
│
├── server/
│   ├── routes/
│   │   └── audio.js                         # 개발자 A 담당 (/api/sound/*)
│   ├── services/                            # 개발자 A 담당
│   │   ├── stem_separation.py              # split_track_layers()
│   │   ├── audio_analysis.py               # analyze_track_properties()
│   │   └── transition.py                   # create_blend_sequence()
│   ├── models/                              # 개발자 A 담당 (신규)
│   │   ├── Track.js                        # 신규
│   │   ├── Stem.js                         # 신규
│   │   └── Transition.js                  # 신규
│   ├── middleware/                          # 개발자 A 담당 (신규)
│   │   └── audioUpload.js                  # 신규
│   └── requirements.txt                    # 개발자 A 담당
│
├── docs/                                     # 공동 작업
│   └── API_SPEC.md                         # 신규 (API 스펙 정의)
│
├── .env.example                             # 개발자 A 담당
├── docker-compose.yml                       # 개발자 A 담당
├── database_schema.dbml                     # 개발자 A 담당
└── PROJECT_PLAN.md                          # 본 문서
```

### 2.2 작업 분할 상세

#### 개발자 A (백엔드/AI 담당) - 약 55% 작업량

**담당 파일:**

- `server/routes/audio.js` - /api/sound/\* 엔드포인트 구현
- `server/services/stem_separation.py` - split_track_layers 구현
- `server/services/audio_analysis.py` - analyze_track_properties 구현
- `server/services/transition.py` - create_blend_sequence 구현
- `server/models/Track.js` - 데이터베이스 모델
- `server/models/Stem.js` - 데이터베이스 모델
- `server/models/Transition.js` - 데이터베이스 모델
- `server/middleware/audioUpload.js` - 파일 업로드 미들웨어
- `server/requirements.txt` - Python 의존성
- `.env.example` - 환경 변수 예제
- `docker-compose.yml` - Docker 설정
- `database_schema.dbml` - 데이터베이스 스키마

**주요 작업:**

1. Demucs 모델 통합 및 최적화
2. librosa 기반 트랙 분석 구현
3. FFmpeg 블렌드 알고리즘 구현
4. Express.js API 엔드포인트 개발
5. 데이터베이스 모델 및 마이그레이션
6. 파일 업로드/저장 로직

#### 개발자 B (프론트엔드 담당) - 약 45% 작업량

**담당 파일:**

- `client/src/components/CompositionKeyboard/CompositionKeyboard.jsx` - SynthPiano 컴포넌트
- `client/src/components/CompositionKeyboard/CompositionKeyboard.module.css` - 네온 글로우 스타일
- `client/src/components/DJMachine/DJMachine.jsx` - MixController 컴포넌트
- `client/src/components/DJMachine/DJMachine.module.css` - 스타일
- `client/src/components/DJMachine/DeckPanel.jsx` - TrackDeck 컴포넌트
- `client/src/components/DJMachine/Turntable.jsx` - VinylPlayer 컴포넌트
- `client/src/components/DJMachine/WaveformBar.jsx` - AudioVisualizer 컴포넌트
- `client/src/components/DJMachine/EffectPad.jsx` - FxButton 컴포넌트
- `client/src/components/DJMachine/EQKnob.jsx` - SoundDial 컴포넌트
- `client/src/store/useDJStore.js` - DJ 상태 관리 (Zustand)
- `client/src/api/audioApi.js` - 오디오 API 클라이언트

**주요 작업:**

1. 신스 피아노 UI 구현 및 통합 (네온 글로우 테마)
2. 믹스 컨트롤러 인터페이스 구현
3. 실시간 오디오 시각화 (보라/오렌지 색상 테마)
4. 상태 관리 (Zustand Store)
5. API 통신 로직
6. 사용자 인터페이스 및 UX 개선

---

## 3. Git 충돌 방지 전략

### 3.1 브랜치 전략

```
main (보호 브랜치)
├── feature/backend-audio-processing    # 개발자 A
└── feature/frontend-dj-interface       # 개발자 B
```

### 3.2 파일 단위 분리

- **개발자 A**: `server/` 디렉토리 전체 담당
- **개발자 B**: `client/src/components/CompositionKeyboard/`, `client/src/components/DJMachine/` 담당
- **공통 파일**: `docs/API_SPEC.md`는 먼저 정의 후 각자 구현

### 3.3 커밋 규칙

```
[A] 백엔드 작업: [기능명] 간단한 설명
[B] 프론트엔드 작업: [기능명] 간단한 설명
[공통] 문서/설정: [파일명] 간단한 설명
```

### 3.4 충돌 가능 파일 관리

- **`package.json`**: 각자 `client/`, `server/` 내부의 `package.json`만 수정
- **`.gitignore`**: 한 명이 담당하여 초기 설정
- **`README.md`**: 마지막에 통합하여 작성

---

## 4. 상세 작업 계획

### 4.1 Day 1 (월요일)

#### 개발자 A

- [ ] Python 환경 설정 (Demucs, torch, librosa 설치)
- [ ] `server/requirements.txt` 작성
- [ ] Demucs 모델 테스트 스크립트 작성
- [ ] `server/services/stem_separation.py` - split_track_layers 구현
- [ ] Express.js 서버 기본 구조 확인
- [ ] `server/routes/audio.js` - /api/sound/\* 라우트 설정
- [ ] `docs/API_SPEC.md` 초안 작성

#### 개발자 B

- [ ] React 프로젝트 구조 확인
- [ ] `CompositionKeyboard.jsx` - SynthPiano 컴포넌트 구현
- [ ] `CompositionKeyboard.module.css` - 네온 글로우 스타일 적용
- [ ] Tone.js 오디오 엔진 통합 확인
- [ ] 기본 UI 레이아웃 구성
- [ ] `docs/API_SPEC.md` 리뷰 및 피드백

### 4.2 Day 2 (화요일)

#### 개발자 A

- [ ] `server/services/stem_separation.py` 완성
- [ ] GPU 지원 추가 (선택적)
- [ ] `server/services/audio_analysis.py` - analyze_track_properties 구현
- [ ] `server/routes/audio.js` - `/api/sound/split` 엔드포인트 구현
- [ ] `server/routes/audio.js` - `/api/sound/inspect` 엔드포인트 구현
- [ ] 데이터베이스 모델 설계

#### 개발자 B

- [ ] `DJMachine.jsx` - MixController 컴포넌트 구현
- [ ] `DeckPanel.jsx` - TrackDeck 레이아웃 구현
- [ ] `Turntable.jsx` - VinylPlayer 애니메이션 구현
- [ ] `WaveformBar.jsx` - AudioVisualizer 기본 구조 구현
- [ ] `client/src/store/useDJStore.js` 상태 관리 스토어 생성
- [ ] 키보드 단축키 매핑 구현

### 4.3 Day 3 (수요일)

#### 개발자 A

- [ ] `server/services/audio_analysis.py` 완성 (identify_musical_key, find_bar_positions)
- [ ] partition_sections 구현
- [ ] `server/services/transition.py` - create_blend_sequence 구현
- [ ] 데이터베이스 마이그레이션 스크립트 작성
- [ ] `server/middleware/audioUpload.js` 파일 업로드 미들웨어 구현

#### 개발자 B

- [ ] `EffectPad.jsx` - FxButton 그리드 구현 (2x3)
- [ ] `EQKnob.jsx` - SoundDial 컴포넌트 구현
- [ ] 믹스 컨트롤러 상태 관리 로직 구현
- [ ] 유닛 간 트랙 전환 로직 구현
- [ ] `client/src/api/audioApi.js` API 클라이언트 기본 구조

### 4.4 Day 4 (목요일)

#### 개발자 A

- [ ] `server/services/transition.py` 완성 (align_tempo_layers)
- [ ] FFmpeg 필터 그래프 구성 완성
- [ ] `server/routes/audio.js` - `/api/sound/blend` 엔드포인트 완성
- [ ] 에러 처리 및 로깅 추가
- [ ] 단위 테스트 작성

#### 개발자 B

- [ ] 신스 피아노 녹음 기능 구현
- [ ] 녹음 파일 업로드 API 연동
- [ ] 믹스 컨트롤러 재생 제어 구현
- [ ] 실시간 오디오 시각화 개선 (보라/오렌지 색상)
- [ ] UI/UX 개선 및 버그 수정

### 4.5 Day 5 (금요일)

#### 개발자 A

- [ ] 전체 시스템 통합 테스트
- [ ] 성능 최적화
- [ ] API 문서 완성
- [ ] Docker 설정 완성
- [ ] 배포 준비

#### 개발자 B

- [ ] 프론트엔드 통합 테스트
- [ ] 사용자 인터페이스 최종 점검
- [ ] 반응형 디자인 개선
- [ ] 브라우저 호환성 테스트
- [ ] 오디오 엔진 최적화

### 4.6 Day 6-7 (주말 - 버퍼/완성)

#### 공동 작업

- [ ] 통합 테스트 및 버그 수정
- [ ] API 통신 테스트
- [ ] 사용자 테스트 및 피드백 반영
- [ ] 최종 문서화
- [ ] 배포 및 데모 준비

---

## 5. 코드 구조 가이드라인

### 5.1 컴포넌트 네이밍

| 파일명                  | 컴포넌트명        | 설명               |
| ----------------------- | ----------------- | ------------------ |
| CompositionKeyboard.jsx | `SynthPiano`      | 신스 피아노 메인   |
| DJMachine.jsx           | `MixController`   | 믹스 컨트롤러 메인 |
| DeckPanel.jsx           | `TrackDeck`       | 트랙 덱 패널       |
| Turntable.jsx           | `VinylPlayer`     | 바이닐 플레이어    |
| WaveformBar.jsx         | `AudioVisualizer` | 오디오 시각화      |
| EffectPad.jsx           | `FxButton`        | FX 버튼            |
| EQKnob.jsx              | `SoundDial`       | 사운드 다이얼      |

### 5.2 Python 함수 네이밍

| 파일               | 주요 함수                                                                                              |
| ------------------ | ------------------------------------------------------------------------------------------------------ |
| stem_separation.py | `split_track_layers()`, `split_layers_cpu()`, `split_layers_gpu()`                                     |
| audio_analysis.py  | `analyze_track_properties()`, `identify_musical_key()`, `find_bar_positions()`, `partition_sections()` |
| transition.py      | `create_blend_sequence()`, `align_tempo_layers()`                                                      |

### 5.3 색상 팔레트

| 요소          | 색상                              |
| ------------- | --------------------------------- |
| Unit 1 메인   | 보라색 `#b066ff`                  |
| Unit 2 메인   | 오렌지색 `#ff9f47`                |
| CUE 마커      | 노란색 `#ffcc00`                  |
| 피아노 글로우 | 보라색 `rgba(176, 102, 255, 0.6)` |

---

## 6. API 스펙 정의

### 6.1 사운드 업로드 및 분석

#### POST /api/sound/upload

**요청:**

```json
{
  "file": "File (multipart/form-data)",
  "title": "string",
  "artist": "string"
}
```

**응답:**

```json
{
  "success": true,
  "trackId": 123,
  "analysis": {
    "bpm": 128.5,
    "key": "A Minor",
    "camelot": "8A",
    "beats": [],
    "downbeats": []
  },
  "message": "파일 업로드 및 분석 완료"
}
```

#### POST /api/sound/split

**요청:**

```json
{
  "trackId": 123
}
```

**응답:**

```json
{
  "success": true,
  "layers": {
    "drums": "string (파일 경로)",
    "bass": "string",
    "vocals": "string",
    "other": "string"
  },
  "message": "레이어 분리 완료"
}
```

#### POST /api/sound/inspect

**요청:**

```json
{
  "trackId": 123
}
```

**응답:**

```json
{
  "success": true,
  "analysis": {
    "bpm": 128.5,
    "key": "A Minor",
    "camelot": "8A",
    "beats": [],
    "downbeats": [],
    "segments": []
  }
}
```

### 6.2 블렌드

#### POST /api/sound/blend

**요청:**

```json
{
  "sourceId": 123,
  "targetId": 456,
  "blendPoint": 120.5
}
```

**응답:**

```json
{
  "success": true,
  "blendId": 789,
  "outputPath": "string",
  "duration": 180.5,
  "message": "블렌드 시퀀스 생성 완료"
}
```

---

## 7. 일정표

### Week 1

| 날짜    | 개발자 A                                   | 개발자 B                     | 공동 작업           |
| ------- | ------------------------------------------ | ---------------------------- | ------------------- |
| Day 1   | Python 환경 설정, split_track_layers 시작  | SynthPiano 구현 시작         | API 스펙 정의       |
| Day 2   | 레이어 분리 완성, analyze_track_properties | MixController/TrackDeck 구현 | -                   |
| Day 3   | 트랙 분석 완성, create_blend_sequence 시작 | FxButton, SoundDial 구현     | -                   |
| Day 4   | 블렌드 완성, API 엔드포인트 완성           | 녹음 기능, AudioVisualizer   | -                   |
| Day 5   | 통합 테스트, 성능 최적화                   | UI/UX 개선, 브라우저 호환성  | -                   |
| Day 6-7 | 버퍼/완성                                  | 버퍼/완성                    | 통합 테스트, 문서화 |

---

## 8. 체크리스트

### 개발자 A 체크리스트

- [x] Python 환경 설정 완료
- [x] Demucs 모델 통합 완료
- [x] 레이어 분리 API 동작 확인
- [x] 트랙 분석 API 동작 확인
- [x] 블렌드 API 동작 확인
- [ ] 데이터베이스 모델 생성 완료
- [ ] 파일 업로드 기능 동작 확인
- [x] 에러 처리 구현 완료
- [ ] 단위 테스트 작성 완료
- [x] API 문서 작성 완료

### 개발자 B 체크리스트

- [x] SynthPiano 컴포넌트 완성 (네온 글로우 테마)
- [x] MixController 메인 컴포넌트 완성
- [x] TrackDeck 컴포넌트 완성
- [x] VinylPlayer 애니메이션 구현 완료
- [x] AudioVisualizer 시각화 구현 완료 (보라/오렌지 색상)
- [x] FxButton 그리드 구현 완료 (2x3)
- [x] SoundDial 컴포넌트 구현 완료
- [ ] Zustand Store 구현 완료
- [ ] API 클라이언트 구현 완료
- [ ] 키보드 단축키 매핑 완료
- [ ] 녹음 기능 구현 완료
- [ ] UI/UX 개선 완료

### 공동 체크리스트

- [x] API 스펙 문서 완성
- [ ] 프론트엔드-백엔드 통합 테스트 완료
- [ ] 전체 워크플로우 테스트 완료
- [ ] 버그 수정 완료
- [ ] 문서화 완료
- [ ] 배포 준비 완료

---

## 9. 참고 자료

### 9.1 라이브러리 문서

- Demucs: https://github.com/facebookresearch/demucs
- librosa: https://librosa.org/doc/latest/index.html
- Tone.js: https://tonejs.github.io/
- FFmpeg: https://ffmpeg.org/documentation.html

---

**문서 버전**: 1.1  
**최종 수정일**: 2026-01-29  
**작성자**: Development Team
