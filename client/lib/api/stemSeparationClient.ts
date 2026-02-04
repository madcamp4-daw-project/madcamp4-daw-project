/**
 * Stem Separation API Client (Pure Client-Side)
 * Server: /api/sound (2-Step Flow)
 */

import { API_CONFIG } from './config';

// Force Base URL logic here to be safe, or use config
const getBaseUrl = () => {
  // If env var is set, use it. Otherwise fallback.
  // We want to target the Python server at port 8000 usually.
  if (process.env.NEXT_PUBLIC_API_BASE_URL) return process.env.NEXT_PUBLIC_API_BASE_URL;
  
  // Hard fallback for local development if env is missing
  if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
     return 'http://localhost:8000/api/sound';
  }
  
  return '/api/sound';
};

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
  limitCpu: boolean;
  afterAction: 'mute_clip' | 'mute_track' | 'nothing';
  model?: 'htdemucs' | 'mdx';
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
  const baseUrl = getBaseUrl();
  console.log(`[ClientAPI] Uploading file to ${baseUrl}/upload`);
  
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${baseUrl}/upload`, {
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
  const baseUrl = getBaseUrl();
  console.log(`[ClientAPI] Requesting split to ${baseUrl}/split for track ${trackId}`);

  const response = await fetch(`${baseUrl}/split`, {
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
  const baseUrl = getBaseUrl();
  // console.log(`[ClientAPI] Checking status for ${jobId}`); // Too noisy for polling

  const response = await fetch(`${baseUrl}/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Status check failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  
  return {
    success: data.success,
    status: data.status,
    progress: data.progress || 0,
    message: data.message,
    result: data.result,
    error: data.error
  };
}

/**
 * Convenience function: Upload + Split
 */
export async function uploadAndExtract(
  file: File,
  options?: StemExtractionOptions
): Promise<{ jobId: string }> {
  console.log('[ClientAPI] Starting uploadAndExtract flow...');
  
  // 1. Upload
  const uploadRes = await uploadAudioFile(file);
  console.log('[ClientAPI] Upload Response:', uploadRes);
  
  if (!uploadRes.success || !uploadRes.trackId) {
    throw new Error(uploadRes.message || 'Upload failed');
  }

  // 2. Split
  const splitRes = await requestStemSeparation(uploadRes.trackId);
  console.log('[ClientAPI] Split Response:', splitRes);
  
  if (!splitRes.success || !splitRes.jobId) {
    throw new Error(splitRes.message || 'Split request failed');
  }

  return { jobId: splitRes.jobId };
}

/**
 * 다운로드/스트림 URL 생성 헬퍼
 */
export function getStemDownloadUrl(filename: string): string {
  const staticHost = process.env.NEXT_PUBLIC_STATIC_HOST || 'http://localhost:8000';
  return `${staticHost}/output/${filename}`;
}
