# API 명세서

> **프로젝트**: AI Audio Mixing & Conversion System  
> **작성일**: 2026-01-29  
> **버전**: 2.1  
> **기준 문서**: [PROJECT_PLAN.md](./PROJECT_PLAN.md) (v1.3) — 본 명세는 계획서 기준으로 유지·보완됩니다.  
> **담당**: 서버 스펙·초안 — 개발자 A / 클라이언트 연동 가이드·에러 코드 정리 — 개발자 B

---

## 목차

1. [기본 정보](#1-기본-정보)
2. [인증](#2-인증)
3. [사운드 업로드 및 분석](#3-사운드-업로드-및-분석)
4. [레이어 분리](#4-레이어-분리)
5. [블렌드 (믹싱)](#5-블렌드-믹싱)
6. [Job 상태 조회](#6-job-상태-조회)
7. [서버 아키텍처](#7-서버-아키텍처)
8. [내부 서비스 모듈](#8-내부-서비스-모듈)
9. [DSP 엔진](#9-dsp-엔진)
10. [에러 처리](#10-에러-처리)
11. [클라이언트 연동 가이드](#11-클라이언트-연동-가이드)

---

## 1. 기본 정보

### Base URL

```
http://localhost:3001/api
```

### 정적 파일 경로

| 리소스        | URL 패턴                                     | 설명                |
| ------------- | -------------------------------------------- | ------------------- |
| 업로드된 트랙 | `/uploads/tracks/{filename}`                 | 원본 오디오 파일    |
| 분리된 레이어 | `/output/htdemucs_ft/{trackName}/{stem}.wav` | Demucs 분리 결과    |
| 블렌드 결과   | `/output/blends/{filename}`                  | 믹싱 결과물         |
| 정렬된 레이어 | `/output/aligned_layers/{filename}`          | BPM 동기화된 레이어 |

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

**설명**: 오디오 파일을 업로드하고 자동으로 분석합니다. 내부적으로 `audio_analysis.py`를 호출하여 BPM, Key, 비트, 다운비트, 구조 분석을 수행합니다.

**요청 형식**: `multipart/form-data`

**요청 파라미터**:
| 파라미터 | 타입 | 필수 | 설명 |
|---------|------|------|------|
| file | File | 예 | 오디오 파일 (MP3, WAV 등) |

**파일 제한**: 최대 100MB

**응답 예시**:

```json
{
  "success": true,
  "trackId": "1738241234.mp3",
  "originalName": "My Song.mp3",
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
      },
      {
        "type": "chorus",
        "start": 48.0,
        "end": 80.0
      }
    ]
  },
  "message": "업로드 및 분석 완료"
}
```

**내부 분석 파이프라인**:

1. `analyze_track_properties()`: BPM, Key 분석
2. `identify_musical_key()`: Krumhansl-Schmuckler 알고리즘 기반 키 감지
3. `find_bar_positions()`: 다운비트(마디 첫 박) 검출
4. `partition_sections()`: 곡 구조 분할 (Intro, Verse, Chorus, Outro)

**에러 응답**:

```json
{
  "success": false,
  "error": "파일이 없습니다."
}
```

---

## 4. 레이어 분리

### 4.1 레이어 분리 실행

**엔드포인트**: `POST /api/sound/split`

**설명**: Demucs AI 모델(`htdemucs_ft`)을 사용하여 오디오를 4개 레이어로 분리합니다. 비동기 Job Queue 방식으로 동작합니다.

**요청 본문**:

```json
{
  "trackId": "1738241234.mp3"
}
```

**응답 예시** (즉시 반환):

```json
{
  "success": true,
  "jobId": "job_split_1738241234567",
  "message": "분리 작업이 백그라운드에서 시작되었습니다."
}
```

**분리 결과 (완료 후)**:
| Stem | 경로 | 설명 |
|------|------|------|
| vocals | `/output/htdemucs_ft/{trackName}/vocals.wav` | 보컬 |
| drums | `/output/htdemucs_ft/{trackName}/drums.wav` | 드럼 |
| bass | `/output/htdemucs_ft/{trackName}/bass.wav` | 베이스 |
| other | `/output/htdemucs_ft/{trackName}/other.wav` | 기타 악기 |

**Demucs 설정**:
| 옵션 | 값 | 설명 |
|------|-----|------|
| 모델 | `htdemucs_ft` | Fine-tuned 고음질 모델 |
| Shifts | 2 | 노이즈 감소를 위한 중복 분석 |
| Overlap | 0.25 | 구간 연결 부드러움 |
| Device | CUDA | GPU 가속 |

---

## 5. 블렌드 (믹싱)

### 5.1 블렌드/드롭 믹스 생성

**엔드포인트**: `POST /api/sound/blend`

**설명**: 두 곡 간의 DJ 스타일 믹스 시퀀스를 생성합니다. Blend Mix 또는 Drop Mix 중 선택 가능합니다.

**요청 본문**:

```json
{
  "sourceId": "1738241234.mp3",
  "targetId": "1738241235.mp3",
  "mixType": "blend",
  "bridgeBars": 4
}
```

**요청 파라미터**:
| 파라미터 | 타입 | 필수 | 기본값 | 설명 |
|---------|------|------|--------|------|
| sourceId | string | 예 | - | 소스 트랙 ID (Track A) |
| targetId | string | 예 | - | 타겟 트랙 ID (Track B) |
| mixType | string | 아니오 | `"blend"` | 믹싱 타입: `"blend"` 또는 `"drop"` |
| bridgeBars | number | 아니오 | `4` | Drop Mix 시 브릿지 길이 (마디 수) |

**응답 예시** (즉시 반환):

```json
{
  "success": true,
  "jobId": "job_blend_1738241236789",
  "mixType": "blend",
  "message": "Blend Mix 작업이 시작되었습니다."
}
```

**완료 후 결과**:
| mixType | 출력 파일 경로 |
|---------|---------------|
| blend | `/output/blends/blend_{trackA}_to_{trackB}.wav` |
| drop | `/output/blends/drop_{trackA}_to_{trackB}.wav` |

**에러 응답**:

```json
{
  "success": false,
  "error": "Invalid mixType: abc. Use 'blend' or 'drop'.",
  "code": "INVALID_MIX_TYPE"
}
```

---

### 5.2 믹싱 전략 상세

#### 5.2.1 Blend Mix

부드러운 전환을 위한 DJ 스타일 믹싱입니다.

| 항목          | 설명                                                                                                                                       |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **전환 방식** | 점진적 BPM 변속 + Bass Swap                                                                                                                |
| **전환 길이** | Track B의 Intro 길이에 따라 자동 계산                                                                                                      |
| **키 매칭**   | 자동 키 분석 후 피치 시프트 적용                                                                                                           |
| **특징**      | - Track A의 베이스를 제거하고 Track B의 베이스로 교체<br>- Equal Power Crossfade로 에너지 일정 유지<br>- 저음(250Hz 이하) 주파수 분리 믹싱 |

**처리 파이프라인**:

1. Stem 분리 (Demucs)
2. BPM/Key 분석
3. Outro 분석 및 확장 (필요 시 루프 추가)
4. 키 매칭 (피치 시프트)
5. Bass Swap 믹싱
6. 최종 연결 (De-click Crossfade)

#### 5.2.2 Drop Mix

빌드업 후 폭발적인 전환을 위한 에너지 넘치는 믹싱입니다.

| 항목          | 설명                                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------------- |
| **전환 방식** | 2배속 가속 빌드업 후 즉각 전환                                                                                      |
| **전환 길이** | `bridgeBars` 파라미터로 지정 (기본 4마디)                                                                           |
| **키 매칭**   | 미적용 (에너지 우선)                                                                                                |
| **특징**      | - Track A의 마지막 1박자를 반복하며 가속<br>- High-Pass 필터로 긴장감 증폭<br>- Track B의 Drop 지점에서 폭발적 전환 |

**처리 파이프라인**:

1. Stem 분리 (Demucs)
2. BPM/다운비트 분석
3. 마지막 1박자 추출 및 반복
4. 템포 램프 (BPM A → BPM B × 2)
5. High-Pass 필터 + Fade In
6. 즉각 연결

---

## 6. Job 상태 조회

### 6.1 작업 상태 확인

**엔드포인트**: `GET /api/sound/status/:jobId`

**설명**: 비동기 작업(분리, 블렌드 등)의 진행 상태를 확인합니다.

**응답 예시 (진행 중)**:

```json
{
  "success": true,
  "status": "processing",
  "type": "separation",
  "startTime": 1738241234567
}
```

**응답 예시 (완료)**:

```json
{
  "success": true,
  "status": "completed",
  "result": {
    "message": "Separation complete",
    "path": "./output/htdemucs_ft/MySong"
  },
  "completedAt": 1738241264567
}
```

**응답 예시 (실패)**:

```json
{
  "success": true,
  "status": "failed",
  "error": "Demucs Failed: CUDA out of memory",
  "failedAt": 1738241264567
}
```

**상태 값**:
| 상태 | 설명 |
|------|------|
| `processing` | 처리 중 |
| `completed` | 완료 |
| `failed` | 실패 |

---

## 7. 서버 아키텍처

### 7.1 디렉토리 구조

```
server/
├── index.js              # Express 서버 진입점 (포트 3001)
├── main.py               # 독립 실행 믹싱 테스트 스크립트
├── routes/
│   └── audio.js          # API 라우터 정의
├── services/             # Python 분석/처리 서비스
│   ├── audio_analysis.py     # 종합 분석 (BPM, Key, 구조)
│   ├── stem_separation.py    # Demucs 레이어 분리
│   ├── analyzer_beat.py      # BeatNet 비트 분석
│   ├── analyzer_key.py       # 키(Key) 분석 모듈
│   ├── analyzer_intro.py     # Intro 구간 감지
│   ├── analyzer_outro.py     # Outro 끝점 감지
│   ├── analyzer_vocal.py     # 보컬 끝점 감지
│   ├── transition.py         # 전환 시퀀스 생성
│   ├── extract_beat.py       # 비트 루프 추출 (V1)
│   ├── extract_beat_v2.py    # 비트 루프 추출 (V2 Quantized)
│   ├── mix_audio.py          # 오디오 믹싱
│   ├── modify_volume.py      # 볼륨 조절
│   └── vocal_mixer.py        # 보컬 전용 믹서
├── engine/               # DSP 처리 엔진
│   ├── mixer.py              # EQ 믹싱 (Bass Swap)
│   ├── dsp/
│   │   ├── effects.py        # Delay, Fade 이펙트
│   │   ├── filters.py        # EQ 필터 (High/Low/Band Pass)
│   │   └── time_stretch.py   # BPM 변환, 피치 시프트
│   └── transitions/
│       ├── blend_mix.py      # Blend Mix 전략
│       └── drop_mix.py       # Drop Mix 전략
├── uploads/              # 업로드 파일 저장
│   ├── temp/
│   └── tracks/
└── output/               # 처리 결과 저장
    ├── htdemucs_ft/          # Demucs 분리 결과
    ├── blends/
    └── aligned_layers/
```

### 7.2 Node.js-Python 연동

서버는 Node.js(Express)가 HTTP 요청을 받고, `child_process.spawn()`을 통해 Python 스크립트를 실행합니다.

```javascript
// 예시: Python 스크립트 호출
const pythonProcess = spawn("python", [scriptPath, ...args]);
pythonProcess.stdout.on("data", (data) => {
  /* JSON 결과 수신 */
});
```

---

## 8. 내부 서비스 모듈

### 8.1 audio_analysis.py

**역할**: 종합 오디오 분석 (Node.js 연동용)

| 함수                                          | 설명                                  |
| --------------------------------------------- | ------------------------------------- |
| `analyze_track_properties(file_path)`         | BPM, Key, 비트, 다운비트, 구조 분석   |
| `identify_musical_key(samples, sr)`           | Krumhansl-Schmuckler 알고리즘 키 감지 |
| `find_bar_positions(samples, sr, beat_times)` | 다운비트(마디 시작점) 검출            |
| `partition_sections(samples, sr)`             | 곡 구조 분할 (MFCC + Agglomerative)   |

### 8.2 analyzer_beat.py

**역할**: BeatNet 기반 정밀 비트 분석

| 함수                                 | 설명                         |
| ------------------------------------ | ---------------------------- |
| `get_beat_info(file_path, bpm_hint)` | BeatNet 비트 + 다운비트 분석 |
| `get_beat_info_librosa(file_path)`   | Librosa Fallback             |

**BeatNet 설정**:

- Mode: `offline`
- Inference Model: `DBN`

### 8.3 analyzer_key.py

**역할**: 키(Key) 분석 및 피치 시프트 계산

| 함수                                  | 설명                                     |
| ------------------------------------- | ---------------------------------------- |
| `get_key_from_audio(y, sr)`           | 키 인덱스(0~11) + 모드(major/minor) 반환 |
| `get_pitch_shift_steps(key_a, key_b)` | 최단 거리 이동 semitone 계산 (-6 ~ +6)   |

**Key Profile**: Krumhansl-Schmuckler 프로파일 사용

### 8.4 analyzer_intro.py

**역할**: Intro 구간 끝점 감지

| 함수                                              | 설명                               |
| ------------------------------------------------- | ---------------------------------- |
| `get_intro_duration(file_path, default_duration)` | RMS 에너지 급상승 지점 (Drop) 감지 |

**알고리즘**:

- 기준: 최대 볼륨의 45% 이상
- 조건: 2초 이상 유지

### 8.5 analyzer_outro.py

**역할**: Outro 끝점 감지 (Aggressive Mode)

| 함수                         | 설명                              |
| ---------------------------- | --------------------------------- |
| `find_outro_endpoint(y, sr)` | 마지막 강한 에너지 지점 이후 트림 |

**알고리즘**:

- 볼륨 임계값: 0.5
- 비트 임계값: 0.4
- 분석 범위: 곡 마지막 45초

### 8.6 analyzer_vocal.py

**역할**: 보컬 끝점 감지

| 함수                                 | 설명                               |
| ------------------------------------ | ---------------------------------- |
| `find_vocal_end_point(y_vocals, sr)` | RMS 기반 보컬 끝지점 (뒤에서 스캔) |

### 8.7 stem_separation.py

**역할**: Demucs 기반 4-Stem 분리

| 함수                             | 설명                      |
| -------------------------------- | ------------------------- |
| `separate_stems(track_filename)` | 고음질 분리 (htdemucs_ft) |

**특징**:

- 이미 분리된 파일 자동 스킵 (캐싱)
- FFmpeg 포함 (서비스 폴더 내)

### 8.8 extract_beat_v2.py

**역할**: 정량화된 비트 루프 추출 (Madmom)

| 함수                                           | 설명                 |
| ---------------------------------------------- | -------------------- |
| `extract_best_loop_v2(input_folder, bpm_hint)` | 4마디 최적 루프 추출 |
| `validate_and_fix_phase(y_drums, sr, ...)`     | 다운비트 위상 보정   |
| `quantize_loop_to_grid(y, sr, bpm, beats)`     | 그리드 퀀타이즈      |

---

## 9. DSP 엔진

### 9.1 mixer.py (engine/)

**역할**: EQ 기반 믹싱 (Bass Swap)

| 함수                                      | 설명                      |
| ----------------------------------------- | ------------------------- |
| `butter_lowpass_filter(data, cutoff, fs)` | Butterworth 저역통과 필터 |
| `apply_eq_mix(y1, y2, sr, overlap_len)`   | 2단계 Bass Swap 믹싱      |

**Bass Swap 알고리즘**:

1. **단계 1 (0~50%)**: A Low → 0, B Low → 1, A High 유지
2. **단계 2 (50~100%)**: A High → 0, B High → 1

### 9.2 dsp/effects.py

**클래스**: `AudioEffects`

| 메서드                                                   | 설명               |
| -------------------------------------------------------- | ------------------ |
| `apply_delay(audio, bpm, beats, feedback, mix, hi_pass)` | 비트 동기화 딜레이 |
| `apply_fade(audio, mode, duration_sec, curve)`           | Fade In/Out        |

### 9.3 dsp/filters.py

**클래스**: `EQFilter`

| 메서드                                           | 설명                     |
| ------------------------------------------------ | ------------------------ |
| `apply_high_pass(audio_data, cutoff)`            | Low Cut (킥/베이스 제거) |
| `apply_low_pass(audio_data, cutoff)`             | High Cut (베이스만 추출) |
| `apply_band_pass(audio_data, low_cut, high_cut)` | Isolator (중역대만)      |

**필터 특성**: Butterworth 4차, Zero-phase (sosfiltfilt)

### 9.4 dsp/time_stretch.py

**클래스**: `TimeStretcher`

| 메서드                                                      | 설명                   |
| ----------------------------------------------------------- | ---------------------- |
| `apply_rate(audio, rate)`                                   | 기본 속도 변환         |
| `match_bpm(audio, source_bpm, target_bpm)`                  | BPM 맞추기             |
| `match_length(audio, target_samples)`                       | 특정 길이 맞추기       |
| `apply_ramp(audio, start_bpm, end_bpm, steps)`              | 템포 램프 (가감속)     |
| `sync_to_ramp(audio, input_bpm, start_bpm, end_bpm, steps)` | 동적 템포 동기화       |
| `apply_pitch_shift(audio, n_steps)`                         | 피치 시프트 (Semitone) |

### 9.5 transitions/blend_mix.py

**클래스**: `BlendMixStrategy`

**프로세스**:

1. 키 분석 (Track A & B)
2. 피치 시프트 계산 및 적용
3. 동적 템포 싱크 (32 Steps)
4. Bass Swap (High-Pass + Crossfade)
5. 최종 연결

### 9.6 transitions/drop_mix.py

**클래스**: `DropMixStrategy`

**프로세스**:

1. 마지막 1박자 추출
2. 4마디 반복
3. 200% 템포 램프 적용
4. High-Pass + Fade In
5. 즉각 전환

---

## 10. 에러 처리

### 10.1 에러 응답 형식

```json
{
  "success": false,
  "error": "에러 메시지"
}
```

### 10.2 HTTP 상태 코드

| 상태 코드 | 설명                                       |
| --------- | ------------------------------------------ |
| 200       | 성공                                       |
| 400       | 잘못된 요청                                |
| 404       | 리소스를 찾을 수 없음 / Job을 찾을 수 없음 |
| 500       | 서버 내부 오류                             |

### 10.3 에러 코드 목록

| 에러 코드                 | 설명                                    |
| ------------------------- | --------------------------------------- |
| `NO_FILE`                 | 파일이 업로드되지 않음                  |
| `INVALID_FILE_TYPE`       | 지원되지 않는 파일 형식                 |
| `TRACK_NOT_FOUND`         | 트랙을 찾을 수 없음                     |
| `MISSING_TRACK_ID`        | trackId 누락                            |
| `MISSING_PARAMETERS`      | 필수 파라미터 누락 (sourceId, targetId) |
| `INVALID_MIX_TYPE`        | 잘못된 mixType (blend 또는 drop만 허용) |
| `LAYER_SEPARATION_FAILED` | 레이어 분리 실패                        |
| `ANALYSIS_FAILED`         | 분석 실패                               |
| `BPM_MISMATCH`            | BPM 차이가 너무 큼                      |
| `BLEND_FAILED`            | 블렌드/드롭 믹스 생성 실패              |
| `UPLOAD_FAILED`           | 업로드 실패                             |
| `JOB_NOT_FOUND`           | Job ID를 찾을 수 없음                   |
| `INTERNAL_SERVER_ERROR`   | 서버 내부 오류                          |

---

## 11. 클라이언트 연동 가이드

> **담당**: 개발자 B (프론트엔드)

### 11.1 Base URL 및 환경 변수

- **개발**: `VITE_API_BASE_URL=http://localhost:3001/api`
- **프로덕션**: `.env` 파일에서 설정

### 11.2 파일 업로드 예시

```javascript
const formData = new FormData();
formData.append("file", audioFile);

const response = await fetch("http://localhost:3001/api/sound/upload", {
  method: "POST",
  body: formData,
});

const data = await response.json();
console.log("Track ID:", data.trackId);
console.log("BPM:", data.analysis.bpm);
console.log("Key:", data.analysis.key);
```

### 11.3 Blend/Drop Mix 요청 예시

```javascript
// Blend Mix 요청 (부드러운 전환)
async function requestBlendMix(trackA, trackB) {
  const response = await fetch("http://localhost:3001/api/sound/blend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId: trackA,
      targetId: trackB,
      mixType: "blend", // 기본값, 생략 가능
    }),
  });

  const data = await response.json();
  console.log("Job ID:", data.jobId);
  return data.jobId;
}

// Drop Mix 요청 (폭발적 전환)
async function requestDropMix(trackA, trackB, bridgeBars = 4) {
  const response = await fetch("http://localhost:3001/api/sound/blend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId: trackA,
      targetId: trackB,
      mixType: "drop",
      bridgeBars: bridgeBars, // 브릿지 길이 (마디 수)
    }),
  });

  const data = await response.json();
  console.log("Job ID:", data.jobId);
  return data.jobId;
}
```

### 11.4 비동기 작업 폴링 예시

```javascript
async function pollJobStatus(jobId) {
  const poll = setInterval(async () => {
    const res = await fetch(`http://localhost:3001/api/sound/status/${jobId}`);
    const job = await res.json();

    if (job.status === "completed") {
      clearInterval(poll);
      console.log("완료:", job.result);
      console.log("출력 파일:", job.result.outputPath);
    } else if (job.status === "failed") {
      clearInterval(poll);
      console.error("실패:", job.error);
    }
  }, 2000); // 2초 간격
}
```

### 11.5 에러 코드별 클라이언트 처리 권장

| 에러 코드                 | HTTP | 클라이언트 권장 동작                                 |
| ------------------------- | ---- | ---------------------------------------------------- |
| `INVALID_FILE_TYPE`       | 400  | 업로드 전 확장자/타입 검사, 사용자 안내 메시지       |
| 에러 코드                 | HTTP | 클라이언트 권장 동작                                 |
| ------------------------- | ---- | ---------------------------------------------------- |
| `INVALID_FILE_TYPE`       | 400  | 업로드 전 확장자/타입 검사, 사용자 안내 메시지       |
| `TRACK_NOT_FOUND`         | 404  | "트랙을 찾을 수 없습니다" 메시지, 목록 새로고침 유도 |
| `INVALID_MIX_TYPE`        | 400  | "blend 또는 drop만 사용 가능" 안내                   |
| `MISSING_PARAMETERS`      | 400  | "sourceId와 targetId가 필요합니다" 안내              |
| `LAYER_SEPARATION_FAILED` | 500  | 재시도 버튼 제공, 로딩/스켈레톤 UI로 대기 표시       |
| `BPM_MISMATCH`            | 400  | BPM 차이 안내 및 블렌드 포인트 조정 유도             |
| `BLEND_FAILED`            | 500  | 재시도 또는 파라미터 변경 유도                       |
| `UPLOAD_FAILED`           | 500  | 재시도, 진행률 표시                                  |
| 네트워크 오류             | -    | 오프라인/재시도 안내, exponential backoff            |

### 11.6 정적 파일 접근

```javascript
// 원본 트랙
const originalUrl = `http://localhost:3001/uploads/tracks/${trackId}`;

// 분리된 보컬
const trackName = trackId.replace(/\.[^/.]+$/, ""); // 확장자 제거
const vocalsUrl = `http://localhost:3001/output/htdemucs_ft/${trackName}/vocals.wav`;

// 믹스 결과 (Blend)
const blendUrl = `http://localhost:3001/output/blends/blend_${trackAName}_to_${trackBName}.wav`;

// 믹스 결과 (Drop)
const dropUrl = `http://localhost:3001/output/blends/drop_${trackAName}_to_${trackBName}.wav`;
```

---

**문서 버전**: 2.1  
**최종 수정일**: 2026-02-03  
**변경 이력**:

- v2.1 — Blend/Drop Mix 선택 기능 추가, mix_engine.py 통합 모듈 적용, API 명세 상세화
- v2.0 — 전체 재작성: 서버 아키텍처 상세화, 내부 서비스 모듈 문서화, DSP 엔진 API 추가
- v1.2 — PROJECT_PLAN.md v1.3 기준 반영, 담당 역할 명시, §9 클라이언트 연동 가이드 추가
