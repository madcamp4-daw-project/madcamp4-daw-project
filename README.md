# Web DAW Project

이 프로젝트는 Next.js 기반의 프론트엔드와 Python/Node.js 하이브리드 백엔드로 구성된 웹 기반 DAW(Digital Audio Workstation)입니다. Docker를 사용하여 간편하게 실행할 수 있습니다.

## 주요 기능

- **Stem Separation**: Demucs를 활용한 오디오 소스 분리 (Vocals, Drums, Bass, Other).
- **Audio Analysis**: Madmom, BeatNet을 이용한 비트 및 BPM 분석.
- **Transition Mixing**: AI 기반의 이종 곡 간 자동 믹싱.
- **Interactive UI**: 트랙 관리, 파형 시각화, 실시간 오디오 제어.

## 실행 방법 (Docker 활용)

이 프로젝트는 Client와 Server를 포함한 전체 시스템을 Docker Compose로 한 번에 실행할 수 있도록 구성되어 있습니다.

### 사전 요구 사항

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 설치 및 실행

### 설치 및 실행

1. **저장소 클론**

   ```bash
   git clone <repository-url>
   cd madcamp4-daw-project
   ```

2. **Docker Compose 실행**
   프로젝트 루트 디렉토리에서 다음 명령어를 실행합니다.

   ```bash
   docker-compose up --build
   ```

   _참고: Server 이미지 빌드 시 Python 의존성 설치로 인해 최초 실행 시 시간이 소요될 수 있습니다._

3. **접속**
   - **Client (Web App)**: [http://localhost:3000](http://localhost:3000)
   - **Server (API)**: [http://localhost:8000](http://localhost:8000)

## 프로젝트 구조

- **client/**: Next.js 프론트엔드 애플리케이션
- **server/**: Python(Audio Processing) 및 Node.js 백엔드 서버
- **docker-compose.yml**: 전체 서비스 오케스트레이션 설정

## API 연동 정보

Docker Compose 환경에서는 다음과 같이 설정되어 연동됩니다.

- **Stem Separation API**: `http://localhost:8000/api/stems`
- **Transition API**: `http://localhost:8000/api/transition`

## 문제 해결

- **빌드 오류**: Docker Desktop이 실행 중인지 확인하고, 인터넷 연결 상태를 점검하세요.
- **포트 충돌**: 3000번 또는 8000번 포트가 이미 사용 중이라면 `docker-compose.yml`에서 포트 매핑을 수정하세요.
