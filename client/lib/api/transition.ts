/**
 * Transition DJ API 클라이언트
 * Python 백엔드 (Demucs, Madmom, PyRubberband) 연동
 * docs/BACKEND_API_SPEC.md 참조
 */

const API_BASE = process.env.NEXT_PUBLIC_TRANSITION_API_URL || "/api/transition";

// 환경 변수로 Mock 모드 결정 (백엔드 미연결 시 true)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * 비트 분석 결과 인터페이스
 */
export interface BeatAnalysis {
  fileId: string;
  bpm: number;
  timeSignature: string;
  beats: number[];      // 비트 타임스탬프 (초)
  downbeats: number[];  // 다운비트 인덱스
  sections: Section[];  // 구간 분석
  waveformData: {
    peaks: number[];
    duration: number;
  };
}

/**
 * 구간 정보
 */
export interface Section {
  name: string;  // Intro, Verse, Chorus, Outro
  start: number;
  end: number;
}

/**
 * 스템 분리 결과 인터페이스
 */
export interface StemResult {
  jobId: string;
  status: "processing" | "completed" | "failed";
  progress?: number;
  stems?: {
    vocals: { fileId: string; streamUrl: string };
    bass: { fileId: string; streamUrl: string };
    drums: { fileId: string; streamUrl: string };
    other: { fileId: string; streamUrl: string };
  };
  stemVisuals?: StemVisualsData;
}

/**
 * Stem Visuals 데이터 (프론트엔드 렌더링용)
 */
export interface StemVisualsData {
  vocals: { color: string; notes: StemNote[] };
  bass: { color: string; notes: StemNote[] };
  melody: { color: string; notes: StemNote[] };
  drums: {
    kick: { color: string; hits: DrumHit[] };
    snareHihat: { color: string; hits: DrumHit[] };
  };
}

export interface StemNote {
  time: number;
  pitch: number;
  volume: number;
  duration: number;
}

export interface DrumHit {
  time: number;
  intensity: number;
}

/**
 * 믹스 결과 인터페이스
 */
export interface MixResult {
  mixId: string;
  streamUrl: string;
  duration: number;
  transitionPoints: {
    fadeOutStart: number;
    fadeOutEnd: number;
    fadeInStart: number;
    fadeInEnd: number;
  };
}

/**
 * 오디오 파일 업로드
 * @param file 오디오 파일
 * @returns 파일 ID 및 메타데이터
 */
export async function uploadAudioFile(file: File): Promise<{
  fileId: string;
  filename: string;
  duration: number;
  sampleRate: number;
  channels: number;
}> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Transition API] Mock 모드 사용 중 - uploadAudioFile');
    return {
      fileId: `file-${Date.now()}`,
      filename: file.name,
      duration: 180,
      sampleRate: 44100,
      channels: 2,
    };
  }

  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 비트/BPM 분석 요청
 * @param fileId 파일 ID
 * @returns 비트 분석 결과
 */
export async function analyzeBeats(fileId: string): Promise<BeatAnalysis> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Transition API] Mock 모드 사용 중 - analyzeBeats');
    return mockAnalyzeBeats();
  }

  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId }),
  });

  if (!response.ok) {
    throw new Error(`Analysis failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Mock 비트 분석 (백엔드 없을 때)
 */
export async function mockAnalyzeBeats(file?: File): Promise<BeatAnalysis> {
  await new Promise((resolve) => setTimeout(resolve, 500));

  const bpm = 80 + Math.random() * 60; // 80-140 BPM
  const duration = 180;
  const beatInterval = 60 / bpm;
  const beats: number[] = [];
  const downbeats: number[] = [];

  for (let t = 0; t < duration; t += beatInterval) {
    beats.push(t);
    if (beats.length % 4 === 1) {
      downbeats.push(beats.length - 1);
    }
  }

  return {
    fileId: `mock-${Date.now()}`,
    bpm: Math.round(bpm * 10) / 10,
    timeSignature: "4/4",
    beats,
    downbeats,
    sections: [
      { name: "Intro", start: 0, end: 15 },
      { name: "Verse", start: 15, end: 45 },
      { name: "Chorus", start: 45, end: 75 },
      { name: "Verse", start: 75, end: 105 },
      { name: "Chorus", start: 105, end: 135 },
      { name: "Outro", start: 135, end: 180 },
    ],
    waveformData: {
      peaks: Array.from({ length: 2000 }, () => Math.random()),
      duration,
    },
  };
}

/**
 * 스템 분리 요청
 * @param fileId 파일 ID
 * @param model 분리 모델 (htdemucs | htdemucs_ft)
 * @returns 작업 ID
 */
export async function requestStemSeparation(
  fileId: string,
  model: "htdemucs" | "htdemucs_ft" = "htdemucs"
): Promise<{ jobId: string; estimatedTime: number }> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Transition API] Mock 모드 사용 중 - requestStemSeparation');
    return {
      jobId: `job-${Date.now()}`,
      estimatedTime: 120,
    };
  }

  const response = await fetch(`${API_BASE}/stems`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fileId, model }),
  });

  if (!response.ok) {
    throw new Error(`Stem separation request failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 스템 분리 상태 조회
 * @param jobId 작업 ID
 * @returns 스템 분리 결과
 */
export async function getStemStatus(jobId: string): Promise<StemResult> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Transition API] Mock 모드 사용 중 - getStemStatus');
    return mockGetStemStatus(jobId);
  }

  const response = await fetch(`${API_BASE}/stems/${jobId}`);

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Mock 스템 상태 (백엔드 없을 때)
 */
