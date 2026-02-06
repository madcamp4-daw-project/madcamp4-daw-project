/**
 * Stem Separation 스토어 (Zustand)
 * 
 * 탭 전환 시에도 상태를 유지하기 위한 전역 상태 관리
 * 리셋은 명시적으로 resetAll() 호출 시에만 수행
 */

import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

/**
 * 스템 데이터 인터페이스
 */
export interface StemData {
  id: string;
  name: string;
  color: string;
  audioUrl?: string;
  volume: number;
  isSolo: boolean;
  isMuted: boolean;
  isPlaying: boolean;
  waveformData: number[];
}

/**
 * 스템 분리 스토어 상태
 */
interface StemSeparationState {
  // 상태
  originalFile: File | null;
  originalFileName: string | null;  // File 객체는 직렬화 불가, 이름만 별도 저장
  stems: StemData[];
  isPlayingAll: boolean;
  isDialogOpen: boolean;
  
  // 액션
  setOriginalFile: (file: File | null) => void;
  setStems: (stems: StemData[]) => void;
  updateStem: (id: string, updates: Partial<StemData>) => void;
  setIsPlayingAll: (isPlaying: boolean) => void;
  setIsDialogOpen: (isOpen: boolean) => void;
  togglePlayAll: () => void;
  toggleStemSolo: (id: string) => void;
  toggleStemMute: (id: string) => void;
  toggleStemPlay: (id: string) => void;
  setStemVolume: (id: string, volume: number) => void;
  
  // 리셋 (명시적 호출 시에만)
  resetAll: () => void;
}

/**
 * 초기 상태
 */
const initialState = {
  originalFile: null,
  originalFileName: null,
  stems: [],
  isPlayingAll: false,
  isDialogOpen: false,
};

/**
 * Stem Separation Zustand 스토어
 */
export const useStemSeparationStore = create<StemSeparationState>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      // ===== 기본 세터 =====
      
      /**
       * 원본 파일 설정
       */
      setOriginalFile: (file) => {
        set({ 
          originalFile: file,
          originalFileName: file?.name || null 
        }, false, 'setOriginalFile');
      },
      
      /**
       * 스템 목록 설정
       */
      setStems: (stems) => {
        set({ stems }, false, 'setStems');
      },
      
      /**
       * 개별 스템 업데이트
       */
      updateStem: (id, updates) => {
        set(
          (state) => ({
            stems: state.stems.map((s) =>
              s.id === id ? { ...s, ...updates } : s
            ),
          }),
          false,
          'updateStem'
        );
      },
      
      /**
       * 전체 재생 상태 설정
       */
      setIsPlayingAll: (isPlaying) => {
        set({ isPlayingAll: isPlaying }, false, 'setIsPlayingAll');
      },
      
      /**
       * 다이얼로그 상태 설정
       */
      setIsDialogOpen: (isOpen) => {
        set({ isDialogOpen: isOpen }, false, 'setIsDialogOpen');
      },
      
      // ===== 토글 액션 =====
      
      /**
       * 전체 재생 토글
       */
      togglePlayAll: () => {
        const newState = !get().isPlayingAll;
        set(
          (state) => ({
            isPlayingAll: newState,
            stems: state.stems.map((s) => ({ ...s, isPlaying: newState })),
          }),
          false,
          'togglePlayAll'
        );
      },
      
      /**
       * 스템 솔로 토글
       */
      toggleStemSolo: (id) => {
        set(
          (state) => {
            const targetStem = state.stems.find((s) => s.id === id);
            const newSoloState = targetStem ? !targetStem.isSolo : false;
            
            return {
              stems: state.stems.map((s) => {
                if (s.id === id) {
                  return { ...s, isSolo: newSoloState, isMuted: false };
                } else {
                  if (newSoloState) {
                    return { ...s, isMuted: true };
                  } else {
                    const otherHasSolo = state.stems.some(
                      (other) => other.id !== id && other.isSolo
                    );
                    if (!otherHasSolo) {
                      return { ...s, isMuted: false };
                    }
                  }
                  return s;
                }
              }),
            };
          },
          false,
          'toggleStemSolo'
        );
      },
      
      /**
       * 스템 뮤트 토글
       */
      toggleStemMute: (id) => {
        set(
          (state) => ({
            stems: state.stems.map((s) => {
              if (s.id === id) {
                return { ...s, isMuted: !s.isMuted, isSolo: !s.isMuted ? false : s.isSolo };
              }
              return s;
            }),
          }),
          false,
          'toggleStemMute'
        );
      },
      
      /**
       * 스템 재생 토글
       */
      toggleStemPlay: (id) => {
        set(
          (state) => ({
            stems: state.stems.map((s) =>
              s.id === id ? { ...s, isPlaying: !s.isPlaying } : s
            ),
          }),
          false,
          'toggleStemPlay'
        );
      },
      
      /**
       * 스템 볼륨 설정
       */
      setStemVolume: (id, volume) => {
        set(
          (state) => ({
            stems: state.stems.map((s) =>
              s.id === id ? { ...s, volume } : s
            ),
          }),
          false,
          'setStemVolume'
        );
      },
      
      // ===== 리셋 =====
      
      /**
       * 전체 상태 초기화 (명시적 호출 시에만)
       */
      resetAll: () => {
        set(initialState, false, 'resetAll');
      },
    }),
    { name: 'StemSeparationStore' }
  )
);

export default useStemSeparationStore;
