"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import * as Tone from "tone";

/**
 * 덱 플레이어 상태
 */
export interface DeckPlayerState {
  isLoaded: boolean;      // 오디오 로드 완료
  isPlaying: boolean;     // 재생 중
  isPaused: boolean;      // 일시정지
  currentTime: number;    // 현재 재생 시간 (초)
  duration: number;       // 전체 길이 (초)
  bpm: number;            // 현재 BPM
  originalBpm: number;    // 원본 BPM
  pitchPercent: number;   // 피치 조절 (-8% ~ +8%)
  volume: number;         // 볼륨 (0-1)
  isMuted: boolean;       // 뮤트 상태
}

/**
 * Hot Cue 포인트
 */
export interface HotCue {
  index: number;          // 1-5
  time: number | null;    // 타임스탬프 (초)
  color: string;          // 표시 색상
}

/**
 * 루프 설정
 */
export interface LoopSettings {
  isActive: boolean;      // 루프 활성화
  startTime: number | null;
  endTime: number | null;
  bars: number;           // 루프 길이 (바)
}

interface UseDeckPlayerOptions {
  onTimeUpdate?: (time: number) => void;
  onEnded?: () => void;
  onLoaded?: (duration: number, bpm: number) => void;
}

/**
 * 덱 플레이어 훅
 * Tone.js 기반 오디오 재생 및 효과 처리
 */
