/**
 * Mixer 스토어 (Zustand)
 * 
 * 동적 트랙 관리, 볼륨/팬/뮤트/솔로 상태 관리
 * MixerEngine과 동기화하여 실시간 오디오 처리
 */

import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';

/**
 * 믹서 트랙 인터페이스
 */
export interface MixerTrack {
  id: string;                // 고유 ID
  name: string;              // 트랙 이름
  color: string;             // 트랙 색상
  volume: number;            // 볼륨 (dB, -60 ~ +6)
  pan: number;               // 패닝 (-1 ~ +1, 0=Center)
  muted: boolean;            // 뮤트 상태
  solo: boolean;             // 솔로 상태
  armed: boolean;            // 녹음 대기 상태
  audioUrl?: string;         // 오디오 파일 URL
  sourceType: 'file' | 'stem' | 'instrument' | 'aux';
  // Compatibility with DAW Track
  type?: 'audio' | 'midi';
  clips?: any[];
}

export interface ProChannelState {
  eq: {
    enabled: boolean;
    bands: { frequency: number; gain: number; q: number; type: string; enabled: boolean }[];
  };
  compressor: {
    enabled: boolean;
    threshold: number;
    ratio: number;
    attack: number;
    release: number;
    makeup: number;
  };
  tape: {
    enabled: boolean;
    drive: number;
    warmth: number;
    speed: string;
  };
  console: {
    enabled: boolean;
    input: number;
    drive: number;
    type: string;
  };
  tube: {
    enabled: boolean;
    drive: number;
    lowCut: boolean;
  };
}

/**
 * 믹서 스토어 상태
 */
interface MixerState {
  // 상태
  tracks: MixerTrack[];
  masterVolume: number;      // 마스터 볼륨 (dB)
  selectedTrackId: string | null;
  proChannel: ProChannelState;
  
  // 액션 - ProChannel
  setProChannelState: (module: keyof ProChannelState, newState: any) => void;

  
  // 액션 - 트랙 관리
  addTrack: (track: Omit<MixerTrack, 'id'>) => string;  // 트랙 추가, ID 반환
  removeTrack: (id: string) => void;                     // 트랙 삭제
  reorderTracks: (fromIndex: number, toIndex: number) => void;  // 순서 변경
  
  // 액션 - 트랙 제어
  setVolume: (id: string, volume: number) => void;
  setPan: (id: string, pan: number) => void;
  setMute: (id: string, muted: boolean) => void;
  toggleMute: (id: string) => void;
  setSolo: (id: string, solo: boolean) => void;
  toggleSolo: (id: string) => void;
  setArmed: (id: string, armed: boolean) => void;
  toggleArmed: (id: string) => void;
  
  // 액션 - 마스터
  setMasterVolume: (volume: number) => void;
  
  // 액션 - 선택
  selectTrack: (id: string | null) => void;
  
  // 유틸리티
  resetMixer: () => void;
  clearAllMutes: () => void;
  clearAllSolos: () => void;
  
  // API Sync
  loadFromServer: () => Promise<void>;
  saveToServer: () => Promise<void>;
}

/**
 * 고유 ID 생성
 */
