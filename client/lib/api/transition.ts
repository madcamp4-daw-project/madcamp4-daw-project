/**
 * Transition DJ API 클라이언트
 * Server: /api/sound (Blend/Drop Mix)
 */

import { API_CONFIG } from './config';

const BASE_URL = API_CONFIG.base;

/**
 * Beat Analysis Result
 */
export interface BeatAnalysis {
  fileId: string;
  bpm: number;
  timeSignature: string;
  beats: number[];
  downbeats: number[];
  sections: Section[];
  waveformData: {
    peaks: number[];
    duration: number;
  };
  // Server's analysis result might vary, we might need to adapt
}

export interface Section {
  name: string;
  start: number;
  end: number;
}

/**
 * Mix Result
 */
export interface MixResult {
  success: boolean;
  jobId: string; // The job created
  mixType: string;
  message: string;
  result?: {
      // Server output for completed mix
      mixUrl?: string;
  }
}

/**
 * 1. 파일 업로드 (Transition 패널용)
 * @returns trackId and analysis data
 */
export async function uploadAudioFile(file: File): Promise<{
  success: boolean;
  trackId: string;
  originalName: string;
  analysis?: any; // Server returns 'analysis' object
  message: string;
}> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 2. 믹스 생성 요청 (Blend/Drop)
 */
export async function createTransitionMix(
  sourceId: string, // Track A
  targetId: string, // Track B
  options: {
    transitionType: "blend" | "drop";
    bridgeBars?: number; // for drop mix
    // Server doesn't seem to support syncBpm/transitionDuration in 'blend' endpoint args directly based on current code, 
    // but we'll include them if server updates, or minimal args for now.
    // Server expects: { sourceId, targetId, mixType, bridgeBars }
  }
): Promise<MixResult> {
  const response = await fetch(`${BASE_URL}/blend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sourceId,
      targetId,
      mixType: options.transitionType,
      bridgeBars: options.bridgeBars || 4,
    }),
  });

  if (!response.ok) {
    throw new Error(`Mix creation failed: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * 3. 상태 조회
 */
export async function getMixStatus(jobId: string): Promise<any> {
    const response = await fetch(`${BASE_URL}/status/${jobId}`);
    if (!response.ok) {
        throw new Error(`Status check failed: ${response.statusText}`);
    }
    return await response.json();
}

/**
 * 스트림 URL 생성 (정적 경로)
 */
export function getStreamUrl(filename: string): string {
   if (filename.startsWith('http')) return filename;
   return `${process.env.NEXT_PUBLIC_STATIC_HOST || 'http://localhost:18000'}/uploads/tracks/${filename}`;
}

