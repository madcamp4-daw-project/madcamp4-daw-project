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
8. [Tone.js 통합 계획](#8-tonejs-통합-계획)
9. [체크리스트](#9-체크리스트)
10. [참고 자료](#10-참고-자료)

> **문서 체계**: 본 프로젝트 공식 문서는 **PROJECT_PLAN.md**, **FILE_STRUCTURE.md**, **API_SPEC.md** 3개입니다.

---

## 1. 프로젝트 개요

### 1.1 프로젝트 목적

Web-DAW의 신스 피아노 기능과 믹스 컨트롤러 인터페이스를 통합하여, **Demucs 오픈소스 AI 모델**과 **librosa 기반 신호 처리**를 활용한 오디오 레이어 분리 및 자동 블렌드 시스템을 구축합니다.

### 1.2 핵심 기능

- ✅ **Channel Rack**: 스텝 시퀀서 기반의 패턴 제작 (드럼/루프)
- ✅ **Piano Roll**: 멜로디 작곡 및 정교한 노트 편집 (미디 노트 입력)
- ✅ **Playlist**: 패턴 및 오디오 클립 편곡 (타임라인)
- ✅ **Mixer**: 채널별 믹싱 및 FX 체인 (Insert Effects)
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
│       │   ├── Studio/                       # 개발자 B 담당 (NEW - DAW 메인)
│       │   │   ├── Toolbar/                  # 상단 툴바 (재생/BPM)
│       │   │   ├── Browser/                  # 좌측 탐색기
│       │   │   ├── ChannelRack/              # 스텝 시퀀서
│       │   │   ├── PianoRoll/                # 피아노 롤
│       │   │   ├── Playlist/                 # 타임라인 편곡
│       │   │   └── Mixer/                    # 믹서 콘솔
│       │   ├── Layout/                       # 개발자 B 담당 (신규)
│       │   │   ├── AppLayout.jsx             # 앱 레이아웃·네비게이션
│       │   │   └── AppLayout.module.css
│       │   └── common/                       # 개발자 B 담당 (신규)
│       │       ├── ErrorBoundary.jsx         # 에러 바운더리
│       │       ├── LoadingSpinner.jsx        # 로딩/스켈레톤 UI
│       │       └── common.module.css
│       ├── pages/                            # 개발자 B 담당 (신규)
│       │   ├── StudioPage.jsx                # 메인 DAW 페이지
│       │   ├── pages.module.css
│       ├── hooks/                            # 개발자 B 담당 (신규)
│       │   ├── useTransport.js               # Tone.Transport 제어
│       │   └── useUploadProgress.js          # 업로드 진행률 훅
│       ├── store/
│       │   └── useProjectStore.js             # 프로젝트/전역 상태 (Zustand)
│       └── api/
│           └── audioApi.js                   # 개발자 B 담당 (신규)
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
├── .env.example                             # A 서버 / B 클라이언트 항목
├── docker-compose.yml                       # 개발자 A 담당
├── database_schema.dbml                     # 개발자 A (B는 API 연동 리뷰)
└── PROJECT_PLAN.md                          # 본 문서
```

### 2.2 작업 분할 상세

#### 개발자 A (백엔드/AI 담당) - 약 45% 작업량

**담당 파일:**

- `server/routes/audio.js` - /api/sound/\* 엔드포인트 구현
- `server/services/stem_separation.py` - split_track_layers 구현
- `server/services/audio_analysis.py` - analyze_track_properties 구현
- `server/services/transition.py` - create_blend_sequence 구현
- `server/models/Track.js`, `Stem.js`, `Transition.js` - 데이터베이스 모델
- `server/middleware/audioUpload.js` - 파일 업로드 미들웨어
- `server/requirements.txt` - Python 의존성
- `docker-compose.yml` - Docker 설정
- `database_schema.dbml` - 데이터베이스 스키마 (A 작성, B는 API 연동 관점 리뷰)
- `.env.example` - 서버용 환경 변수 예제 (클라이언트 env 예시는 B 추가)

**주요 작업:**

1. Demucs 모델 통합 및 최적화
2. librosa 기반 트랙 분석 구현
3. FFmpeg 블렌드 알고리즘 구현
4. Express.js API 엔드포인트 개발
5. 데이터베이스 모델 및 마이그레이션
6. 파일 업로드/저장 로직  
   (단위 테스트·API 문서 완성은 Day 5~6 또는 공동)

#### 개발자 B (프론트엔드 담당) - 약 55% 작업량

**담당 파일:**

- `client/src/components/Studio/` - Studio 메인 및 서브 모듈 (Toolbar, Browser, ChannelRack, PianoRoll, Playlist, Mixer)
- `client/src/components/Layout/` - AppLayout (앱 레이아웃·네비게이션)
- `client/src/components/common/` - ErrorBoundary, LoadingSpinner (에러·로딩 UI)
- `client/src/pages/` - StudioPage (단일 페이지 애플리케이션 구조)
- `client/src/hooks/` - useTransport, useUploadProgress (재생·업로드 훅)
- `client/src/store/useProjectStore.js` - 프로젝트/전역 상태 (Zustand)
- `client/src/api/audioApi.js` - 오디오 API 클라이언트
- `docs/API_SPEC.md` - 클라이언트 연동 가이드·에러 코드 정리 섹션 (A 초안 후 B 보완)
- `.env.example` - 클라이언트(Vite/React) env 예시 항목 추가

**주요 작업:**

1. Studio 레이아웃 및 윈도우 시스템 구현
2. Channel Rack (스텝 시퀀서) 및 악기 연동
3. Piano Roll (노트 에디터) 및 재생 로직
4. Playlist (트랙/클립 배치) 및 믹서 연동
5. 에러 바운더리·로딩/스켈레톤 UI·API 에러 핸들링
6. 상태 관리 (Zustand) + 커스텀 훅(재생·업로드 진행률)
7. API 통신·재시도·오프라인 대응
8. 반응형·접근성(a11y)·UI/UX 개선

---

## 3. Git 충돌 방지 전략

### 3.1 브랜치 전략

```
main (보호 브랜치)
├── feature/backend-audio-processing    # 개발자 A
└── feature/frontend-studio             # 개발자 B (Studio 단일 레이아웃)
```

### 3.2 파일 단위 분리

- **개발자 A**: `server/` 디렉토리 전체 담당
- **개발자 B**: `client/src/components/`(Studio, CompositionKeyboard, Layout, common), `client/src/pages/`, `client/src/hooks/`, `client/src/store/`, `client/src/api/` 담당
- **공통 파일**: `docs/API_SPEC.md`(A 초안·서버 스펙, B 클라이언트 연동 가이드 보완), `.env.example`(A 서버 / B 클라이언트 항목)

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
- [ ] `AppLayout.jsx` - StudioLayout 골격 구현
- [ ] `StudioPage.jsx` - 메인 페이지 생성
- [ ] `components/Studio/Toolbar` - 재생/BPM 제어바 구현
- [ ] `components/Studio/Browser` - 파일 브라우저 UI 구현
- [ ] `Tone.js` 엔진 초기화 및 Transport 설정 확인
- [ ] `ErrorBoundary.jsx`, `LoadingSpinner.jsx` - 공통 UI 컴포넌트 추가
- [ ] `docs/API_SPEC.md` 리뷰 및 클라이언트 연동 관점 피드백

### 4.2 Day 2 (화요일)

#### 개발자 A

- [ ] `server/services/stem_separation.py` 완성
- [ ] GPU 지원 추가 (선택적)
- [ ] `server/services/audio_analysis.py` - analyze_track_properties 구현
- [ ] `server/routes/audio.js` - `/api/sound/split` 엔드포인트 구현
- [ ] `server/routes/audio.js` - `/api/sound/inspect` 엔드포인트 구현
- [ ] 데이터베이스 모델 설계

#### 개발자 B

- [ ] `components/Studio/ChannelRack` - 스텝 시퀀서 UI (16 steps)
- [ ] `components/Studio/ChannelRow` - 개별 채널(악기) 행 구현
- [ ] `store/useProjectStore.js` - 패턴/노트 데이터 구조 설계
- [ ] `Tone.Sequence` 연동 테스트 (드럼 루프 재생)
- [ ] InstrumentManager 확장 (Sampler/Synth 동적 로딩)

### 4.3 Day 3 (수요일)

#### 개발자 A

- [ ] `server/services/audio_analysis.py` 완성 (identify_musical_key, find_bar_positions)
- [ ] partition_sections 구현
- [ ] `server/services/transition.py` - create_blend_sequence 구현
- [ ] 데이터베이스 마이그레이션 스크립트 작성
- [ ] `server/middleware/audioUpload.js` 파일 업로드 미들웨어 구현

#### 개발자 B

- [ ] `components/Studio/PianoRoll` - 그리드 캔버스/SVG 구현
- [ ] 노트 추가/삭제/이동 인터랙션 구현
- [ ] `Tone.Part` 연동 (멜로디 재생)
- [ ] `components/Studio/Playlist` - 타임라인 트랙 UI
- [ ] 패턴 클립 배치 로직 (Drag & Drop)
- [ ] `client/src/api/audioApi.js` API 클라이언트 기본 구조
- [ ] `useUploadProgress.js` - 업로드 진행률 훅 구현
- [ ] API 에러 핸들링·재시도 로직 (audioApi 또는 훅에서)
- [ ] `docs/API_SPEC.md` - 클라이언트 연동 가이드·에러 코드 섹션 보완
- [ ] **[New]** InstrumentManager 확장 (UniversalSynth: FM, AM, Membrane 등 모든 Tone.js 악기 지원)
- [ ] **[New]** Studio 내 Instrument Rack(신스 피아노) 악기 선택 UI 및 동적 파라미터 제어 구현

### 4.4 Day 4 (목요일)

#### 개발자 A

- [ ] `server/services/transition.py` 완성 (align_tempo_layers)
- [ ] FFmpeg 필터 그래프 구성 완성
- [ ] `server/routes/audio.js` - `/api/sound/blend` 엔드포인트 완성
- [ ] 에러 처리 및 로깅 추가
- [ ] 단위 테스트 작성 (선택·여유 시, 또는 Day 6으로 이동)

#### 개발자 B

- [ ] `components/Studio/Mixer` - 믹서 채널 스트립 구현
- [ ] `FxRack` 구현 (Insert Effects 체인)
- [ ] Demucs 분리 결과를 Sampler 채널로 로드하는 기능 연동
- [ ] 실시간 미터링 (Tone.Meter) 시각화
- [ ] 반응형·접근성(a11y) 1차 점검
- [ ] UI/UX 개선 및 버그 수정
- [ ] **[New]** GrainPlayer 도입 (Studio 트랙: Time Stretch / Pitch Shift 지원)
- [ ] **[New]** FX Rack 구현 (체인 가능한 이펙트 시스템: Reverb, Delay, Distortion 등)
- [ ] **[New]** Arpeggiator 구현 (Studio Instrument Rack: Tone.Pattern 활용)

### 4.5 Day 5 (금요일)

#### 개발자 A

- [ ] 전체 시스템 통합 테스트
- [ ] 성능 최적화
- [ ] API 문서(서버 스펙) 완성 (클라이언트 연동 가이드는 B)
- [ ] Docker 설정 완성
- [ ] 배포 준비

#### 개발자 B

- [ ] 프론트엔드 통합 테스트
- [ ] 사용자 인터페이스 최종 점검
- [ ] 반응형 디자인 개선
- [ ] 브라우저 호환성 테스트
- [ ] 오디오 엔진 최적화
- [ ] `.env.example` 클라이언트(Vite/React) env 예시 항목 추가
- [ ] API_SPEC 클라이언트 연동 가이드 최종 정리
- [ ] **[New]** Step Sequencer 구현 (드럼 머신: Tone.Sequence 활용)
- [ ] **[New]** 고급 시각화 구현 (FFT, Meter, Oscilloscope)

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

| 파일명                        | 컴포넌트명     | 설명                 |
| ----------------------------- | -------------- | -------------------- |
| components/Studio/ChannelRack | `ChannelRack`  | 스텝 시퀀서 컨테이너 |
| components/Studio/PianoRoll   | `PianoRoll`    | 멜로디 에디터        |
| components/Studio/Playlist    | `Playlist`     | 편곡 타임라인        |
| components/Studio/Mixer       | `MixerConsole` | 믹싱 콘솔            |
| components/Studio/Browser     | `FileBrowser`  | 샘플 탐색기          |

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

| 날짜    | 개발자 A                                   | 개발자 B                                        | 공동 작업           |
| ------- | ------------------------------------------ | ----------------------------------------------- | ------------------- |
| Day 1   | Python 환경 설정, split_track_layers 시작  | 레이아웃·라우팅, SynthPiano, 공통 UI            | API 스펙 정의       |
| Day 2   | 레이어 분리 완성, analyze_track_properties | 페이지·MixController/TrackDeck, 훅              | -                   |
| Day 3   | 트랙 분석 완성, create_blend_sequence 시작 | FxButton, SoundDial, API 클라이언트·에러 핸들링 | -                   |
| Day 4   | 블렌드 완성, API 엔드포인트 완성           | 녹음·업로드·재생 연동, 로딩 UI, a11y            | -                   |
| Day 5   | 통합 테스트, 성능 최적화, API 서버 문서    | UI/UX·env 예시·API 연동 가이드 정리             | -                   |
| Day 6-7 | 버퍼/완성                                  | 버퍼/완성                                       | 통합 테스트, 문서화 |

---

## 8. Tone.js 통합 계획

Tone.js(악기, 이펙트, Transport, 이벤트)를 AI 오디오 믹싱 시스템에 통합하여 웹 DAW 수준의 기능을 구현합니다.

### 8.1 악기 확장(Studio Instrument Rack)

**동적 악기 엔진**: Studio **Instrument Rack**(CompositionKeyboard)에 "타입" 선택기를 두고, 선택에 따라 Tone.js 인스턴스를 동적으로 교체합니다.

**지원 악기(Tone.Instrument)**:
- **신디사이저**: `Tone.Synth`(기본: Triangle/Sine/Saw/Square), `Tone.AMSynth`(진폭 변조: 벨/메탈릭), `Tone.FMSynth`(주파수 변조: DX7 스타일), `Tone.MembraneSynth`(킥/톰), `Tone.MetalSynth`(심벌/하이햇), `Tone.MonoSynth`(아날로그 베이스/리드), `Tone.PluckSynth`(카플러스-스트롱 현), `Tone.DuoSynth`(이중 보이스)
- **샘플러**: `Tone.Sampler`(실제 피아노/기타/현, 외부 샘플 로드 필요)

**구현 전략**:
- `instrumentManager.js`에 UniversalSynth 래퍼(또는 동적 엔진) 구성
- 악기별 파라미터 매핑: FM은 `harmonicity`, Pluck은 `dampening` 등 → `ParameterKnob` 컴포넌트로 악기 스키마에 따라 동적 렌더
- Factory 패턴: `switch(type) { case 'fm': return new Tone.FMSynth(); ... }`

### 8.2 고급 이펙트 랙(Studio 콘솔 및 Instrument Rack)

여러 이펙트를 체인으로 연결할 수 있도록 합니다.

**지원 이펙트(Tone.Effect)**:
- **다이나믹스**: Compressor, Limiter, Gate
- **공간**: Reverb, JCReverb, Freeverb, PingPongDelay, FeedbackDelay, StereoWidener
- **모듈레이션**: Chorus, Phaser, Flanger, Tremolo, Vibrato, AutoWah, AutoPanner
- **스펙트럴**: BitCrusher, Chebyshev, Distortion, PitchShift, FrequencyShifter
- **EQ**: EQ3(3밴드), Filter(Low/High/Band-pass)

**구현 전략**:
- FX Rack 컴포넌트: "이펙트 추가" 슬롯 목록
- 라우팅: `Source → Effect1 → Effect2 → Destination`
- 사이드체인: 킥 채널 등에 연결한 `Tone.Compressor`로 더킹 효과

### 8.3 Transport 및 타이밍(전역)

`Tone.Transport`를 마스터 클록으로 사용합니다.

- **BPM 동기**: 전역 BPM으로 시퀀서·믹서 FX(예: Delay time "8n") 동기
- **퀀타이즈**: "Snap to Grid" — 연주가 비트에서 살짝 어긋나면 다음 16분음표에서 트리거 (`Transport.nextSubdivision('16n')`)
- **루프**: Loop Start/End 설정

### 8.4 시퀀싱·패턴(FL 스타일 코어)

- **Channel Rack(Tone.Sequence)**: 스텝 시퀀서로 드럼/신스 노트 트리거, 패턴 루프(예: 1마디)
- **Piano Roll(Tone.Part)**: `{ time, note, duration, velocity }` 이벤트 스케줄, Playlist 타임라인과 연동
- **Playlist(Transport 스케줄링)**: `Tone.Transport.schedule()`로 패턴(Part) 시작/종료 시점 배치
- **Arpeggiator(Tone.Pattern)**: 코드 유지 시 음을 순차 재생(Up, Down, Random), UI: Arp On/Off, Speed(4n/8n/16n), Pattern 드롭다운
- **Sampler/브라우저·플레이리스트**: 원샷/루프 샘플 로드, BPM 동기 루프는 `Tone.GrainPlayer`로 타임 스트레칭
- **Step Sequencer(Tone.Sequence)**: 드럼 머신 스타일 그리드로 비트 프로그래밍
- **분석·시각화(Tone.Analyser)**: 파형, FFT(스펙트럼), 미터(dB), 오실로스코프

### 8.5 통합 로드맵(요약)

- **Day 3 (기반·악기)**: 버그 수정(`init` → `initialize`), InstrumentManager를 UniversalSynth 구조로 리팩터, Basic + FM + AM 신스 구현
- **Day 4 (이펙트·샘플링)**: FxRack 컴포넌트 구축, EQ + Delay/Reverb 1개 연결, GrainPlayer 도입(Studio 트랙), Key Shift 노브
- **Day 5 (시퀀서·마무리)**: ChannelRack에 Tone.Sequence 연동, PianoRoll에 Tone.Part 연동

---

## 9. 체크리스트

### 9.1 개발자 A 체크리스트

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

### 9.2 개발자 B 체크리스트

- [ ] AppLayout·라우팅(React Router)·페이지(Synth/Mix) 구성
- [ ] ErrorBoundary·LoadingSpinner 공통 컴포넌트
- [x] SynthPiano 컴포넌트 완성 (네온 글로우 테마)
- [x] MixController 메인 컴포넌트 완성
- [x] TrackDeck 컴포넌트 완성
- [x] VinylPlayer 애니메이션 구현 완료
- [x] AudioVisualizer 시각화 구현 완료 (보라/오렌지 색상)
- [x] FxButton 그리드 구현 완료 (2x3)
- [x] SoundDial 컴포넌트 구현 완료
- [ ] useAudioPlayer·useUploadProgress 훅 구현
- [ ] Zustand Store 구현 완료
- [ ] API 클라이언트·에러 핸들링·재시도 구현 완료
- [ ] API_SPEC 클라이언트 연동 가이드·에러 코드 섹션
- [ ] 키보드 단축키 매핑 완료
- [ ] 녹음 기능 구현 완료
- [ ] 반응형·접근성(a11y)·UI/UX 개선 완료

### 9.3 공동 체크리스트

- [x] API 스펙 문서 완성
- [ ] 프론트엔드-백엔드 통합 테스트 완료
- [ ] 전체 워크플로우 테스트 완료
- [ ] 버그 수정 완료
- [ ] 문서화 완료
- [ ] 배포 준비 완료

---

## 10. 참고 자료

### 10.1 라이브러리 문서

- Demucs: https://github.com/facebookresearch/demucs
- librosa: https://librosa.org/doc/latest/index.html
- Tone.js: https://tonejs.github.io/
- FFmpeg: https://ffmpeg.org/documentation.html

---

**문서 버전**: 1.4  
**최종 수정일**: 2026-01-31  
**작성자**: Development Team  
**변경 이력**: v1.4 — 문서 3개 체계 명시(PROJECT_PLAN, FILE_STRUCTURE, API_SPEC), §8 Tone.js 통합 계획 한국어 첨가, 목차 8·9·10 반영. v1.3 — 실질 작업량 조정(프론트 55% / 백 45%); TONEJS_INTEGRATION_PLAN 내용은 본 문서 §8로 통합됨.
