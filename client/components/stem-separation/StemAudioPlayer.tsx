"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import WaveSurfer from "wavesurfer.js";

/**
 * WaveSurfer 기반 스템 웨이브폼 컴포넌트 Props
 */
interface StemWaveformProps {
  audioUrl?: string;          // 오디오 URL
  color: string;              // 웨이브 색상
  height?: number;            // 높이 (기본 50px)
  isMuted: boolean;           // 음소거 상태
  volume: number;             // 볼륨 (0-1)
  isPlaying: boolean;         // 재생 상태
  onReady?: () => void;       // 로드 완료 콜백
  onTimeUpdate?: (time: number) => void; // 시간 업데이트 콜백
  onFinish?: () => void;      // 재생 완료 콜백
}

/**
 * WaveSurfer 기반 스템 웨이브폼 컴포넌트
 * 실제 오디오 URL로부터 웨이브폼을 렌더링하고 재생 제어
 */
export function StemWaveform({
  audioUrl,
  color,
  height = 50,
  isMuted,
  volume,
  isPlaying,
  onReady,
  onTimeUpdate,
  onFinish,
}: StemWaveformProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  /**
   * WaveSurfer 인스턴스 초기화
   */
  useEffect(() => {
    if (!containerRef.current) return;

    // WaveSurfer 인스턴스 생성
    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor: color + "80", // 반투명
      cursorColor: "#fff",
      cursorWidth: 1,
      height: height,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
      normalize: true,
      backend: "WebAudio",
    });

    // 이벤트 리스너 등록
    ws.on("ready", () => {
      setIsLoaded(true);
      onReady?.();
    });

    ws.on("audioprocess", (time) => {
      onTimeUpdate?.(time);
    });

    ws.on("finish", () => {
      onFinish?.();
    });

    wavesurferRef.current = ws;

    // 오디오 로드
    if (audioUrl) {
      ws.load(audioUrl);
    }

    return () => {
      ws.destroy();
    };
  }, [audioUrl, color, height, onReady, onTimeUpdate, onFinish]);

  /**
   * 볼륨 변경 시 WaveSurfer에 반영
   */
  useEffect(() => {
    if (wavesurferRef.current && isLoaded) {
      wavesurferRef.current.setVolume(isMuted ? 0 : volume);
    }
  }, [volume, isMuted, isLoaded]);

  /**
   * 재생 상태 변경 시 WaveSurfer에 반영
   */
  useEffect(() => {
    if (wavesurferRef.current && isLoaded) {
      if (isPlaying) {
        wavesurferRef.current.play();
      } else {
        wavesurferRef.current.pause();
      }
    }
  }, [isPlaying, isLoaded]);

  /**
   * 색상 변경 시 WaveSurfer에 반영
   */
  useEffect(() => {
    if (wavesurferRef.current) {
      wavesurferRef.current.setOptions({
        waveColor: isMuted ? "#666" : color,
        progressColor: isMuted ? "#444" : color + "80",
      });
    }
  }, [color, isMuted]);

  return (
    <div
      ref={containerRef}
      className="w-full rounded overflow-hidden bg-[#2a2a2a]"
      style={{ height }}
    />
  );
}

/**
 * 4개 스템 동시 재생을 위한 오디오 플레이어 Props
 */
interface StemAudioPlayerProps {
  stems: {
    id: string;
    audioUrl?: string;
    volume: number;
    isMuted: boolean;
    isSolo: boolean;
  }[];
  isPlaying: boolean;
  onTimeUpdate?: (time: number) => void;
  onFinish?: () => void;
}

/**
 * 4개 스템 동시 재생 오디오 플레이어
 * Tone.js 기반 동기화된 재생 제어
 */
export function StemAudioPlayer({
  stems,
  isPlaying,
  onTimeUpdate,
  onFinish,
}: StemAudioPlayerProps) {
  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());
  const [loadedCount, setLoadedCount] = useState(0);
  const animationRef = useRef<number>(0);

  /**
   * 오디오 요소 생성 및 관리
   */
  useEffect(() => {
    stems.forEach((stem) => {
      if (stem.audioUrl && !audioRefs.current.has(stem.id)) {
        const audio = new Audio(stem.audioUrl);
        audio.preload = "auto";
        audio.addEventListener("canplaythrough", () => {
          setLoadedCount((prev) => prev + 1);
        });
        audio.addEventListener("ended", () => {
          onFinish?.();
        });
        audioRefs.current.set(stem.id, audio);
      }
    });

    return () => {
      audioRefs.current.forEach((audio) => {
        audio.pause();
        audio.src = "";
      });
      audioRefs.current.clear();
    };
  }, [stems, onFinish]);

  /**
   * Solo 로직: Solo 활성화된 스템만 재생
   */
  const getEffectiveVolume = useCallback(
    (stem: (typeof stems)[0]) => {
      const hasSolo = stems.some((s) => s.isSolo);
      if (hasSolo && !stem.isSolo) return 0;
      if (stem.isMuted) return 0;
      return stem.volume;
    },
    [stems]
  );

  /**
   * 볼륨 업데이트
   */
  useEffect(() => {
    stems.forEach((stem) => {
      const audio = audioRefs.current.get(stem.id);
      if (audio) {
        audio.volume = getEffectiveVolume(stem);
      }
    });
  }, [stems, getEffectiveVolume]);

  /**
   * 재생 상태 제어
   */
  useEffect(() => {
    if (isPlaying) {
      // 모든 오디오 동시 시작
      const startTime = Date.now();
      audioRefs.current.forEach((audio) => {
        audio.currentTime = 0;
        audio.play().catch(console.error);
      });

      // 타임 업데이트 루프
      const updateTime = () => {
        const firstAudio = audioRefs.current.values().next().value;
        if (firstAudio) {
          onTimeUpdate?.(firstAudio.currentTime);
        }
        animationRef.current = requestAnimationFrame(updateTime);
      };
      animationRef.current = requestAnimationFrame(updateTime);
    } else {
      // 모든 오디오 일시 정지
      audioRefs.current.forEach((audio) => {
        audio.pause();
      });
      cancelAnimationFrame(animationRef.current);
    }

    return () => {
      cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, onTimeUpdate]);

  /**
   * 시간 동기화 (모든 스템이 같은 위치에서 재생)
   */
  const seekTo = useCallback((time: number) => {
    audioRefs.current.forEach((audio) => {
      audio.currentTime = time;
    });
  }, []);

  return null; // 이 컴포넌트는 UI를 렌더링하지 않음
}

export default StemWaveform;
