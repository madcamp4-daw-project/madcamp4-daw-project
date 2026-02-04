# 파일 구조 명세서

> **프로젝트**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **버전**: 1.5  
> **기준 문서**: [PROJECT_PLAN.md](./PROJECT_PLAN.md), [API_SPEC.md](./API_SPEC.md) — 본 프로젝트 공식 문서는 PROJECT_PLAN.md, FILE_STRUCTURE.md, API_SPEC.md 3개입니다.

---

## 📁 전체 디렉토리 구조

```
madcamp04/
├── client/                          # 프론트엔드 (React) — 개발자 B 담당
│   ├── src/
│   │   ├── components/
│   │   │   ├── Studio/                 # DAW 메인 컨테이너 (Sonar 스타일 단일 레이아웃)
│   │   │   │   ├── AudioEngine/        # Tone.Part/Sequence·플레이리스트 스케줄링
│   │   │   │   │   └── AudioEngine.jsx
│   │   │   │   ├── Toolbar/            # 상단 툴바 (재생/BPM)
│   │   │   │   │   ├── Toolbar.jsx
│   │   │   │   │   └── Toolbar.module.css
│   │   │   │   ├── Browser/            # 파일/샘플 + Audio Fx 브라우저
│   │   │   │   │   ├── FileBrowser.jsx
│   │   │   │   │   ├── AudioFxBrowser.jsx
│   │   │   │   │   ├── AudioFxBrowser.module.css
│   │   │   │   │   ├── Browser.jsx
│   │   │   │   │   └── Browser.module.css
│   │   │   │   ├── LeftFxPanel/        # 좌측 Fx + EQ 패널 (Sonar 스타일)
│   │   │   │   │   ├── LeftFxPanel.jsx
│   │   │   │   │   └── LeftFxPanel.module.css
│   │   │   │   ├── ChannelRack/        # 채널 랙
│   │   │   │   │   ├── ChannelRack.jsx
│   │   │   │   │   ├── StepSequencer.jsx
│   │   │   │   │   └── ChannelRack.module.css
│   │   │   │   ├── PianoRoll/          # 피아노 롤
│   │   │   │   │   ├── PianoRoll.jsx
│   │   │   │   │   └── PianoRoll.module.css
│   │   │   │   ├── Playlist/           # 플레이리스트
│   │   │   │   │   ├── Playlist.jsx
│   │   │   │   │   └── Playlist.module.css
│   │   │   │   └── Mixer/              # 믹서
│   │   │   │       ├── Mixer.jsx
│   │   │   │       └── Mixer.module.css
│   │   │   ├── CompositionKeyboard/    # Studio Instrument Rack (신스 피아노, embedded 모드)
│   │   │   │   ├── CompositionKeyboard.jsx
│   │   │   │   └── CompositionKeyboard.module.css
│   │   │   ├── Layout/                 # 앱 레이아웃·네비게이션 (개발자 B)
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   └── AppLayout.module.css
│   │   │   └── common/                 # 에러·로딩 UI (개발자 B)
│   │   │       ├── ErrorBoundary.jsx
│   │   │       ├── LoadingSpinner.jsx
│   │   │       └── common.module.css
│   │   ├── pages/
│   │   │   ├── MainPage.jsx            # 랜딩 페이지
│   │   │   ├── StudioPage.jsx          # 메인 DAW 페이지
│   │   │   ├── DevNavPage.jsx          # 개발용 네비게이션
│   │   │   ├── StudioPage.module.css
│   │   │   ├── MainPage.module.css
│   │   │   ├── DevNavPage.module.css
│   │   │   └── pages.module.css
│   │   ├── hooks/                     # 커스텀 훅 (개발자 B)
│   │   │   ├── useTransport.js         # Tone.Transport 제어 (재생/정지/BPM)
│   │   │   └── useUploadProgress.js    # 업로드 진행률
│   │   ├── utils/                     # 유틸리티 함수 (개발자 B)
│   │   │   └── instrumentManager.js    # Tone.js 기반 악기 관리자
│   │   ├── store/
│   │   │   └── useProjectStore.js      # 프로젝트/전역 상태 (Zustand)
│   │   └── api/
│   │       └── audioApi.js             # 오디오 API 클라이언트
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # 백엔드 (Express.js + Python) — 개발자 A 담당
│   ├── routes/
│   │   └── audio.js                 # 사운드 처리 API 라우트 (/api/sound/*)
│   ├── services/                    # Python 오디오 처리 서비스
│   │   ├── stem_separation.py      # split_track_layers() - 레이어 분리
│   │   ├── audio_analysis.py       # analyze_track_properties() - 트랙 분석
│   │   └── transition.py            # create_blend_sequence() - 블렌드 생성
│   ├── models/                      # 데이터베이스 모델 (Sequelize)
│   │   ├── Track.js
│   │   ├── Stem.js
│   │   └── Transition.js
│   ├── middleware/
│   │   └── audioUpload.js          # 파일 업로드 미들웨어
│   ├── uploads/                     # 업로드된 파일 저장소
│   │   ├── temp/                    # 임시 파일
│   │   └── tracks/                  # 트랙 파일
│   ├── output/                      # 처리 결과 파일
│   │   ├── layers/                  # 분리된 레이어 파일
│   │   ├── aligned_layers/          # 템포 정렬된 레이어 파일
│   │   └── blends/                  # 블렌드 시퀀스 파일
│   ├── requirements.txt             # Python 의존성
│   ├── package.json
│   └── server.js                    # Express 서버 진입점
│
├── docs/                            # 문서 (공식 문서 3개 + 보조 명세)
│   ├── PROJECT_PLAN.md              # 상세 진행 계획·Tone.js 통합 계획
│   ├── FILE_STRUCTURE.md            # 본 문서 (파일 구조 명세)
│   ├── API_SPEC.md                  # API 명세·클라이언트 연동 가이드
│   └── SONAR_STYLE_DAW_SPEC.md      # Sonar 스타일 DAW UI/구현·Figma·v0 명세 (보조)
│
├── .env.example                     # 환경 변수 예제
├── .gitignore                       # Git 제외 파일
├── .dockerignore                    # Docker 제외 파일
├── docker-compose.yml               # Docker Compose 설정
├── database_schema.dbml             # 데이터베이스 스키마
├── package.json                     # 루트 패키지 설정
├── PROJECT_PLAN.md                  # 상세 진행 계획 명세서
└── README.md                        # 프로젝트 README
```

