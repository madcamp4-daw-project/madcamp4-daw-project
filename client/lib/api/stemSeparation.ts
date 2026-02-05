/**
 * Stem Separation API 클라이언트
 * Server: /api/sound (2-Step Flow)
 */

import { API_CONFIG } from './config';

// Base URL: /api/sound
const BASE_URL = API_CONFIG.base;

/**
 * 스템 추출 옵션 인터페이스
 */
export interface StemExtractionOptions {
  stems: {
    drums: boolean;
    bass: boolean;
    vocals: boolean;
    instruments: boolean;
  };
  limitCpu: boolean;     // (서버 미지원 가능성 있음)
  afterAction: 'mute_clip' | 'mute_track' | 'nothing';
  model?: 'htdemucs' | 'mdx'; // (서버 기본값 사용 가능성 있음)
}

/**
 * 스템 분리 작업 상태
 */
export interface StemJobStatus {
  success: boolean;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress?: number; 
  message?: string;
  result?: {
    stems?: {
      drums?: string;
      bass?: string;
      vocals?: string;
      instruments?: string;
    };
  };
  error?: string;
}

/**
 * 1. 파일 업로드 (공통)
 */
export async function uploadAudioFile(file: File): Promise<{
  success: boolean;
  trackId: string;
  originalName: string;
  message: string;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${BASE_URL}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 2. 스템 분리 요청 (Split)
 */
export async function requestStemSeparation(trackId: string): Promise<{
  success: boolean;
  jobId: string;
  message: string;
}> {
  const response = await fetch(`${BASE_URL}/split`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ trackId }),
  });

  if (!response.ok) {
    throw new Error(`Split request failed: ${response.statusText}`);
  }

  return response.json();
}

/**
 * 3. 상태 조회 (Status)
 */
export async function checkSeparationStatus(jobId: string): Promise<StemJobStatus> {
  const response = await fetch(`${BASE_URL}/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  // 서버 응답 구조 정규화
  // Server provides: { success, status, result: {...}, ... }
  return {
    success: data.success,
    status: data.status,
    progress: data.progress || 0, // 서버가 progress 안 줄 수도 있음
    message: data.message,
    result: data.result,
    error: data.error
  };
}

/**
 * Convenience function: Upload + Split
 * (UI에서 한 번에 처리하고 싶을 때 사용)
 */
export async function uploadAndExtract(
  file: File,
  options?: StemExtractionOptions
): Promise<{ jobId: string }> {
  // 1. Upload
  const uploadRes = await uploadAudioFile(file);
  if (!uploadRes.success || !uploadRes.trackId) {
    throw new Error(uploadRes.message || 'Upload failed');
  }

  // 2. Split
  // Server implementation currently takes only trackId. 
  // Options like 'stems' selection might need to be Client-side filtered or ignored if Server doesn't support them.
  const splitRes = await requestStemSeparation(uploadRes.trackId);
  if (!splitRes.success || !splitRes.jobId) {
    throw new Error(splitRes.message || 'Split request failed');
  }

  return { jobId: splitRes.jobId };
}

/**
 * 다운로드/스트림 URL 생성 헬퍼
 */
export function getStemDownloadUrl(filename: string): string {
  // 정적 파일 경로 사용
  // 예: http://localhost:18000/output/... 
  // 실제 경로는 서버 구현에 따라 다를 수 있으나, 보통 output 폴더를 static으로 염.
  // 여기서는 임시로 절대 경로 구성.
  return `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:18000'}/output/${filename}`;
}

