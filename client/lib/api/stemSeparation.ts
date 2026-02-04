/**
 * Stem Separation API 클라이언트
 * Demucs 백엔드와 연동하여 오디오 파일을 4개 스템으로 분리
 */

// API 기본 URL (백엔드 연동 시 환경 변수로 설정)
const API_BASE_URL = process.env.NEXT_PUBLIC_STEM_API_URL || '/api/stems';

// 환경 변수로 Mock 모드 결정 (백엔드 미연결 시 true)
const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === 'true';

/**
 * 스템 추출 옵션 인터페이스
 */
export interface StemExtractionOptions {
  stems: {
    drums: boolean;      // 드럼 추출 여부
    bass: boolean;       // 베이스 추출 여부
    vocals: boolean;     // 보컬 추출 여부
    instruments: boolean; // 악기(기타 등) 추출 여부
  };
  limitCpu: boolean;     // CPU 사용 제한 여부
  afterAction: 'mute_clip' | 'mute_track' | 'nothing'; // 추출 완료 후 동작
  model?: 'htdemucs' | 'mdx'; // Demucs 모델 선택
}

/**
 * 스템 분리 작업 상태
 */
export interface StemJobStatus {
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number; // 0-100
  message?: string;
  stems?: {
    drums?: string;      // 드럼 스템 URL
    bass?: string;       // 베이스 스템 URL
    vocals?: string;     // 보컬 스템 URL
    instruments?: string; // 악기 스템 URL
  };
  error?: string;
}

/**
 * 스템 분리 요청 응답
 */
export interface StemExtractionResponse {
  jobId: string;
  estimatedTime: number; // 예상 처리 시간 (초)
}

/**
 * 오디오 파일 업로드 및 스템 분리 요청
 * @param file - 분리할 오디오 파일
 * @param options - 추출 옵션
 * @returns 작업 ID 및 예상 시간
 */
export async function uploadForSeparation(
  file: File,
  options: StemExtractionOptions
): Promise<StemExtractionResponse> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    console.log('[Stem API] Mock 모드 사용 중');
    return mockUploadForSeparation(file, options);
  }

  const formData = new FormData();
  formData.append('file', file);
  
  // 선택된 스템 목록 생성
  const selectedStems: string[] = [];
  if (options.stems.drums) selectedStems.push('drums');
  if (options.stems.bass) selectedStems.push('bass');
  if (options.stems.vocals) selectedStems.push('vocals');
  if (options.stems.instruments) selectedStems.push('instruments');
  
  formData.append('stems', JSON.stringify(selectedStems));
  formData.append('model', options.model || 'htdemucs');
  formData.append('limitCpu', String(options.limitCpu));
  
  const response = await fetch(`${API_BASE_URL}/extract`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) {
    throw new Error(`Stem separation request failed: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 스템 분리 작업 상태 확인
 * @param jobId - 작업 ID
 * @returns 작업 상태 및 진행률
 */
export async function checkSeparationStatus(jobId: string, currentProgress: number = 0): Promise<StemJobStatus> {
  // Mock 모드일 경우 Mock 응답 반환
  if (USE_MOCK) {
    return mockCheckStatus(jobId, currentProgress);
  }

  const response = await fetch(`${API_BASE_URL}/status/${jobId}`);
  
  if (!response.ok) {
    throw new Error(`Failed to check status: ${response.statusText}`);
  }
  
  return response.json();
}

/**
 * 분리된 스템 다운로드
 * @param jobId - 작업 ID
 * @param stem - 다운로드할 스템 종류
 * @returns Blob 데이터
 */
export async function downloadStem(
  jobId: string,
  stem: 'drums' | 'bass' | 'vocals' | 'instruments'
): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/download/${jobId}/${stem}`);
  
  if (!response.ok) {
    throw new Error(`Failed to download stem: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * 모든 스템을 ZIP으로 다운로드
 * @param jobId - 작업 ID
 * @returns ZIP Blob 데이터
 */
export async function downloadAllStems(jobId: string): Promise<Blob> {
  const response = await fetch(`${API_BASE_URL}/download/${jobId}/all`);
  
  if (!response.ok) {
    throw new Error(`Failed to download all stems: ${response.statusText}`);
  }
  
  return response.blob();
}

/**
 * 스템 분리 작업 취소
 * @param jobId - 작업 ID
 */
export async function cancelSeparation(jobId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/cancel/${jobId}`, {
    method: 'POST',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel job: ${response.statusText}`);
  }
}

/**
 * Mock 함수: 백엔드 없이 테스트용
 * 실제 분리 대신 시뮬레이션된 응답 반환
 */
export function mockUploadForSeparation(
  file: File,
  options: StemExtractionOptions
): Promise<StemExtractionResponse> {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        jobId: `mock-${Date.now()}`,
        estimatedTime: 30,
      });
    }, 500);
  });
}

/**
 * Mock 함수: 진행 상태 시뮬레이션
 */
export function mockCheckStatus(
  jobId: string,
  currentProgress: number
): Promise<StemJobStatus> {
  return new Promise((resolve) => {
    const newProgress = Math.min(currentProgress + 10, 100);
    setTimeout(() => {
      if (newProgress >= 100) {
        resolve({
          status: 'completed',
          progress: 100,
          stems: {
            drums: `/mock-stems/${jobId}/drums.wav`,
            bass: `/mock-stems/${jobId}/bass.wav`,
            vocals: `/mock-stems/${jobId}/vocals.wav`,
            instruments: `/mock-stems/${jobId}/instruments.wav`,
          },
        });
      } else {
        resolve({
          status: 'processing',
          progress: newProgress,
          message: `Processing... ${newProgress}%`,
        });
      }
    }, 500);
  });
}
