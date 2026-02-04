"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";

/**
 * WaveSurfer 옵션 인터페이스
 */
interface UseWaveSurferOptions {
  container: HTMLElement | null;
  audioUrl?: string;
  audioBlob?: Blob;
  waveColor?: string;
  progressColor?: string;
  cursorColor?: string;
  barWidth?: number;
  barGap?: number;
  barRadius?: number;
  height?: number;
  responsive?: boolean;
  normalize?: boolean;
  interact?: boolean;
  hideScrollbar?: boolean;
}

/**
 * 3밴드 컬러 설정
 */
interface BandColors {
  low: string;   // 저음 (빨강)
  mid: string;   // 중음 (녹색)
  high: string;  // 고음 (파랑)
}

/**
 * WaveSurfer 상태
 */
interface WaveSurferState {
  isReady: boolean;
  isPlaying: boolean;
  duration: number;
  currentTime: number;
  volume: number;
  playbackRate: number;
}

/**
 * WaveSurfer.js 통합 훅
 * 오디오 파일의 실제 웨이브폼을 렌더링하고 제어
 */
export function useWaveSurfer(options: UseWaveSurferOptions) {
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const animationRef = useRef<number>(0);

  const [state, setState] = useState<WaveSurferState>({
    isReady: false,
    isPlaying: false,
    duration: 0,
    currentTime: 0,
    volume: 1,
    playbackRate: 1,
  });

  /**
   * WaveSurfer 인스턴스 생성
   */
  useEffect(() => {
    if (!options.container) return;

    // 기존 인스턴스 정리
    if (wavesurferRef.current) {
      wavesurferRef.current.destroy();
    }

    // 새 인스턴스 생성
    const ws = WaveSurfer.create({
      container: options.container,
      waveColor: options.waveColor || "#4a5568",
      progressColor: options.progressColor || "#8b5cf6",
      cursorColor: options.cursorColor || "#ef4444",
      barWidth: options.barWidth || 2,
      barGap: options.barGap || 1,
      barRadius: options.barRadius || 2,
      height: options.height || 128,
      normalize: options.normalize ?? true,
      interact: options.interact ?? true,
      hideScrollbar: options.hideScrollbar ?? true,
    });

    // 이벤트 리스너 등록
    ws.on("ready", () => {
      setState((prev) => ({
        ...prev,
        isReady: true,
        duration: ws.getDuration(),
      }));
    });

    ws.on("play", () => {
      setState((prev) => ({ ...prev, isPlaying: true }));
    });

    ws.on("pause", () => {
      setState((prev) => ({ ...prev, isPlaying: false }));
    });

    ws.on("audioprocess", () => {
      setState((prev) => ({
        ...prev,
        currentTime: ws.getCurrentTime(),
      }));
    });

    ws.on("seeking", () => {
      setState((prev) => ({
        ...prev,
        currentTime: ws.getCurrentTime(),
      }));
    });

    ws.on("error", (error) => {
      console.error("WaveSurfer error:", error);
    });

    wavesurferRef.current = ws;

    // 오디오 로드
    if (options.audioUrl) {
      ws.load(options.audioUrl);
    } else if (options.audioBlob) {
      ws.loadBlob(options.audioBlob);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
      ws.destroy();
    };
  }, [options.container, options.audioUrl, options.audioBlob]);

  /**
   * 재생/정지 토글
   */
  const playPause = useCallback(() => {
    wavesurferRef.current?.playPause();
  }, []);

  /**
   * 재생
   */
  const play = useCallback(() => {
    wavesurferRef.current?.play();
  }, []);

  /**
   * 정지
   */
  const pause = useCallback(() => {
    wavesurferRef.current?.pause();
  }, []);

  /**
   * 정지 및 처음으로
   */
  const stop = useCallback(() => {
    wavesurferRef.current?.stop();
    setState((prev) => ({ ...prev, currentTime: 0, isPlaying: false }));
  }, []);

  /**
   * 특정 시간으로 이동 (초)
   */
  const seekTo = useCallback((seconds: number) => {
    const duration = wavesurferRef.current?.getDuration() || 1;
    const progress = Math.max(0, Math.min(1, seconds / duration));
    wavesurferRef.current?.seekTo(progress);
    setState((prev) => ({ ...prev, currentTime: seconds }));
  }, []);

  /**
   * 진행률로 이동 (0-1)
   */
  const seekToProgress = useCallback((progress: number) => {
    wavesurferRef.current?.seekTo(Math.max(0, Math.min(1, progress)));
  }, []);

  /**
   * 볼륨 설정 (0-1)
   */
  const setVolume = useCallback((volume: number) => {
    const v = Math.max(0, Math.min(1, volume));
    wavesurferRef.current?.setVolume(v);
    setState((prev) => ({ ...prev, volume: v }));
  }, []);

  /**
   * 재생 속도 설정 (0.5-2.0)
   */
  const setPlaybackRate = useCallback((rate: number) => {
    const r = Math.max(0.5, Math.min(2, rate));
    wavesurferRef.current?.setPlaybackRate(r);
    setState((prev) => ({ ...prev, playbackRate: r }));
  }, []);

  /**
   * 줌 레벨 설정 (minPxPerSec)
   */
  const zoom = useCallback((pxPerSec: number) => {
    wavesurferRef.current?.zoom(pxPerSec);
  }, []);

  /**
   * 피크 데이터 추출
   * 커스텀 렌더링에 사용
   */
  const exportPeaks = useCallback((): number[][] | null => {
    return wavesurferRef.current?.exportPeaks() || null;
  }, []);

  /**
   * 오디오 URL 또는 Blob 로드
   */
  const load = useCallback((urlOrBlob: string | Blob) => {
    if (typeof urlOrBlob === "string") {
      wavesurferRef.current?.load(urlOrBlob);
    } else {
      wavesurferRef.current?.loadBlob(urlOrBlob);
    }
    setState((prev) => ({ ...prev, isReady: false }));
  }, []);

  /**
   * 빈 상태로 리셋
   */
  const empty = useCallback(() => {
    wavesurferRef.current?.empty();
    setState({
      isReady: false,
      isPlaying: false,
      duration: 0,
      currentTime: 0,
      volume: 1,
      playbackRate: 1,
    });
  }, []);

  /**
   * 인스턴스 파괴
   */
  const destroy = useCallback(() => {
    wavesurferRef.current?.destroy();
    wavesurferRef.current = null;
  }, []);

  return {
    wavesurfer: wavesurferRef.current,
    state,
    // 제어 메서드
    playPause,
    play,
    pause,
    stop,
    seekTo,
    seekToProgress,
    setVolume,
    setPlaybackRate,
    zoom,
    // 유틸리티
    exportPeaks,
    load,
    empty,
    destroy,
  };
}

export default useWaveSurfer;
