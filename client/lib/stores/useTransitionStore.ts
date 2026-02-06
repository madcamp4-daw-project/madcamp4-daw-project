/**
 * Transition DJ 스토어 (Zustand)
 * 
 * 탭 전환 시에도 상태를 유지하기 위한 전역 상태 관리
 * 리셋은 명시적으로 resetAll() 호출 시에만 수행
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { BeatAnalysis } from '@/lib/api/transition';

/**
 * 덱 상태 인터페이스
 */
export interface DeckState {
  file?: File;
  trackName?: string;
  artistName?: string;
  audioUrl?: string;
  bpm: number;
  originalBpm: number;
  pitchPercent: number;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  eqLowKill: boolean;
  eqMidKill: boolean;
  eqHighKill: boolean;
  cuePoints: (number | null)[];
  loopBars: number;
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  analysis?: BeatAnalysis;
  stemMutes: {
    drum: boolean;
    bass: boolean;
    melody: boolean;
    vocal: boolean;
  };
}

/**
 * 시각화 모드 타입
 */
type ViewMode = 'waves' | 'stems';
type SubMode = 'scope' | 'timeline';

/**
 * Transition 스토어 상태
 */
interface TransitionState {
  // 시각화 모드
  viewMode: ViewMode;
  subMode: SubMode;
  showFX: boolean;
  
  // 덱 상태
  deckA: DeckState;
  deckB: DeckState;
  
  // 전역 상태
  crossfader: number;
  masterVolume: number;
  tempoSync: boolean;
  beatLock: boolean;
  isRecording: boolean;
  quantize: boolean;
  zoomLevel: number;
  
  // 백엔드 연동
  fileIdA: string | null;
  fileIdB: string | null;
  isProcessingA: boolean;
  isProcessingB: boolean;
  stemStatusA: 'idle' | 'processing' | 'completed' | 'error';
  stemStatusB: 'idle' | 'processing' | 'completed' | 'error';
  
  // Mix 처리
  isMixProcessing: boolean;
  mixProgress: number;
  
  // 액션 - 시각화
  setViewMode: (mode: ViewMode) => void;
  setSubMode: (mode: SubMode) => void;
  setShowFX: (show: boolean) => void;
  
  // 액션 - 덱
  setDeckA: (update: DeckState | ((prev: DeckState) => DeckState)) => void;
  setDeckB: (update: DeckState | ((prev: DeckState) => DeckState)) => void;
  
  // 액션 - 전역
  setCrossfader: (value: number) => void;
  setMasterVolume: (value: number) => void;
  setTempoSync: (value: boolean) => void;
  setBeatLock: (value: boolean) => void;
  setIsRecording: (value: boolean) => void;
  setQuantize: (value: boolean) => void;
  setZoomLevel: (value: number) => void;
  
  // 액션 - 백엔드 연동
  setFileIdA: (id: string | null) => void;
  setFileIdB: (id: string | null) => void;
  setIsProcessingA: (value: boolean) => void;
  setIsProcessingB: (value: boolean) => void;
  setStemStatusA: (status: 'idle' | 'processing' | 'completed' | 'error') => void;
  setStemStatusB: (status: 'idle' | 'processing' | 'completed' | 'error') => void;
  
  // 액션 - Mix 처리
  setIsMixProcessing: (value: boolean) => void;
  setMixProgress: (value: number) => void;
  
  // 리셋
  resetAll: () => void;
  resetDeckA: () => void;
  resetDeckB: () => void;
}

/**
 * 덱 초기 상태
 */
const createInitialDeck = (): DeckState => ({
  bpm: 120,
  originalBpm: 120,
  pitchPercent: 0,
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  audioUrl: undefined,
  eqLow: 50,
  eqMid: 50,
  eqHigh: 50,
  eqLowKill: false,
  eqMidKill: false,
  eqHighKill: false,
  cuePoints: [null, null, null, null, null],
  loopBars: 4,
  loopStart: null,
  loopEnd: null,
  isLooping: false,
  stemMutes: { drum: false, bass: false, melody: false, vocal: false },
});

