"use client";

import React, { useRef, useCallback } from "react";
import type { DeckState } from "./TransitionPanel";
import { TooltipWrapper } from "@/components/ui/tooltip";

interface DeckPanelCompactProps {
  side: "A" | "B";
  deckState: DeckState;
  onFileLoad: (file: File) => void;
  onPlayToggle: () => void;
  onSync: () => void;
  onBpmChange: (bpm: number) => void;
}

/**
 * 컴팩트 덱 패널 (100px 폭)
 * BPM 다이얼, 시간표시, SYNC 버튼, 피치 조절 포함
 */
export function DeckPanelCompact({
  side,
  deckState,
  onFileLoad,
  onPlayToggle,
  onSync,
  onBpmChange,
}: DeckPanelCompactProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  /**
   * 시간 포맷팅 (MM:SS.s)
   */
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 10);
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}.${ms}`;
  };

  /**
   * 파일 드롭 핸들러
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const file = e.dataTransfer.files[0];
      if (file && (file.type.startsWith("audio/") || file.name.match(/\.(mp3|wav|flac|aac|ogg)$/i))) {
        onFileLoad(file);
      }
    },
    [onFileLoad]
  );

  /**
   * 파일 선택 핸들러
   */
  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileLoad(file);
    },
    [onFileLoad]
  );

  /**
   * 피치 조절 (±0.1%)
   */
  const handlePitchChange = (delta: number) => {
    const newPitch = Math.max(-8, Math.min(8, deckState.pitchPercent + delta));
    const newBpm = deckState.originalBpm * (1 + newPitch / 100);
    onBpmChange(Math.round(newBpm * 10) / 10);
  };

  const isLoaded = !!deckState.trackName;
  const albumArtBg = side === "A" ? "bg-pink-500/20" : "bg-blue-500/20";
  const deckLabel = side === "A" ? "Deck A" : "Deck B";
  const tempoUpKey = side === "A" ? "S" : ";";
  const tempoDownKey = side === "A" ? "A" : "L";
  const syncKey = side === "A" ? "[" : "]";

  return (
    <div
      className="flex flex-col h-full p-2 items-center"
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
    >
      {/* 앨범 아트 / 드롭존 */}
      <TooltipWrapper
        content={`오디오 파일을 ${deckLabel}에 로드합니다. MP3, WAV, FLAC, AAC, OGG 형식을 지원합니다. 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요.`}
      >
        <div
          className={`w-14 h-14 rounded-lg ${albumArtBg} border border-gray-700 flex items-center justify-center cursor-pointer mb-2 overflow-hidden`}
          onClick={() => fileInputRef.current?.click()}
        >
          {isLoaded ? (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-500/30 to-pink-500/30">
              <span className="text-[8px] text-center text-gray-300 px-1 truncate">
                {deckState.trackName?.slice(0, 10)}
              </span>
            </div>
          ) : (
            <span className="text-[8px] text-gray-500 text-center">Drop<br/>Audio</span>
          )}
        </div>
      </TooltipWrapper>
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* BPM 표시 */}
      <TooltipWrapper
        content={`현재 재생 중인 트랙의 BPM(분당 비트 수)입니다. 피치 조절에 따라 변경됩니다.`}
      >
        <div className="text-[10px] text-gray-500 mb-1">
          {deckState.bpm.toFixed(1)}
        </div>
      </TooltipWrapper>

      {/* BPM 다이얼 */}
      <TooltipWrapper
        content={`${deckLabel}의 BPM 다이얼입니다. 외부 링은 현재 트랙의 재생 진행률을 표시합니다. 중앙의 숫자는 현재 BPM입니다.`}
      >
        <div className="relative w-16 h-16 mb-2">
          {/* 외부 링 */}
          <svg className="w-full h-full" viewBox="0 0 64 64">
            {/* 백그라운드 트랙 */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke="#2a2a3f"
              strokeWidth="4"
            />
            {/* 진행 링 */}
            <circle
              cx="32"
              cy="32"
              r="28"
              fill="none"
              stroke={side === "A" ? "#e91e9e" : "#3b82f6"}
              strokeWidth="4"
              strokeDasharray={`${(deckState.currentTime / Math.max(deckState.duration, 1)) * 176} 176`}
              strokeLinecap="round"
              transform="rotate(-90 32 32)"
              style={{ transition: "stroke-dasharray 0.1s" }}
            />
          </svg>

          {/* BPM 숫자 (중앙) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-xl font-bold text-white">
              {deckState.bpm.toFixed(1)}
            </span>
          </div>
        </div>
      </TooltipWrapper>

      {/* 피치 표시 */}
      <TooltipWrapper
        content={`피치/템포 조절률입니다. -8%~+8% 범위에서 조절 가능합니다. 양수는 빠르게, 음수는 느리게 재생됩니다.`}
      >
        <div className="text-[9px] text-gray-400 mb-1">
          {deckState.pitchPercent >= 0 ? "+" : ""}{deckState.pitchPercent.toFixed(1)}%
        </div>
      </TooltipWrapper>

      {/* 시간 표시 */}
      <TooltipWrapper
        content="현재 재생 위치입니다. 분:초.밀리초 형식으로 표시됩니다."
      >
        <div className="text-sm font-mono text-white mb-2">
          {formatTime(deckState.currentTime)}
        </div>
      </TooltipWrapper>

      {/* 피치 조절 버튼 */}
      <div className="flex items-center gap-1 mb-2">
        <TooltipWrapper
          content={`템포를 0.5% 감소시킵니다. 트랙이 더 느리게 재생됩니다.`}
          shortcut={tempoDownKey}
        >
          <button
            onClick={() => handlePitchChange(-0.5)}
            className="w-6 h-6 bg-[#2a2a3f] rounded text-xs hover:bg-[#3a3a4f] transition-colors"
          >
            -
          </button>
        </TooltipWrapper>
        <TooltipWrapper
          content={`템포를 0.5% 증가시킵니다. 트랙이 더 빠르게 재생됩니다.`}
          shortcut={tempoUpKey}
        >
          <button
            onClick={() => handlePitchChange(0.5)}
            className="w-6 h-6 bg-[#2a2a3f] rounded text-xs hover:bg-[#3a3a4f] transition-colors"
          >
            +
          </button>
        </TooltipWrapper>
      </div>

      {/* SYNC 버튼 */}
      <TooltipWrapper
        content={`다른 덱의 BPM에 맞춥니다. 두 곡의 템포를 동기화하여 부드러운 믹싱을 준비합니다.`}
        shortcut={syncKey}
      >
        <button
          onClick={onSync}
          disabled={!isLoaded}
          className={`w-full py-1 text-[10px] uppercase tracking-wider rounded transition-colors ${
            isLoaded
              ? "bg-[#2a2a3f] hover:bg-[#3a3a4f] text-white"
              : "bg-[#1a1a2e] text-gray-600 cursor-not-allowed"
          }`}
        >
          SYNC
        </button>
      </TooltipWrapper>

      {/* 스페이서 */}
      <div className="flex-1" />
    </div>
  );
}

export default DeckPanelCompact;
