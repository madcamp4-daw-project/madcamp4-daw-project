/**
 * API 클라이언트 공통 설정 및 유틸리티
 * Mock ↔ 실제 API 스위칭 로직
 */

// ===== 환경 변수 기반 설정 =====

/**
 * Mock 모드 여부
 * NEXT_PUBLIC_USE_MOCK=false 설정 시 실제 Backend 연결
 */
export const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK !== 'false';

/**
 * API 기본 URL 설정
 */
export const API_CONFIG = {
  /**
   * 통합 Sound API Base URL
   */
  base: process.env.NEXT_PUBLIC_API_BASE_URL || '/api/sound',
  
  /**
   * SoundCloud API
   */
  soundcloud: {
    clientId: process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || 'demo',
    baseUrl: 'https://api.soundcloud.com',
  },
  
  /**
   * 시스템 상태 체크 (Backend Health Check)
   */
  health: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
};

// ===== 공통 유틸리티 =====

/**
 * Backend 연결 상태 확인
 * @returns 연결 가능 여부
 */
export async function checkBackendHealth(): Promise<{
  available: boolean;
  services: {
    stems: boolean;
    transition: boolean;
    soundcloud: boolean;
  };
  latency?: number;
}> {
  if (USE_MOCK) {
    return {
      available: false,
      services: { stems: false, transition: false, soundcloud: false },
    };
  }
  
  const startTime = Date.now();
  
  try {
    const response = await fetch(`${API_CONFIG.health}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000), // 5초 타임아웃
    });
    
    if (!response.ok) {
      throw new Error('Health check failed');
    }
    
    const data = await response.json();
    const latency = Date.now() - startTime;
    
    return {
      available: true,
      services: {
        stems: true, // Assuming true if health check passes as we don't have separate service checks yet
        transition: true,
        soundcloud: true, // SoundCloud는 별도 체크
      },
      latency,
    };
  } catch (error) {
    console.warn('Backend health check failed:', error);
    return {
      available: false,
      services: { stems: false, transition: false, soundcloud: false },
    };
  }
}

/**
 * API 호출 래퍼 (자동 fallback to Mock)
 * @param apiCall 실제 API 호출 함수
 * @param mockCall Mock 함수
 * @param options 옵션
 */
export async function callWithFallback<T>(
  apiCall: () => Promise<T>,
  mockCall: () => Promise<T>,
  options?: {
    timeout?: number;      // 타임아웃 (ms)
    retries?: number;      // 재시도 횟수
    forceMock?: boolean;   // Mock 강제 사용
  }
): Promise<{ data: T; source: 'api' | 'mock' }> {
  // Mock 강제 사용 또는 환경 변수로 Mock 모드
  if (USE_MOCK || options?.forceMock) {
    return { data: await mockCall(), source: 'mock' };
  }
  
  const timeout = options?.timeout || 30000;
  const retries = options?.retries || 1;
  
  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      // 타임아웃 적용
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      const result = await Promise.race([
        apiCall(),
        new Promise<never>((_, reject) => 
          setTimeout(() => reject(new Error('API timeout')), timeout)
        ),
      ]);
      
      clearTimeout(timeoutId);
      return { data: result, source: 'api' };
    } catch (error) {
      console.warn(`API call failed (attempt ${attempt + 1}/${retries}):`, error);
      
      if (attempt === retries - 1) {
        // 마지막 시도 실패 시 Mock fallback
        console.log('Falling back to mock data');
        return { data: await mockCall(), source: 'mock' };
      }
    }
  }
  
  // 이 코드에 도달하면 안 됨
  return { data: await mockCall(), source: 'mock' };
}

/**
 * 파일 크기 포맷팅
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * 시간 포맷팅 (초 → mm:ss)
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * 예상 처리 시간 계산 (파일 크기 기반)
 * @param fileSizeBytes 파일 크기 (바이트)
 * @param operation 작업 종류
 */
export function estimateProcessingTime(
  fileSizeBytes: number,
  operation: 'stem_separation' | 'beat_analysis' | 'transition_mix'
): number {
  const sizeInMB = fileSizeBytes / (1024 * 1024);
  
  // 작업별 초당 처리량 (대략적 추정)
  const processingRates: Record<string, number> = {
    stem_separation: 0.1,  // 10MB당 약 100초
    beat_analysis: 1,      // 10MB당 약 10초
    transition_mix: 0.5,   // 10MB당 약 20초
  };
  
  const rate = processingRates[operation] || 0.5;
  return Math.ceil(sizeInMB / rate);
}

// ===== 타입 Export =====

export type ApiSource = 'api' | 'mock';