export function useDeckPlayer(options?: UseDeckPlayerOptions) {
  const playerRef = useRef<Tone.Player | null>(null);
  const grainPlayerRef = useRef<Tone.GrainPlayer | null>(null);
  const channelRef = useRef<Tone.Channel | null>(null);
  const animationRef = useRef<number>(0);

  const [state, setState] = useState<DeckPlayerState>({
    isLoaded: false,
    isPlaying: false,
    isPaused: false,
    currentTime: 0,
    duration: 0,
    bpm: 120,
    originalBpm: 120,
    pitchPercent: 0,
    volume: 0.8,
    isMuted: false,
  });

  const [hotCues, setHotCues] = useState<HotCue[]>([
    { index: 1, time: null, color: "#ef4444" },
    { index: 2, time: null, color: "#f97316" },
    { index: 3, time: null, color: "#eab308" },
    { index: 4, time: null, color: "#22c55e" },
    { index: 5, time: null, color: "#3b82f6" },
  ]);

  const [loop, setLoop] = useState<LoopSettings>({
    isActive: false,
    startTime: null,
    endTime: null,
    bars: 4,
  });

  /**
   * 오디오 파일 로드
   */
  const loadAudio = useCallback(
    async (urlOrBlob: string | Blob) => {
      try {
        // 기존 플레이어 정리
        if (playerRef.current) {
          playerRef.current.stop();
          playerRef.current.dispose();
        }
        if (grainPlayerRef.current) {
          grainPlayerRef.current.stop();
          grainPlayerRef.current.dispose();
        }

        // Tone.js 시작
        await Tone.start();

        // URL 생성 (Blob인 경우)
        const url =
          typeof urlOrBlob === "string"
            ? urlOrBlob
            : URL.createObjectURL(urlOrBlob);

        // 채널 생성 (볼륨/팬 제어용)
        if (!channelRef.current) {
          channelRef.current = new Tone.Channel().toDestination();
        }

        // GrainPlayer 생성 (피치/타임스트레칭용)
        const grainPlayer = new Tone.GrainPlayer({
          url,
          loop: false,
          grainSize: 0.2,
          overlap: 0.1,
          onload: () => {
            const duration = grainPlayer.buffer.duration;
            const estimatedBpm = 120; // 실제로는 백엔드 분석 결과 사용

            setState((prev) => ({
              ...prev,
              isLoaded: true,
              duration,
              bpm: estimatedBpm,
              originalBpm: estimatedBpm,
              currentTime: 0,
            }));

            options?.onLoaded?.(duration, estimatedBpm);
          },
        }).connect(channelRef.current);

        grainPlayerRef.current = grainPlayer;

        // Blob URL 정리
        if (typeof urlOrBlob !== "string") {
          // URL.revokeObjectURL(url); // 로드 완료 후 정리하면 안됨
        }
      } catch (error) {
        console.error("Failed to load audio:", error);
      }
    },
    [options]
  );

  /**
   * 재생
   */
  const play = useCallback(() => {
    if (!grainPlayerRef.current || !state.isLoaded) return;

    grainPlayerRef.current.start(undefined, state.currentTime);
    setState((prev) => ({ ...prev, isPlaying: true, isPaused: false }));

    // 시간 업데이트 루프
    const startTime = Tone.now();
    const startPosition = state.currentTime;

    const updateTime = () => {
      if (!state.isPlaying) return;

      const elapsed = Tone.now() - startTime;
      const newTime = startPosition + elapsed * state.pitchPercent / 100 + elapsed;

      if (newTime >= state.duration) {
        stop();
        options?.onEnded?.();
        return;
      }

      setState((prev) => ({ ...prev, currentTime: newTime }));
      options?.onTimeUpdate?.(newTime);

      // 루프 체크
      if (loop.isActive && loop.endTime && newTime >= loop.endTime) {
        seekTo(loop.startTime || 0);
      }

      animationRef.current = requestAnimationFrame(updateTime);
    };

    animationRef.current = requestAnimationFrame(updateTime);
  }, [state.isLoaded, state.currentTime, state.duration, state.pitchPercent, loop, options]);

  /**
   * 일시정지
   */
  const pause = useCallback(() => {
    if (!grainPlayerRef.current) return;

    grainPlayerRef.current.stop();
    cancelAnimationFrame(animationRef.current);
    setState((prev) => ({ ...prev, isPlaying: false, isPaused: true }));
  }, []);

  /**
   * 정지
   */
  const stop = useCallback(() => {
    if (!grainPlayerRef.current) return;

    grainPlayerRef.current.stop();
    cancelAnimationFrame(animationRef.current);
    setState((prev) => ({
      ...prev,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
    }));
  }, []);

  /**
   * 재생/정지 토글
   */
  const playPause = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else {
      play();
    }
  }, [state.isPlaying, play, pause]);

  /**
   * 특정 시간으로 이동
   */
  const seekTo = useCallback(
    (time: number) => {
      const clampedTime = Math.max(0, Math.min(time, state.duration));
      setState((prev) => ({ ...prev, currentTime: clampedTime }));

      if (state.isPlaying && grainPlayerRef.current) {
        grainPlayerRef.current.stop();
        grainPlayerRef.current.start(undefined, clampedTime);
      }
    },
    [state.duration, state.isPlaying]
  );

  /**
   * 피치/템포 조절 (-8% ~ +8%)
   */
  const setPitch = useCallback(
    (percent: number) => {
      const clampedPercent = Math.max(-8, Math.min(8, percent));
      const newBpm = state.originalBpm * (1 + clampedPercent / 100);

      if (grainPlayerRef.current) {
        grainPlayerRef.current.playbackRate = 1 + clampedPercent / 100;
      }

      setState((prev) => ({
        ...prev,
        pitchPercent: clampedPercent,
        bpm: Math.round(newBpm * 10) / 10,
      }));
    },
    [state.originalBpm]
  );

  /**
   * 볼륨 설정 (0-1)
   */
  const setVolume = useCallback((volume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, volume));
    if (channelRef.current) {
      channelRef.current.volume.value = Tone.gainToDb(clampedVolume);
    }
    setState((prev) => ({ ...prev, volume: clampedVolume, isMuted: false }));
  }, []);

  /**
   * 뮤트 토글
   */
  const toggleMute = useCallback(() => {
    if (channelRef.current) {
      channelRef.current.mute = !state.isMuted;
    }
    setState((prev) => ({ ...prev, isMuted: !prev.isMuted }));
  }, [state.isMuted]);

  /**
   * Hot Cue 설정
   */
  const setHotCue = useCallback(
    (index: number) => {
      setHotCues((prev) =>
        prev.map((cue) =>
          cue.index === index ? { ...cue, time: state.currentTime } : cue
        )
      );
    },
    [state.currentTime]
  );

  /**
   * Hot Cue로 점프
   */
  const jumpToHotCue = useCallback(
    (index: number) => {
      const cue = hotCues.find((c) => c.index === index);
      if (cue?.time !== null && cue?.time !== undefined) {
        seekTo(cue.time);
      }
    },
    [hotCues, seekTo]
  );

  /**
   * Hot Cue 삭제
   */
  const clearHotCue = useCallback((index: number) => {
    setHotCues((prev) =>
      prev.map((cue) => (cue.index === index ? { ...cue, time: null } : cue))
    );
  }, []);

  /**
   * 루프 In 설정
   */
  const setLoopIn = useCallback(() => {
    setLoop((prev) => ({ ...prev, startTime: state.currentTime }));
  }, [state.currentTime]);

  /**
   * 루프 Out 설정 및 활성화
   */
  const setLoopOut = useCallback(() => {
    setLoop((prev) => ({
      ...prev,
      endTime: state.currentTime,
      isActive: true,
    }));
  }, [state.currentTime]);

  /**
   * 자동 루프 설정 (바 단위)
   */
  const setAutoLoop = useCallback(
    (bars: number) => {
      const beatDuration = 60 / state.bpm;
      const loopDuration = bars * 4 * beatDuration; // 4비트/바

      setLoop((prev) => ({
        ...prev,
        bars,
        startTime: state.currentTime,
        endTime: state.currentTime + loopDuration,
        isActive: true,
      }));
    },
    [state.currentTime, state.bpm]
  );

  /**
   * 루프 토글
   */
  const toggleLoop = useCallback(() => {
    setLoop((prev) => ({ ...prev, isActive: !prev.isActive }));
  }, []);

  /**
   * 루프 해제
   */
  const clearLoop = useCallback(() => {
    setLoop({
      isActive: false,
      startTime: null,
      endTime: null,
      bars: 4,
    });
  }, []);

  /**
   * 언로드
   */
  const unload = useCallback(() => {
    stop();
    if (grainPlayerRef.current) {
      grainPlayerRef.current.dispose();
      grainPlayerRef.current = null;
    }
    setState({
      isLoaded: false,
      isPlaying: false,
      isPaused: false,
      currentTime: 0,
      duration: 0,
      bpm: 120,
      originalBpm: 120,
      pitchPercent: 0,
      volume: 0.8,
      isMuted: false,
    });
  }, [stop]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      cancelAnimationFrame(animationRef.current);
      grainPlayerRef.current?.dispose();
      channelRef.current?.dispose();
    };
  }, []);

  return {
    state,
    hotCues,
    loop,
    // 기본 제어
    loadAudio,
    play,
    pause,
    stop,
    playPause,
    seekTo,
    // 피치/볼륨
    setPitch,
    setVolume,
    toggleMute,
    // Hot Cue
    setHotCue,
    jumpToHotCue,
    clearHotCue,
    // 루프
    setLoopIn,
    setLoopOut,
    setAutoLoop,
    toggleLoop,
    clearLoop,
    // 정리
    unload,
  };
}

export default useDeckPlayer;
