# 파일 구조 명세서

> **프로젝트**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **버전**: 1.1

---

## 📁 전체 디렉토리 구조

```
madcamp04/
├── client/                          # 프론트엔드 (React)
│   ├── src/
│   │   ├── components/
│   │   │   ├── CompositionKeyboard/    # 신스 피아노 컴포넌트
│   │   │   │   ├── CompositionKeyboard.jsx  # SynthPiano 컴포넌트
│   │   │   │   └── CompositionKeyboard.module.css  # SynthPiano 스타일
│   │   │   └── DJMachine/              # 믹스 컨트롤러 컴포넌트
│   │   │       ├── DJMachine.jsx       # MixController 컴포넌트
│   │   │       ├── DJMachine.module.css
│   │   │       ├── DeckPanel.jsx       # TrackDeck 컴포넌트
│   │   │       ├── Turntable.jsx       # VinylPlayer 컴포넌트
│   │   │       ├── WaveformBar.jsx     # AudioVisualizer 컴포넌트
│   │   │       ├── EffectPad.jsx       # FxButton 컴포넌트
│   │   │       └── EQKnob.jsx          # SoundDial 컴포넌트
│   │   ├── store/
│   │   │   └── useDJStore.js           # DJ 상태 관리 (Zustand)
│   │   └── api/
│   │       └── audioApi.js             # 오디오 API 클라이언트
│   ├── package.json
│   └── vite.config.js
│
├── server/                          # 백엔드 (Express.js + Python)
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
├── docs/                            # 문서
│   ├── API_SPEC.md                 # API 명세서
│   └── FILE_STRUCTURE.md            # 본 문서
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
- **설명**: 신스 피아노 메인 컴포넌트 (네온 글로우 테마)
- **주요 기능**:
  - 가상 피아노 키보드 렌더링
  - 옥타브 시프트 (-2 ~ +2)
  - 메트로놈 통합
  - 녹음 기능
  - 키보드 입력 핸들러
  - 펄스 애니메이션 + 글로우 효과

#### `client/src/components/DJMachine/DJMachine.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `MixController`
- **설명**: 믹스 컨트롤러 메인 컴포넌트
- **주요 기능**:
  - 2개 트랙 유닛 레이아웃 관리
  - 유닛 간 트랙 전환
  - 전체 상태 관리

#### `client/src/components/DJMachine/DeckPanel.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `TrackDeck`
- **설명**: 개별 트랙 덱 패널 컴포넌트
- **주요 기능**:
  - 트랙 메타데이터 표시 (제목, 아티스트, BPM)
  - 바이닐 플레이어 및 FX 버튼 배치
  - 사운드 다이얼 제어
  - **배치**: 다이얼(상단) → 바이닐 → 웨이브폼 → FX → 헤더(하단)

#### `client/src/components/DJMachine/Turntable.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `VinylPlayer`
- **설명**: 바이닐 플레이어 시각화 컴포넌트
- **주요 기능**:
  - 회전 애니메이션
  - 재생/일시정지 버튼
  - 키보드 단축키 표시

#### `client/src/components/DJMachine/WaveformBar.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `AudioVisualizer`
- **설명**: 오디오 시각화 컴포넌트
- **주요 기능**:
  - 실시간 오디오 파형 시각화
  - 유닛별 파형 표시
  - **색상**: 보라색 (#b066ff) / 오렌지색 (#ff9f47)
  - **CUE 마커**: 노란색 (#ffcc00)

#### `client/src/components/DJMachine/EffectPad.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `FxButton`
- **설명**: FX 버튼 컴포넌트
- **주요 기능**:
  - 2x3 그리드 레이아웃
  - Cue, Slicer, Kick, Crush, Flanger 이펙트

#### `client/src/components/DJMachine/EQKnob.jsx`

- **담당자**: 개발자 B
- **컴포넌트명**: `SoundDial`
- **설명**: 사운드 다이얼 컴포넌트
- **주요 기능**:
  - FILTER, MID, BASS 다이얼 제어
  - 실시간 파라미터 조정
  - **색상**: 보라색 / 오렌지색

#### `client/src/store/useDJStore.js`

- **담당자**: 개발자 B
- **설명**: DJ 상태 관리 스토어 (Zustand)
- **주요 상태**:
  - deck1, deck2 상태
  - 믹서 상태
  - 이펙트 상태

#### `client/src/api/audioApi.js`

- **담당자**: 개발자 B
- **설명**: 오디오 API 클라이언트
- **주요 함수**:
  - `uploadSound()`: 오디오 파일 업로드
  - `splitLayers()`: 레이어 분리 요청
  - `inspectSound()`: 오디오 분석 요청
  - `createBlend()`: 블렌드 생성 요청

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

- **담당자**: 개발자 A
- **설명**: 환경 변수 예제 파일
- **주요 변수**:
  - DB_USERNAME, DB_PASSWORD, DB_NAME
  - GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET
  - SESSION_SECRET, PORT

---

### 문서 파일

#### `PROJECT_PLAN.md`

- **담당자**: 공동 작업
- **설명**: 상세 진행 계획 명세서
- **주요 내용**:
  - 프로젝트 개요
  - 파일 구조 및 작업 분할
  - Git 충돌 방지 전략
  - 상세 작업 계획
  - 코드 수정 가이드라인
  - API 스펙 정의
  - 일정표

#### `docs/API_SPEC.md`

- **담당자**: 공동 작업
- **설명**: API 명세서
- **주요 내용**:
  - 기본 정보
  - 인증
  - 사운드 업로드 및 분석 API
  - 레이어 분리 API
  - 블렌드 API
  - 신스 피아노 API
  - 믹스 컨트롤러 API
  - 에러 처리

#### `FILE_STRUCTURE.md`

- **담당자**: 공동 작업
- **설명**: 파일 구조 명세서 (본 문서)

---

## 🔄 파일 간 의존성

### 프론트엔드 의존성

```
CompositionKeyboard.jsx (SynthPiano)
  └── useStore (Zustand)
  └── audioEngine (Tone.js)
  └── audioApi.js

DJMachine.jsx (MixController)
  └── DeckPanel.jsx (TrackDeck)
      └── Turntable.jsx (VinylPlayer)
      └── WaveformBar.jsx (AudioVisualizer)
      └── EffectPad.jsx (FxButton)
      └── EQKnob.jsx (SoundDial)
  └── useDJStore.js
  └── audioApi.js
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

### 개발자 B (프론트엔드)

1. `client/src/components/CompositionKeyboard/CompositionKeyboard.jsx` - SynthPiano 구현
2. `client/src/components/DJMachine/DJMachine.jsx` - MixController 구현
3. `client/src/components/DJMachine/DeckPanel.jsx` - TrackDeck 구현
4. `client/src/components/DJMachine/Turntable.jsx` - VinylPlayer 구현
5. `client/src/components/DJMachine/WaveformBar.jsx` - AudioVisualizer 구현
6. `client/src/components/DJMachine/EffectPad.jsx` - FxButton 구현
7. `client/src/components/DJMachine/EQKnob.jsx` - SoundDial 구현
8. `client/src/store/useDJStore.js` 생성
9. `client/src/api/audioApi.js` 생성

---

**문서 버전**: 1.1  
**최종 수정일**: 2026-01-29