---

## 📄 주요 파일 설명

### 프론트엔드 파일

#### `client/src/components/CompositionKeyboard/CompositionKeyboard.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `SynthPiano`
- **설명**: Studio Instrument Rack용 신스 피아노 (embedded 모드로 StudioPage 하단에 통합)
- **주요 기능**:
  - 가상 피아노 키보드 렌더링, 옥타브 시프트 (-2 ~ +2)
  - 메트로놈 통합, 녹음(useUploadProgress·uploadPianoRecord API)
  - 악기 타입 선택( Synth, FM, AM, Membrane, Metal, Mono, Duo, Pluck, Piano 등) — instrumentManager 연동
  - embedded/오버레이 모드 전환 (Studio에서는 embedded=true)

#### `client/src/components/Studio/ChannelRack/ChannelRack.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `ChannelRack`
- **설명**: 스텝 시퀀서 및 채널 관리
- **주요 기능**: 16-step 비트 생성, 악기 채널 추가/삭제, 볼륨/팬 조절

#### `client/src/components/Studio/PianoRoll/PianoRoll.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `PianoRoll`
- **설명**: 멜로디 작곡 인터페이스
- **주요 기능**: 노트 그리드 편곡, 노트 길이/피치 조절, 벨로시티 제어

#### `client/src/components/Studio/Playlist/Playlist.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `Playlist`
- **설명**: 트랙 편곡 뷰
- **주요 기능**: 패턴 클립 배치, 오디오 클립 배치, 타임라인 편집

#### `client/src/components/Studio/Mixer/Mixer.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `Mixer`
- **설명**: 오디오 믹싱 콘솔
- **주요 기능**: 페이더 제어, Insert Effect 슬롯, dB 미터링

#### `client/src/store/useProjectStore.js`

- **담당자**: 개발자 B
- **설명**: 프로젝트 전체 상태 관리 (패턴, 트랙, 노트)
- **주요 상태**: patterns, playlist, mixerChannels

#### `client/src/components/Layout/AppLayout.jsx`

- **담당자**: 개발자 B
- **설명**: 앱 레이아웃·네비게이션 (React Router와 연동)
- **주요 기능**: 앱 레이아웃(Outlet), 공통 스타일

#### `client/src/components/common/ErrorBoundary.jsx`, `LoadingSpinner.jsx`

- **담당자**: 개발자 B
- **설명**: 에러 바운더리, 로딩/스켈레톤 UI (API 대기·업로드·분석·블렌드 화면 등)

#### `client/src/pages/StudioPage.jsx`

- **담당자**: 개발자 B
- **설명**: 메인 DAW 페이지 (Sonar 스타일 단일 레이아웃). Instrument Rack(신스 피아노) 포함.

#### `client/src/hooks/useTransport.js`

- **담당자**: 개발자 B
- **설명**: Tone.Transport 제어 (재생, 정지, BPM)

#### `client/src/api/audioApi.js`

