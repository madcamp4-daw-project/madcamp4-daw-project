## 기술 스택 아키텍처 다이어그램

### 1. 전체 아키텍처 개요 (Client / Server / GPU / 오디오 파이프라인)

```mermaid
flowchart LR
  subgraph clientApp["Client (Next.js / React)"]
    NextApp["Next.js 16 (React 19)"]
    UIStack["Tailwind CSS 4 + Radix UI"]
    AudioUI["Tone.js / WaveSurfer.js UI 레이어"]
    StateLayer["Zustand + Zod + RHF"]
  end

  subgraph backendNode["Server - Node.js API"]
    NodeRuntime["Node.js (CommonJS)"]
    ExpressAPI["Express + CORS + Multer"]
    EnvMgmt["dotenv / nodemon"]
  end

  subgraph backendPython["Python Audio Pipeline"]
    FastAPI["FastAPI + Uvicorn"]
    StemSep["Demucs + Torch (Stem Separation)"]
    BeatBPM["Madmom (Beat/BPM)"]
    AudioAnalysis["Librosa / Numpy / Scipy / SoundFile / Audioread"]
    TimeStretch["PyRubberBand"]
    PyUtils["Pydantic / Httpx / FFmpeg-Python / Numba"]
  end

  subgraph infra["Infra / Deploy"]
    DockerCompose["Docker Compose"]
    ClientSvc["service: client (8080->3000)"]
    ServerGpuSvc["service: server-gpu (18000->3001)"]
    NvidiaGPU["NVIDIA GPU\n(reservations.devices)"]
  end

  NextApp --> UIStack
  NextApp --> AudioUI
  NextApp --> StateLayer

  ClientSvc --> NextApp

  DockerCompose --> ClientSvc
  DockerCompose --> ServerGpuSvc
  ServerGpuSvc --> NodeRuntime
  NodeRuntime --> ExpressAPI
  ExpressAPI --> FastAPI

  FastAPI --> StemSep
  FastAPI --> BeatBPM
  FastAPI --> AudioAnalysis
  FastAPI --> TimeStretch
  FastAPI --> PyUtils

  ServerGpuSvc --> NvidiaGPU
  StemSep --> NvidiaGPU
```

---

### 2. 프론트엔드 상세 (UI / 오디오 / 상태)

```mermaid
flowchart TB
  subgraph feFramework["프레임워크"]
    NextCore["Next.js 16\n(App Router, TS)"]
    ReactCore["React 19"]
  end

  subgraph feUI["스타일 / UI"]
    Tailwind["Tailwind CSS 4\n(tailwindcss, tw-animate-css, tailwindcss-animate)"]
    RadixUI["Radix UI\n(@radix-ui/react-*)"]
    CmdkVaul["CMDK / Vaul"]
    IconsCharts["lucide-react / recharts"]
  end

  subgraph feAudio["오디오 / 음악 레이어"]
    ToneJS["tone 15.x\n(Tone.js 시퀀서/신스)"]
    TunaJS["tunajs\n(이펙트 체인)"]
    WaveSurfer["wavesurfer.js 7.x\n(파형/트랜스포트)"]
    MidiLib["@tonejs/midi\n(MIDI IO)"]
  end

  subgraph feState["상태 / 데이터"]
    ZustandStore["Zustand\n(전역 상태)"]
    ZodSchema["Zod\n(스키마/검증)"]
    RHF["react-hook-form\n+ @hookform/resolvers"]
  end

  subgraph feMisc["기타 FE 유틸"]
    Themes["next-themes"]
    Toasts["sonner"]
    Dates["date-fns"]
    ClassUtils["clsx / class-variance-authority"]
  end

  NextCore --> ReactCore
  ReactCore --> Tailwind
  ReactCore --> RadixUI
  ReactCore --> CmdkVaul
  ReactCore --> IconsCharts

  ReactCore --> ToneJS
  ReactCore --> TunaJS
  ReactCore --> WaveSurfer
  ReactCore --> MidiLib

  ReactCore --> ZustandStore
  ReactCore --> RHF
  RHF --> ZodSchema

  ReactCore --> Themes
  ReactCore --> Toasts
  ReactCore --> Dates
  ReactCore --> ClassUtils
```

---

### 3. 백엔드 상세 (Python 오디오 파이프라인 + Node.js 서버)

```mermaid
flowchart LR
  subgraph nodeServer["Node.js 서버 (server/index.js)"]
    NodeJS["Node.js (CommonJS)"]
    ExpressJS["Express"]
    CorsLib["CORS"]
    MulterLib["Multer (파일 업로드)"]
    DotenvLib["dotenv"]
    NodemonLib["nodemon"]
  end

  subgraph pyApi["Python API 레이어"]
    FastAPI["FastAPI"]
    Uvicorn["Uvicorn[standard]"]
    Multipart["python-multipart"]
  end

  subgraph pyAudioCore["Python 오디오 처리"]
    DemucsTorch["Demucs + Torch\n(Stem Separation)"]
    MadmomCore["Madmom\n(Beat/BPM 분석)"]
    LibrosaStack["Librosa / Numpy / Scipy / SoundFile / Audioread"]
    Rubberband["PyRubberBand\n(Time Stretching)"]
  end

  subgraph pyUtils["Python 유틸/인프라"]
    Pydantic["Pydantic"]
    Httpx["Httpx"]
    FFmpegPy["FFmpeg-Python"]
    Numba["Numba"]
  end

  NodeJS --> ExpressJS
  ExpressJS --> CorsLib
  ExpressJS --> MulterLib
  NodeJS --> DotenvLib
  NodeJS --> NodemonLib

  ExpressJS --> FastAPI
  FastAPI --> Uvicorn
  FastAPI --> Multipart

  FastAPI --> DemucsTorch
  FastAPI --> MadmomCore
  FastAPI --> LibrosaStack
  FastAPI --> Rubberband

  FastAPI --> Pydantic
  FastAPI --> Httpx
  FastAPI --> FFmpegPy
  FastAPI --> Numba
```

---

### 4. 인프라 / Docker Compose / GPU 구성

```mermaid
flowchart TB
  subgraph compose["docker-compose.yml"]
    ClientService["service: client\n(8080:3000)"]
    ServerGpuService["service: server-gpu\n(${BACKEND_PORT:-18000}:${BACKEND_INTERNAL_PORT:-3001})"]
  end

  subgraph clientContainer["Client 컨테이너"]
    NextRuntime["Next.js 16\n(next start)"]
  end

  subgraph serverGpuContainer["Server-GPU 컨테이너"]
    NodeLayer["Node.js + Express"]
    PythonLayer["Python Audio Pipeline\n(FastAPI + Demucs 등)"]
  end

  subgraph gpuHost["호스트 GPU"]
    NvidiaDevice["NVIDIA GPU\n(driver: nvidia, capabilities: [gpu])"]
  end

  ClientService --> clientContainer
  ServerGpuService --> serverGpuContainer

  serverGpuContainer --> NvidiaDevice

  clientContainer -->|"HTTP\n(8080 → 3000)"| ServerGpuService
  ServerGpuService -->|"HTTP\n(18000 → 3001)"| PythonLayer
```

