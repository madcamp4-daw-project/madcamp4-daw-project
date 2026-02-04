/**
 * API 클라이언트 모듈 통합 Export
 */

// 공통 설정 및 유틸리티
export { 
  USE_MOCK, 
  API_CONFIG, 
  checkBackendHealth, 
  callWithFallback,
  formatFileSize,
  formatDuration,
  estimateProcessingTime,
} from './config';
export type { ApiSource } from './config';

// Stem Separation API
export {
  uploadAudioFile as uploadStemFile, // Alias
  requestStemSeparation,
  checkSeparationStatus,
  uploadAndExtract,
  getStemDownloadUrl,
} from './stemSeparationClient';
// Stem Separation API Types
export type {
  StemExtractionOptions,
  StemJobStatus,
} from './stemSeparationClient';

// Transition DJ API
export {
  uploadAudioFile as uploadTransitionFile, // Alias
  createTransitionMix,
  getStreamUrl,
} from './transition';

// Transition DJ API Types
export type {
  BeatAnalysis,
  Section,
  MixResult,
} from './transition';

// SoundCloud API
export {
  searchTracks,
  getPlaylists,
  getTracksByGenre,
  mockSearchTracks,
  mockGetTracksByGenre,
  formatDuration as formatSoundCloudDuration,
  getStreamUrl as getSoundCloudStreamUrl,
} from './soundcloud';
export type {
  SoundCloudTrack,
  SoundCloudPlaylist,
  SearchResult,
} from './soundcloud';