- **담당자**: 개발자 B
- **설명**: 오디오 API 클라이언트 (에러 핸들링·재시도 포함)
- **주요 함수**:
  - `uploadSound()`: 범용 오디오 파일 업로드 (POST /api/sound/upload)
  - `uploadPianoRecord()`: 피아노 전용 녹음 저장 (POST /api/piano/record) - notes 배열 + audioBlob
  - `splitLayers()`: 레이어 분리 요청
  - `inspectSound()`: 오디오 분석 요청
  - `createBlend()`: 블렌드 생성 요청

### Tone.js 관련 구조 (한국어 요약)

- **`client/src/utils/instrumentManager.js`**: Tone.js 기반 악기 관리자. 악기 타입별 Factory(Synth, FMSynth, AMSynth, MembraneSynth, MetalSynth, MonoSynth, DuoSynth, PluckSynth, Sampler 등)로 인스턴스 생성·교체. `initialize()`, `setInstrument(type)`, `triggerAttack`/`triggerRelease` 등 제공. Studio 페이지 마운트 시 `instrumentManager.initialize()` 호출.
- **`client/src/components/CompositionKeyboard/CompositionKeyboard.jsx`**: Instrument Rack UI. `embedded={true}`일 때 Studio 하단 섹션으로 배치, `instrumentManager`와 연동하여 실시간 연주·녹음.
- **`client/src/hooks/useTransport.js`**: `Tone.Transport` 제어(재생/정지, BPM). useProjectStore의 `isPlaying`, `bpm`과 연동.
- **`client/src/components/Studio/AudioEngine/AudioEngine.jsx`**: 플레이리스트 클립에 따라 `Tone.Transport.schedule()`로 패턴 재생 스케줄링. 채널별 Tone.Synth/Player 인스턴스 관리, Channel Rack 스텝·Piano Roll 노트를 Tone.Part/Sequence로 재생. (렌더는 `return null`.)

---

### 백엔드 파일

#### `server/routes/audio.js`

- **담당자**: 개발자 A
- **설명**: 사운드 처리 API 라우트
- **주요 엔드포인트**:
  - `POST /api/sound/upload`: 파일 업로드 및 분석
  - `POST /api/sound/split`: 레이어 분리 실행
  - `POST /api/sound/inspect`: 오디오 분석 재실행
  - `POST /api/sound/blend`: 블렌드 시퀀스 생성

#### `server/services/stem_separation.py`

- **담당자**: 개발자 A
- **설명**: Demucs AI 모델을 활용한 레이어 분리
- **주요 함수**:
  - `split_track_layers()`: 레이어 분리 메인 함수
  - `split_layers_cpu()`: CPU 전용 버전
  - `split_layers_gpu()`: GPU 사용 버전

#### `server/services/audio_analysis.py`

- **담당자**: 개발자 A
- **설명**: librosa 기반 오디오 분석
- **주요 함수**:
  - `analyze_track_properties()`: 트랙 속성 분석
  - `identify_musical_key()`: 조성 식별 및 Camelot Wheel 매핑
  - `find_bar_positions()`: 바 위치 검출
  - `partition_sections()`: 섹션 분할

#### `server/services/transition.py`

- **담당자**: 개발자 A
- **설명**: 두 곡 간 블렌드 시퀀스 생성 (Bass Swap 기법)
- **주요 함수**:
  - `create_blend_sequence()`: 블렌드 생성 메인 함수
  - `align_tempo_layers()`: 템포 정렬

#### `server/models/Track.js`

- **담당자**: 개발자 A
- **설명**: 트랙 데이터베이스 모델 (Sequelize)
- **주요 필드**:
  - id, userId, title, artist
  - originalFilePath, bpm, key, camelot
  - beats, downbeats, segments (JSON)

#### `server/models/Stem.js`

- **담당자**: 개발자 A
- **설명**: 레이어 파일 데이터베이스 모델
- **주요 필드**:
  - id, trackId, type (drums/bass/vocals/other)
  - filePath, createdAt

#### `server/models/Transition.js`

- **담당자**: 개발자 A
- **설명**: 블렌드 데이터베이스 모델
- **주요 필드**:
  - id, userId, trackAId, trackBId
  - blendPoint, outputFilePath, createdAt

#### `server/middleware/audioUpload.js`

- **담당자**: 개발자 A
- **설명**: 파일 업로드 미들웨어
- **주요 기능**:
  - Multer 설정
  - 파일 형식 검증
  - 파일 크기 제한

---

### 설정 파일

#### `server/requirements.txt`

- **담당자**: 개발자 A
- **설명**: Python 의존성 목록
- **주요 패키지**:
  - demucs>=4.0.0
  - torch>=2.0.0
  - librosa>=0.10.0
  - numpy>=1.24.0
  - scipy>=1.10.0
  - soundfile>=0.12.0
  - ffmpeg-python>=0.2.0

#### `docker-compose.yml`

- **담당자**: 개발자 A
- **설명**: Docker Compose 설정
- **주요 서비스**:
  - mysql: MySQL 데이터베이스
  - server: Express.js 백엔드 서버
  - client: React 프론트엔드