let mockProgress = 0;
export async function mockGetStemStatus(jobId: string): Promise<StemResult> {
  await new Promise((resolve) => setTimeout(resolve, 300));

  mockProgress += 20;
  if (mockProgress > 100) mockProgress = 100;

  if (mockProgress < 100) {
    return {
      jobId,
      status: "processing",
      progress: mockProgress,
    };
  }

  return {
    jobId,
    status: "completed",
    stems: {
      vocals: { fileId: "vocals-1", streamUrl: "/api/transition/stream/vocals-1" },
      bass: { fileId: "bass-1", streamUrl: "/api/transition/stream/bass-1" },
      drums: { fileId: "drums-1", streamUrl: "/api/transition/stream/drums-1" },
      other: { fileId: "other-1", streamUrl: "/api/transition/stream/other-1" },
    },
    stemVisuals: {
      vocals: {
        color: "#00FF00",
        notes: Array.from({ length: 50 }, (_, i) => ({
          time: i * 2,
          pitch: 0.5 + Math.random() * 0.4,
          volume: 0.6 + Math.random() * 0.4,
          duration: 1 + Math.random(),
        })),
      },
      bass: {
        color: "#FF0000",
        notes: Array.from({ length: 40 }, (_, i) => ({
          time: i * 2.5,
          pitch: 0.1 + Math.random() * 0.2,
          volume: 0.7 + Math.random() * 0.3,
          duration: 1 + Math.random() * 2,
        })),
      },
      melody: {
        color: "#FFA500",
        notes: Array.from({ length: 80 }, (_, i) => ({
          time: i * 1.2,
          pitch: 0.3 + Math.random() * 0.4,
          volume: 0.5 + Math.random() * 0.5,
          duration: 0.5 + Math.random(),
        })),
      },
      drums: {
        kick: {
          color: "#9B59B6",
          hits: Array.from({ length: 180 }, (_, i) => ({
            time: i * 0.5,
            intensity: 0.6 + Math.random() * 0.4,
          })),
        },
        snareHihat: {
          color: "#3498DB",
          hits: Array.from({ length: 360 }, (_, i) => ({
            time: i * 0.25 + 0.25,
            intensity: 0.3 + Math.random() * 0.7,
          })),
        },
      },
    },
  };
}

/**
 * 트랜지션 믹스 생성
 * @param trackA 트랙 A 정보
 * @param trackB 트랙 B 정보
 * @param options 믹스 옵션
 * @returns 믹스 결과
 */
export async function createTransitionMix(
  trackA: { fileId: string; startTime: number; endTime: number },
  trackB: { fileId: string; startTime: number; endTime: number },
  options: {
    transitionType: "blend" | "drop";
    transitionDuration: number;
    syncBpm: boolean;
    targetBpm?: number;
  }
): Promise<MixResult> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Transition API] Mock 모드 사용 중 - createTransitionMix');
    return {
      mixId: `mix-${Date.now()}`,
      streamUrl: "/api/transition/stream/mock-mix",
      duration: (trackA.endTime - trackA.startTime) + (trackB.endTime - trackB.startTime),
      transitionPoints: {
        fadeOutStart: 0,
        fadeOutEnd: options.transitionDuration,
        fadeInStart: 0,
        fadeInEnd: options.transitionDuration,
      },
    };
  }

  const response = await fetch(`${API_BASE}/mix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ trackA, trackB, ...options }),
  });

  if (!response.ok) {
    throw new Error(`Mix creation failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 오디오 스트림 URL 생성
 * @param fileId 파일 ID
 * @returns 스트리밍 URL
 */
export function getStreamUrl(fileId: string): string {
  return `${API_BASE}/stream/${fileId}`;
}
