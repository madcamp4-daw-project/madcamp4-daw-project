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
  uploadForSeparation,
  checkSeparationStatus,
  downloadStem,
  downloadAllStems,
  cancelSeparation,
  mockUploadForSeparation,
  mockCheckStatus,
} from './stemSeparation';
export type {
  StemExtractionOptions,
  StemJobStatus,
  StemExtractionResponse,
} from './stemSeparation';

// Transition DJ API
export {
  uploadAudioFile,
  analyzeBeats,
  mockAnalyzeBeats,
  requestStemSeparation,
  getStemStatus,
  mockGetStemStatus,
  createTransitionMix,
  getStreamUrl,
} from './transition';
export type {
  BeatAnalysis,
  Section,
  StemResult,
  StemVisualsData,
  StemNote,
  DrumHit,
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
