/**
 * SoundCloud API 클라이언트 (비활성화됨)
 * 
 * 이 파일은 더 이상 사용되지 않습니다.
 * 실제 트랙은 직접 업로드를 통해서만 추가됩니다.
 * 
 * @deprecated SoundCloud 연동 기능 비활성화
 */

// 기존 타입 정의는 호환성을 위해 유지 (다른 곳에서 import할 수 있음)

/**
 * SoundCloud 트랙 정보 (레거시 타입)
 * @deprecated UploadedTrack 타입을 사용하세요
 */
export interface SoundCloudTrack {
  id: number;
  title: string;
  artist: string;
  duration: number;      // 밀리초
  bpm?: number;
  genre?: string;
  artworkUrl?: string;
  streamUrl?: string;
  permalinkUrl: string;
  playbackCount: number;
  likesCount: number;
}

/**
 * 시간 포맷팅 (밀리초 → mm:ss)
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// ======================================
// 아래 Mock 함수들은 더 이상 사용되지 않음
// ======================================

/**
 * @deprecated Mock 데이터 삭제됨
 */
export function mockSearchTracks(_query: string): { collection: SoundCloudTrack[]; totalCount: number } {
  console.warn('[DEPRECATED] mockSearchTracks: SoundCloud 연동이 비활성화되었습니다.');
  return { collection: [], totalCount: 0 };
}

/**
 * @deprecated Mock 데이터 삭제됨
 */
export function mockGetTracksByGenre(_genre: string): SoundCloudTrack[] {
  console.warn('[DEPRECATED] mockGetTracksByGenre: SoundCloud 연동이 비활성화되었습니다.');
  return [];
}
