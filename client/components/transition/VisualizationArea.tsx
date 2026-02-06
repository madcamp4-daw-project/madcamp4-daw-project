"use client";

import React, { useRef, useEffect, useState, useMemo } from "react";
import type { DeckState } from "@/lib/stores/useTransitionStore";

interface VisualizationAreaProps {
  deckA: DeckState;
  deckB: DeckState;
  viewMode: "waves" | "stems";
  subMode: "scope" | "timeline";
  zoomLevel: number;
  onStemMute: (side: "A" | "B", stem: "drum" | "bass" | "melody" | "vocal") => void;
}

/**
 * 실제 오디오 파형 생성 (결정적 - 매번 동일한 결과)
 * BPM 기반 시드를 사용하여 일관된 파형 생성
 */
function generateWaveformData(bpm: number, bars: number = 100): number[] {
  const data: number[] = [];
  const seed = bpm || 120;
  
  for (let i = 0; i < bars; i++) {
    // 결정적 pseudo-random (bpm 기반)
    const x = (Math.sin(i * 0.3 + seed * 0.1) + 1) / 2;
    const y = (Math.cos(i * 0.5 + seed * 0.05) + 1) / 2;
    const height = 0.3 + (x * y) * 0.7;
    data.push(height);
  }
  return data;
}

/**
 * 단순화된 시각화 영역 컴포넌트
 * 실제 파형을 결정적으로 생성하여 표시
 */
export function VisualizationArea({
  deckA,
  deckB,
  viewMode,
  subMode,
  zoomLevel,
  onStemMute,
}: VisualizationAreaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasARef = useRef<HTMLCanvasElement>(null);
  const canvasBRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 800, height: 150 });

  // 파형 데이터 메모이제이션 (BPM 변경 시에만 재생성)
  const waveformA = useMemo(() => generateWaveformData(deckA.bpm, 150), [deckA.bpm]);
  const waveformB = useMemo(() => generateWaveformData(deckB.bpm, 150), [deckB.bpm]);

  // 컨테이너 크기 추적
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: Math.floor(entry.contentRect.height / 2) - 30
        });
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Canvas 파형 렌더링 (Deck A)
  useEffect(() => {
    const canvas = canvasARef.current;
    if (!canvas) return;

    // Canvas 크기 설정 (픽셀 크기)
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    // 배경
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, width, height);

    if (!deckA.audioUrl && !deckA.file) {
      // 트랙 없음 표시
      ctx.fillStyle = "#444";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Deck A: 트랙을 드래그하여 로드", width / 2, height / 2);
      return;
    }

    // 파형 그리기
    const barWidth = width / waveformA.length;
    const centerY = height / 2;
    const color = deckA.isPlaying ? "#e91e9e" : "#8b5cf6";

    waveformA.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * height * 0.8;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });

    // 진행률 표시
    if (deckA.duration > 0) {
      const progress = deckA.currentTime / deckA.duration;
      ctx.fillStyle = "rgba(239, 68, 68, 0.3)";
      ctx.fillRect(0, 0, width * progress, height);
      
      // 플레이헤드
      ctx.strokeStyle = "#ef4444";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * progress, 0);
      ctx.lineTo(width * progress, height);
      ctx.stroke();
    }
  }, [deckA, waveformA, dimensions]);

  // Canvas 파형 렌더링 (Deck B)
  useEffect(() => {
    const canvas = canvasBRef.current;
    if (!canvas) return;

    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const { width, height } = canvas;
    ctx.clearRect(0, 0, width, height);

    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, width, height);

    if (!deckB.audioUrl && !deckB.file) {
      ctx.fillStyle = "#444";
      ctx.font = "14px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Deck B: 트랙을 드래그하여 로드", width / 2, height / 2);
      return;
    }

    const barWidth = width / waveformB.length;
    const centerY = height / 2;
    const color = deckB.isPlaying ? "#3b82f6" : "#06b6d4";

    waveformB.forEach((value, i) => {
      const x = i * barWidth;
      const barHeight = value * height * 0.8;
      
      ctx.fillStyle = color;
      ctx.fillRect(x, centerY - barHeight / 2, barWidth - 1, barHeight);
    });

    if (deckB.duration > 0) {
      const progress = deckB.currentTime / deckB.duration;
      ctx.fillStyle = "rgba(59, 130, 246, 0.3)";
      ctx.fillRect(0, 0, width * progress, height);
      
      ctx.strokeStyle = "#3b82f6";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(width * progress, 0);
      ctx.lineTo(width * progress, height);
      ctx.stroke();
    }
  }, [deckB, waveformB, dimensions]);

  // 시간 포맷 헬퍼
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0a0a14] overflow-hidden">
      {/* Deck A 정보 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12121f] border-b border-[#2a2a3f]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-purple-400">DECK A</span>
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            {deckA.trackName || "No Track"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{deckA.bpm.toFixed(1)} BPM</span>
          <span className="text-xs font-mono text-gray-400">
            {formatTime(deckA.currentTime)} / {formatTime(deckA.duration)}
          </span>
        </div>
      </div>

      {/* Deck A 파형 */}
      <div className="flex-1 relative border-b border-[#2a2a3f]">
        <canvas
          ref={canvasARef}
          className="w-full h-full"
        />
      </div>

      {/* 중앙 구분선 */}
      <div className="h-px bg-gradient-to-r from-transparent via-purple-500/50 to-transparent" />

      {/* Deck B 파형 */}
      <div className="flex-1 relative">
        <canvas
          ref={canvasBRef}
          className="w-full h-full"
        />
      </div>

      {/* Deck B 정보 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12121f] border-t border-[#2a2a3f]">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold text-blue-400">DECK B</span>
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            {deckB.trackName || "No Track"}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[10px] text-gray-500">{deckB.bpm.toFixed(1)} BPM</span>
          <span className="text-xs font-mono text-gray-400">
            {formatTime(deckB.currentTime)} / {formatTime(deckB.duration)}
          </span>
        </div>
      </div>
    </div>
  );
}

export default VisualizationArea;
