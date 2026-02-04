/**
 * Transition DJ API 클라이언트
 * Python 백엔드 (Demucs, Madmom, PyRubberband) 연동
 * docs/BACKEND_API_SPEC.md 참조
 */

const API_BASE = process.env.NEXT_PUBLIC_TRANSITION_API_URL || "/api/transition";

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
 * 스템 분리 요청
 * @param fileId 파일 ID
 * @param model 분리 모델 (htdemucs | htdemucs_ft)
 * @returns 작업 ID
 */
export async function requestStemSeparation(
  fileId: string,
  model: "htdemucs" | "htdemucs_ft" = "htdemucs"
): Promise<{ jobId: string; estimatedTime: number }> {
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
  const response = await fetch(`${API_BASE}/stems/${jobId}`);

  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }

  return await response.json();
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
