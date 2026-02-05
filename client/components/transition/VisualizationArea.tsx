"use client";

import React, { useRef, useEffect, useState } from "react";
import type { DeckState } from "./TransitionPanel";
import { WaveformDisplay } from "./WaveformDisplay";
import { StemVisualsCanvas } from "./StemVisualsCanvas";

interface VisualizationAreaProps {
  deckA: DeckState;
  deckB: DeckState;
  viewMode: "waves" | "stems";
  subMode: "scope" | "timeline";
  zoomLevel: number;
  onStemMute: (side: "A" | "B", stem: "drum" | "bass" | "melody" | "vocal") => void;
}

/**
 * 시각화 영역 컴포넌트
 * WAVES/STEMS × SCOPE/TIMELINE 모드 전환 지원
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
  const [containerWidth, setContainerWidth] = useState(800);

  // 컨테이너 크기 추적
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col h-full bg-[#0a0a14] overflow-hidden">
      {/* Deck A 트랙 정보 */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#12121f] border-b border-[#2a2a3f]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            {deckA.trackName || "No Track Loaded"}
          </span>
          {deckA.artistName && (
            <span className="text-xs text-gray-600">- {deckA.artistName}</span>
          )}
        </div>
        <span className="text-xs font-mono text-gray-400">
          {Math.floor(deckA.currentTime / 60)}:{(Math.floor(deckA.currentTime) % 60).toString().padStart(2, "0")}
        </span>
      </div>

      {/* 미니 웨이브폼 (Deck A) - 빨간색 배경 바 */}
      <div className="h-6 bg-gradient-to-r from-red-900/30 via-red-800/20 to-red-900/30 relative">
        <div className="absolute inset-0 flex items-center">
          {/* 미니 웨이브폼 placeholder */}
          <div className="w-full h-3 flex items-center justify-center">
            {/* 작은 비트 마커들 */}
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="w-[2%] h-2 mx-px bg-red-500/60"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </div>
        {/* 플레이헤드 */}
        <div className="absolute top-0 bottom-0 w-px bg-red-500" style={{ left: "50%" }} />
      </div>

      {/* 메인 시각화 영역 */}
      <div className="flex-1 relative overflow-hidden">
        {/* 섹션 라벨은 실제 분석 결과가 있을 때만 표시 */}

        {/* Deck A 시각화 (상단 절반) */}
        <div className="absolute top-0 left-0 right-0 h-1/2 border-b border-[#2a2a3f] overflow-hidden">
          {viewMode === "waves" ? (
            <WaveformDisplay
              deck={deckA}
              zoomLevel={zoomLevel}
              color={deckA.isPlaying ? "#e91e9e" : "#8b5cf6"}
              audioUrl={deckA.audioUrl}
            />
          ) : (
            <StemVisualsCanvas
              deck={deckA}
              zoomLevel={zoomLevel}
              width={containerWidth}
              height={150}
            />
          )}
        </div>

        {/* 중앙 플레이헤드 (빨간 세로선) */}
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-red-500 z-20" />
        
        {/* 시간 표시 (중앙) */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30">
          <div className="bg-[#1a1a2e]/90 px-3 py-1 rounded text-sm font-mono text-white">
            00:00
          </div>
        </div>

        {/* Deck B 시각화 (하단 절반) */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden">
          {viewMode === "waves" ? (
            <WaveformDisplay
              deck={deckB}
              zoomLevel={zoomLevel}
              color={deckB.isPlaying ? "#3b82f6" : "#06b6d4"}
              audioUrl={deckB.audioUrl}
            />
          ) : (
            <StemVisualsCanvas
              deck={deckB}
              zoomLevel={zoomLevel}
              width={containerWidth}
              height={150}
            />
          )}
        </div>
        {/* 섹션 라벨은 실제 분석 결과가 있을 때만 표시 */}
      </div>

      {/* 미니 웨이브폼 (Deck B) - 빨간색 배경 바 */}
      <div className="h-6 bg-gradient-to-r from-blue-900/30 via-blue-800/20 to-blue-900/30 relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full h-3 flex items-center justify-center">
            {Array.from({ length: 50 }).map((_, i) => (
              <div
                key={i}
                className="w-[2%] h-2 mx-px bg-blue-500/60"
                style={{ height: `${30 + Math.random() * 70}%` }}
              />
            ))}
          </div>
        </div>
        <div className="absolute top-0 bottom-0 w-px bg-red-500" style={{ left: "50%" }} />
      </div>

      {/* Deck B 트랙 정보 */}
      <div className="flex items-center justify-between px-3 py-1 bg-[#12121f] border-t border-[#2a2a3f]">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 truncate max-w-[200px]">
            {deckB.trackName || "No Track Loaded"}
          </span>
          {deckB.artistName && (
            <span className="text-xs text-gray-600">- {deckB.artistName}</span>
          )}
        </div>
        <span className="text-xs font-mono text-gray-400">
          {Math.floor(deckB.currentTime / 60)}:{(Math.floor(deckB.currentTime) % 60).toString().padStart(2, "0")}
        </span>
      </div>

      {/* 스크롤바 (하단) */}
      <div className="h-3 bg-[#1a1a2e] flex items-center px-2">
        <div className="flex-1 h-1.5 bg-[#2a2a3f] rounded-full relative">
          {/* 스크롤 핸들 */}
          <div
            className="absolute h-full bg-gradient-to-r from-pink-500 via-purple-500 to-blue-500 rounded-full"
            style={{ left: "20%", width: "30%" }}
          />
        </div>
      </div>
    </div>
  );
}

export default VisualizationArea;
