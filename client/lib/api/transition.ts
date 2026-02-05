/**
 * Transition DJ API 클라이언트
 * Server: /api/sound (Blend/Drop Mix)
 */

import { API_CONFIG } from './config';

const BASE_URL = API_CONFIG.base;

// API 클라이언트 초기화 로깅
console.log(`🔧 [Transition API] 초기화`);
console.log(`   📡 BASE_URL: ${BASE_URL}`);
console.log(`   🌐 NEXT_PUBLIC_API_BASE_URL: ${process.env.NEXT_PUBLIC_API_BASE_URL || '(not set)'}`);
console.log(`   🎭 NEXT_PUBLIC_USE_MOCK: ${process.env.NEXT_PUBLIC_USE_MOCK || '(not set)'}`);

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

  const uploadUrl = `${BASE_URL}/upload`;
  
  console.log(`📤 [Transition API] 업로드 시작`);
  console.log(`   📁 파일명: ${file.name}`);
  console.log(`   📏 크기: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`   🔗 URL: ${uploadUrl}`);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    console.log(`📥 [Transition API] 응답 수신: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ [Transition API] 업로드 실패:`, errorText);
      throw new Error(`Upload failed: ${response.statusText} - ${errorText}`);
    }

    const result = await response.json();
    console.log(`✅ [Transition API] 업로드 성공:`, result);
    return result;
  } catch (error: any) {
    console.error(`❌ [Transition API] 네트워크 에러:`, error);
    // 서버 연결 실패 시 더 명확한 에러 메시지
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error(`서버 연결 실패: ${uploadUrl}에 접근할 수 없습니다. 서버가 실행 중인지 확인하세요.`);
    }
    throw error;
  }
}

/**
 * 2. 믹스 생성 요청 (Blend/Drop)
 */
export async function createTransitionMix(
  sourceId: string, // Track A
  targetId: string, // Track B
  options: {
    transitionType: "blend" | "drop"; // 서버에서 BPM 차이로 자동 결정
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
 * 2.5. 스템 분리 요청 (백그라운드)
 */
export async function splitAudio(trackId: string): Promise<{
    success: boolean;
    jobId: string;
    message: string;
}> {
    const response = await fetch(`${BASE_URL}/split`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackId }),
    });

    if (!response.ok) {
        throw new Error(`Split request failed: ${response.statusText}`);
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
   return `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:18000'}/uploads/tracks/${filename}`;
}