const generateId = () => `track-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

/**
 * 초기 상태
 */
const initialProChannelState: ProChannelState = {
  eq: {
    enabled: true,
    bands: [
      { frequency: 80, gain: 0, q: 1, type: "lowshelf", enabled: true },
      { frequency: 250, gain: 0, q: 1.4, type: "peaking", enabled: true },
      { frequency: 1000, gain: 0, q: 1.4, type: "peaking", enabled: true },
      { frequency: 4000, gain: 0, q: 1.4, type: "peaking", enabled: true },
      { frequency: 12000, gain: 0, q: 1, type: "highshelf", enabled: true },
    ]
  },
  compressor: { enabled: true, threshold: -20, ratio: 4, attack: 10, release: 100, makeup: 0 },
  tape: { enabled: true, drive: 30, warmth: 50, speed: "15" },
  console: { enabled: true, input: 0, drive: 40, type: "ssl" },
  tube: { enabled: false, drive: 25, lowCut: false },
};

const initialState = {
  tracks: [],
  masterVolume: 0,
  selectedTrackId: null,
  proChannel: initialProChannelState,
};

/**
 * Mixer Zustand 스토어
 */
export const useMixerStore = create<MixerState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        // ===== 트랙 관리 =====
        
        /**
         * 트랙 추가
         * @returns 생성된 트랙 ID
         */
        addTrack: (track) => {
          const id = generateId();
          const newTrack: MixerTrack = {
            ...track,
            id,
          };
          set(
            (state) => ({ tracks: [...state.tracks, newTrack] }),
            false,
            'addTrack'
          );
          return id;
        },
        
        /**
         * 트랙 삭제
         */
        removeTrack: (id) => {
          set(
            (state) => ({
              tracks: state.tracks.filter((t) => t.id !== id),
              selectedTrackId: state.selectedTrackId === id ? null : state.selectedTrackId,
            }),
            false,
            'removeTrack'
          );
        },
        
        /**
         * 트랙 순서 변경
         */
        reorderTracks: (fromIndex, toIndex) => {
          set(
            (state) => {
              const tracks = [...state.tracks];
              const [removed] = tracks.splice(fromIndex, 1);
              tracks.splice(toIndex, 0, removed);
              return { tracks };
            },
            false,
            'reorderTracks'
          );
        },
        
        // ===== 트랙 제어 =====
        
        /**
         * 볼륨 설정 (-60dB ~ +6dB)
         */
        setVolume: (id, volume) => {
          const clampedVolume = Math.max(-60, Math.min(6, volume));
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, volume: clampedVolume } : t
              ),
            }),
            false,
            'setVolume'
          );
        },
        
        /**
         * 팬 설정 (-1 ~ +1)
         */
        setPan: (id, pan) => {
          const clampedPan = Math.max(-1, Math.min(1, pan));
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, pan: clampedPan } : t
              ),
            }),
            false,
            'setPan'
          );
        },
        
        /**
         * 뮤트 설정
         */
        setMute: (id, muted) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, muted } : t
              ),
            }),
            false,
            'setMute'
          );
        },
        
        /**
         * 뮤트 토글
         */
        toggleMute: (id) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, muted: !t.muted } : t
              ),
            }),
            false,
            'toggleMute'
          );
        },
        
        /**
         * 솔로 설정
         */
        setSolo: (id, solo) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, solo } : t
              ),
            }),
            false,
            'setSolo'
          );
        },
        
        /**
         * 솔로 토글
         */
        toggleSolo: (id) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, solo: !t.solo } : t
              ),
            }),
            false,
            'toggleSolo'
          );
        },
        
        /**
         * 녹음 대기 설정
         */
        setArmed: (id, armed) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, armed } : t
              ),
            }),
            false,
            'setArmed'
          );
        },
        
        /**
         * 녹음 대기 토글
         */
        toggleArmed: (id) => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) =>
                t.id === id ? { ...t, armed: !t.armed } : t
              ),
            }),
            false,
            'toggleArmed'
          );
        },
        
        // ===== 마스터 =====
        
        /**
         * 마스터 볼륨 설정
         */
        setMasterVolume: (volume) => {
          const clampedVolume = Math.max(-60, Math.min(6, volume));
          set({ masterVolume: clampedVolume }, false, 'setMasterVolume');
        },
        
        // ===== 선택 =====
        
        /**
         * 트랙 선택
         */
        selectTrack: (id) => {
          set({ selectedTrackId: id }, false, 'selectTrack');
        },

        // ===== ProChannel =====
        setProChannelState: (module, newState) => {
            set((state) => ({
                proChannel: {
                    ...state.proChannel,
                    [module]: { ...state.proChannel[module], ...newState }
                }
            }), false, 'setProChannelState');
        },
        
        // ===== 유틸리티 =====
        
        /**
         * 믹서 초기화
         */
        resetMixer: () => {
          set(initialState, false, 'resetMixer');
        },
        
        /**
         * 모든 뮤트 해제
         */
        clearAllMutes: () => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) => ({ ...t, muted: false })),
            }),
            false,
            'clearAllMutes'
          );
        },
        
        /**
         * 모든 솔로 해제
         */
        clearAllSolos: () => {
          set(
            (state) => ({
              tracks: state.tracks.map((t) => ({ ...t, solo: false })),
            }),
            false,
            'clearAllSolos'
          );
        },

        // ===== API Sync =====
        loadFromServer: async () => {
          try {
            const response = await fetch('/api/project');
             if (!response.ok) throw new Error('Failed to fetch project');
             const data = await response.json();
             if (data.success && data.project && data.project.mixer) {
                 const mixerState = data.project.mixer;
                 set({
                     masterVolume: mixerState.masterVolume || 0,
                     tracks: mixerState.tracks || [],
                     proChannel: data.project.proChannel || initialProChannelState,
                 }, false, 'loadFromServer');
             }
          } catch (e) {
              console.error(e);
          }
        },

        saveToServer: async () => {
             const state = get();
             const projectData = {
                 mixer: {
                     masterVolume: state.masterVolume,
                     tracks: state.tracks
                 },
                  proChannel: state.proChannel
             };
             
             try {
                await fetch('/api/project', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(projectData)
                });
             } catch (e) {
                 console.error(e);
             }
        },
      }),
      {
        name: 'mixer-storage',
        partialize: (state) => ({
          // 영속화할 상태만 선택
          masterVolume: state.masterVolume,
          proChannel: state.proChannel,
        }),
      }
    ),
    { name: 'MixerStore' }
  )
);

/**
 * 선택된 트랙 가져오기 (선택자 훅)
 */
export const useSelectedTrack = () => {
  return useMixerStore((state) => {
    const id = state.selectedTrackId;
    return id ? state.tracks.find((t) => t.id === id) : null;
  });
};

/**
 * 솔로된 트랙이 있는지 확인
 */
export const useHasSoloedTracks = () => {
  return useMixerStore((state) => state.tracks.some((t) => t.solo));
};

export default useMixerStore;
