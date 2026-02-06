"use client";

import React, { useRef, useEffect, useState } from "react";
import type { DeckState } from "@/lib/stores/useTransitionStore";
import { useWaveSurfer } from "@/hooks/useWaveSurfer";

interface WaveformDisplayProps {
  deck: DeckState;
  zoomLevel: number;
  color: string;
  audioUrl?: string;
  onSeek?: (time: number) => void;
}

/**
 * 웨이브폼 디스플레이 컴포넌트
 * WaveSurfer.js 기반 실제 오디오 웨이브폼 렌더링
 * Canvas 폴백: 오디오 없을 시 Mock 웨이브폼 표시
 */
export function WaveformDisplay({
  deck,
  zoomLevel,
  color,
  audioUrl,
  onSeek,
}: WaveformDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [useWaveSurferMode, setUseWaveSurferMode] = useState(false);

  // WaveSurfer 훅
  const wavesurfer = useWaveSurfer({
    container: useWaveSurferMode ? containerRef.current : null,
    audioUrl: audioUrl,
    waveColor: color,
    progressColor: "#ef4444",
    cursorColor: "#ef4444",
    barWidth: 2,
    barGap: 1,
    height: 150,
    normalize: true,
  });

  // 오디오 URL이 있으면 WaveSurfer 모드 활성화
  useEffect(() => {
    if (audioUrl && containerRef.current) {
      setUseWaveSurferMode(true);
    } else {
      setUseWaveSurferMode(false);
    }
  }, [audioUrl]);

  // 줌 레벨 변경
  useEffect(() => {
    if (wavesurfer.wavesurfer) {
      wavesurfer.zoom(50 * zoomLevel);
    }
  }, [zoomLevel, wavesurfer]);

  // 재생 위치 동기화
  useEffect(() => {
    if (wavesurfer.state.isReady && deck.duration > 0) {
      const progress = deck.currentTime / deck.duration;
      wavesurfer.seekToProgress(progress);
    }
  }, [deck.currentTime, deck.duration, wavesurfer]);

  /**
   * Canvas Mock 웨이브폼 렌더링
   * 오디오 파일이 없을 때 사용
   */
  useEffect(() => {
    if (useWaveSurferMode) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // 배경
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, width, height);

    if (!deck.file) {
      // 트랙 없음 표시
      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("오디오 파일을 드래그하여 로드하세요", width / 2, height / 2);
      return;
    }

    // Mock 웨이브폼 데이터 생성
    const barCount = Math.floor(width / 3);
    const centerY = height / 2;

    // 3밴드 컬러 (저=빨강, 중=녹색, 고=파랑)
    const colors = {
      low: "#ff3366",
      mid: "#00ff88",
      high: "#3388ff",
    };

    for (let i = 0; i < barCount; i++) {
      const x = i * 3;
      const progress = i / barCount;

      // pseudo-random 높이 (시드 기반)
      const seed = Math.sin(progress * 50 + deck.bpm) * 0.5 + 0.5;
      const lowHeight = seed * height * 0.3;
      const midHeight = (seed * 0.7 + 0.3) * height * 0.25;
      const highHeight = seed * 0.5 * height * 0.15;

      // 저음 (아래쪽)
      ctx.fillStyle = colors.low;
      ctx.fillRect(x, centerY, 2, lowHeight);
      ctx.fillRect(x, centerY - lowHeight, 2, lowHeight);

      // 중음 (중간)
      ctx.fillStyle = colors.mid;
      ctx.fillRect(x, centerY - midHeight - lowHeight, 2, midHeight);
      ctx.fillRect(x, centerY + lowHeight, 2, midHeight);

      // 고음 (바깥쪽)
      ctx.fillStyle = colors.high;
      ctx.fillRect(x, centerY - midHeight - lowHeight - highHeight, 2, highHeight);
      ctx.fillRect(x, centerY + lowHeight + midHeight, 2, highHeight);
    }

    // 비트 그리드 (세로선)
    if (deck.analysis?.beats) {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      deck.analysis.beats.forEach((beat, idx) => {
        const x = (beat / (deck.duration || 180)) * width;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();

        // 다운비트는 더 밝게
        if (deck.analysis?.downbeats?.includes(idx)) {
          ctx.strokeStyle = "rgba(255,255,255,0.3)";
          ctx.stroke();
          ctx.strokeStyle = "rgba(255,255,255,0.1)";
        }
      });
    }

    // 현재 재생 위치
    if (deck.duration > 0) {
      const playheadX = (deck.currentTime / deck.duration) * width;
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(playheadX, 0);
      ctx.lineTo(playheadX, height);
      ctx.stroke();
    }
  }, [deck, zoomLevel, color, useWaveSurferMode]);

  return (
    <div ref={containerRef} className="w-full h-full relative">
      {!useWaveSurferMode && (
        <canvas
          ref={canvasRef}
          className="w-full h-full"
          style={{ imageRendering: "pixelated" }}
        />
      )}
    </div>
  );
}

export default WaveformDisplay;