#### `.env.example`

- **담당자**: 개발자 A (서버용), 개발자 B (클라이언트용 항목 추가)
- **설명**: 환경 변수 예제 파일 (PROJECT_PLAN 기준)
- **서버 변수 (A)**: DB_USERNAME, DB_PASSWORD, DB_NAME, SESSION_SECRET, PORT 등
- **클라이언트 변수 (B)**: VITE_API_BASE_URL 등 Vite/React용 예시

---

### 문서 파일 (공식 문서 3개)

본 프로젝트 공식 문서는 **PROJECT_PLAN.md**, **FILE_STRUCTURE.md**, **API_SPEC.md** 3개입니다. (기존 TONEJS_INTEGRATION_PLAN.md 내용은 위 3개 문서에 한국어로 통합됨.) 보조 명세 **SONAR_STYLE_DAW_SPEC.md**는 Sonar 스타일 DAW UI/구현·Figma·v0 프롬프트·필요 기능 체크리스트를 담는다.

#### `docs/PROJECT_PLAN.md`

- **담당자**: 공동 작업
- **설명**: 상세 진행 계획 명세서·Tone.js 통합 계획 (§8)
- **주요 내용**: 프로젝트 개요, 파일 구조·작업 분할, Git 전략, 상세 작업 계획, 코드 가이드라인, API 스펙 요약, 일정표, **Tone.js 통합 계획(악기·이펙트·Transport·시퀀싱·로드맵)**, 체크리스트, 참고 자료

#### `docs/FILE_STRUCTURE.md`

- **담당자**: 공동 작업
- **설명**: 파일 구조 명세서 (본 문서)
- **주요 내용**: 전체 디렉터리 구조, 주요 파일 설명, Tone.js 관련 구조, 의존성, 생성 순서

#### `docs/API_SPEC.md`

- **담당자**: 개발자 A (서버 스펙), 개발자 B (클라이언트 연동 가이드·§9 보완)
- **설명**: API 명세서·클라이언트 연동 가이드
- **주요 내용**: Base URL·인증, 사운드/레이어/블렌드/프로젝트/샘플 API, 에러 처리, **클라이언트 연동 가이드(§9)·Tone.js 클라이언트 사용(§9.4)**

---

## 🔄 파일 간 의존성

### 프론트엔드 의존성

```
AppLayout.jsx
  └── StudioPage.jsx
      ├── AudioEngine (Tone.Part/Sequence 스케줄링)
      ├── Toolbar, LeftFxPanel, Browser (FileBrowser, AudioFxBrowser)
      ├── Playlist, ChannelRack (centerColumn)
      ├── Mixer (consoleSection), PianoRoll (pianoRollSection)
      └── CompositionKeyboard (instrumentRackSection, embedded)
```

### 백엔드 의존성

```
audio.js (Express Router - /api/sound/*)
  └── audioUpload.js (Multer Middleware)
  └── stem_separation.py (split_track_layers)
  └── audio_analysis.py (analyze_track_properties)
  └── transition.py (create_blend_sequence)
  └── Track.js, Stem.js, Transition.js (Models)
```

---

## 📝 파일 생성 순서

### 개발자 A (백엔드)

1. `server/requirements.txt` 작성
2. `server/services/stem_separation.py` - split_track_layers 구현
3. `server/services/audio_analysis.py` - analyze_track_properties 구현
4. `server/routes/audio.js` - /api/sound/\* 라우트
5. `server/models/Track.js`, `Stem.js`, `Transition.js` 생성
6. `server/middleware/audioUpload.js` 생성
7. `server/services/transition.py` - create_blend_sequence 구현

### 개발자 B (프론트엔드) — PROJECT_PLAN Day 순서 반영

1. `client/src/components/Layout/AppLayout.jsx`
2. `client/src/pages/StudioPage.jsx`
3. `client/src/components/Studio/Toolbar`, `Browser`
4. `client/src/components/Studio/ChannelRack`
5. `client/src/components/Studio/PianoRoll`
6. `client/src/components/Studio/Playlist`, `Mixer`

---

**문서 버전**: 1.5  
**최종 수정일**: 2026-01-31  
**변경 이력**: v1.5 — SONAR_STYLE_DAW_SPEC.md 보조 명세 추가(디렉터리 트리·문서 파일 섹션). v1.4 — 문서 3개 체계 명시(PROJECT_PLAN, FILE_STRUCTURE, API_SPEC), 디렉터리 트리 현재 구조 반영(AudioEngine, CompositionKeyboard, MainPage/DevNavPage), Tone.js 관련 구조 한국어 첨가, TONEJS_INTEGRATION_PLAN 삭제 반영. v1.3 — DJ 제거, Studio Sonar 스타일 단일 레이아웃.