/**
 * 초기 상태
 */
const initialState = {
  viewMode: 'stems' as ViewMode,
  subMode: 'timeline' as SubMode,
  showFX: false,
  deckA: createInitialDeck(),
  deckB: createInitialDeck(),
  crossfader: 50,
  masterVolume: 80,
  tempoSync: false,
  beatLock: false,
  isRecording: false,
  quantize: true,
  zoomLevel: 1,
  fileIdA: null,
  fileIdB: null,
  isProcessingA: false,
  isProcessingB: false,
  stemStatusA: 'idle' as const,
  stemStatusB: 'idle' as const,
  isMixProcessing: false,
  mixProgress: 0,
};

/**
 * Transition Zustand 스토어
 */
export const useTransitionStore = create<TransitionState>()(
  devtools(
    (set) => ({
      ...initialState,
      
      // ===== 시각화 액션 =====
      setViewMode: (mode) => set({ viewMode: mode }, false, 'setViewMode'),
      setSubMode: (mode) => set({ subMode: mode }, false, 'setSubMode'),
      setShowFX: (show) => set({ showFX: show }, false, 'setShowFX'),
      
      // ===== 덱 액션 =====
      setDeckA: (update) => set(
        (state) => ({
          deckA: typeof update === 'function' ? update(state.deckA) : update
        }),
        false,
        'setDeckA'
      ),
      setDeckB: (update) => set(
        (state) => ({
          deckB: typeof update === 'function' ? update(state.deckB) : update
        }),
        false,
        'setDeckB'
      ),
      
      // ===== 전역 액션 =====
      setCrossfader: (value) => set({ crossfader: value }, false, 'setCrossfader'),
      setMasterVolume: (value) => set({ masterVolume: value }, false, 'setMasterVolume'),
      setTempoSync: (value) => set({ tempoSync: value }, false, 'setTempoSync'),
      setBeatLock: (value) => set({ beatLock: value }, false, 'setBeatLock'),
      setIsRecording: (value) => set({ isRecording: value }, false, 'setIsRecording'),
      setQuantize: (value) => set({ quantize: value }, false, 'setQuantize'),
      setZoomLevel: (value) => set({ zoomLevel: value }, false, 'setZoomLevel'),
      
      // ===== 백엔드 연동 액션 =====
      setFileIdA: (id) => set({ fileIdA: id }, false, 'setFileIdA'),
      setFileIdB: (id) => set({ fileIdB: id }, false, 'setFileIdB'),
      setIsProcessingA: (value) => set({ isProcessingA: value }, false, 'setIsProcessingA'),
      setIsProcessingB: (value) => set({ isProcessingB: value }, false, 'setIsProcessingB'),
      setStemStatusA: (status) => set({ stemStatusA: status }, false, 'setStemStatusA'),
      setStemStatusB: (status) => set({ stemStatusB: status }, false, 'setStemStatusB'),
      
      // ===== Mix 처리 액션 =====
      setIsMixProcessing: (value) => set({ isMixProcessing: value }, false, 'setIsMixProcessing'),
      setMixProgress: (value) => set({ mixProgress: value }, false, 'setMixProgress'),
      
      // ===== 리셋 =====
      resetAll: () => set(initialState, false, 'resetAll'),
      resetDeckA: () => set({
        deckA: createInitialDeck(),
        fileIdA: null,
        isProcessingA: false,
        stemStatusA: 'idle',
      }, false, 'resetDeckA'),
      resetDeckB: () => set({
        deckB: createInitialDeck(),
        fileIdB: null,
        isProcessingB: false,
        stemStatusB: 'idle',
      }, false, 'resetDeckB'),
    }),
    { name: 'TransitionStore' }
  )
);

export default useTransitionStore;
