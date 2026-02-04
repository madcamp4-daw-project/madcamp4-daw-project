"use client";

import React, { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward, Music } from "lucide-react";

/**
 * Deck Panel Props
 */
interface DeckPanelProps {
  side: "A" | "B";              // 좌측(A) 또는 우측(B)
  onFileLoad: (file: File) => void;
  trackName?: string;
  bpm?: number;
  isPlaying?: boolean;
  onPlayToggle?: () => void;
  onSync?: () => void;
  onBpmChange?: (bpm: number) => void;
}

/**
 * DJ 덱 패널 컴포넌트 (dj.app 스타일)
 * 플래터, BPM 조절, SYNC, 재생 컨트롤 제공
 */
export function DeckPanel({
  side,
  onFileLoad,
  trackName,
  bpm = 120,
  isPlaying = false,
  onPlayToggle,
  onSync,
  onBpmChange,
}: DeckPanelProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [localBpm, setLocalBpm] = useState(bpm);
  const [bpmOffset, setBpmOffset] = useState(0); // BPM 오프셋 (%)
  const [rotation, setRotation] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const animationRef = useRef<number | null>(null);

  /**
   * 플래터 회전 애니메이션
   */
  useEffect(() => {
    if (isPlaying) {
      const animate = () => {
        setRotation((prev) => (prev + 2) % 360);
        animationRef.current = requestAnimationFrame(animate);
      };
      animationRef.current = requestAnimationFrame(animate);
    } else {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    }

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying]);

  /**
   * BPM 오프셋 변경 핸들러
   */
  const handleBpmOffsetChange = useCallback(
    (values: number[]) => {
      const offset = values[0];
      setBpmOffset(offset);
      const newBpm = Math.round(localBpm * (1 + offset / 100));
      onBpmChange?.(newBpm);
    },
    [localBpm, onBpmChange]
  );

  /**
   * 드래그 핸들러들
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragOver(false);
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        onFileLoad(files[0]);
      }
    },
    [onFileLoad]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        onFileLoad(files[0]);
        setLocalBpm(bpm);
      }
    },
    [onFileLoad, bpm]
  );

  return (
    <div
      className={`flex flex-col p-4 bg-[#1a1a1a] rounded-lg ${
        side === "A" ? "items-start" : "items-end"
      }`}
    >
      {/* 파일 드롭존 */}
      <div
        className={`
          w-full h-10 flex items-center justify-center rounded cursor-pointer
          border-2 border-dashed transition-colors mb-4
          ${isDragOver ? "border-blue-500 bg-blue-500/10" : "border-gray-600 hover:border-gray-500"}
          ${trackName ? "bg-[#252525]" : ""}
        `}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".wav,.mp3,.flac,.m4a,.ogg"
          onChange={handleFileSelect}
          className="hidden"
        />
        {trackName ? (
          <span className="text-white text-sm truncate px-2">{trackName}</span>
        ) : (
          <span className="text-gray-400 text-sm">Drag song here</span>
        )}
      </div>

      {/* BPM 표시 및 조절 */}
      <div className={`flex flex-col ${side === "A" ? "items-start" : "items-end"} mb-4`}>
        <span className="text-xs text-gray-500">BPM</span>
        <span className="text-lg font-bold text-white">{Math.round(localBpm * (1 + bpmOffset / 100))}</span>
        <span className="text-xs text-gray-400">
          {bpmOffset >= 0 ? "+" : ""}{bpmOffset.toFixed(1)}%
        </span>
      </div>

      {/* 플래터 (Jog Wheel) */}
      <div
        className="relative w-32 h-32 mx-auto mb-4"
        style={{ transform: `rotate(${rotation}deg)` }}
      >
        {/* 외부 링 */}
        <div className="absolute inset-0 rounded-full border-4 border-gray-700 bg-gray-800">
          {/* 내부 원 */}
          <div className="absolute inset-4 rounded-full bg-gray-900 flex items-center justify-center">
            {trackName ? (
              <Music className="w-8 h-8 text-gray-500" />
            ) : (
              <div className="w-2 h-2 rounded-full bg-gray-600" />
            )}
          </div>
          {/* 마커 */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-4 bg-white rounded" />
        </div>
      </div>

      {/* BPM 슬라이더 */}
      <div className={`flex items-center gap-2 mb-4 ${side === "A" ? "flex-row" : "flex-row-reverse"}`}>
        <span className="text-xs text-gray-400">−</span>
        <Slider
          value={[bpmOffset]}
          onValueChange={handleBpmOffsetChange}
          min={-10}
          max={10}
          step={0.1}
          className="w-20"
        />
        <span className="text-xs text-gray-400">+</span>
      </div>

      {/* SYNC 버튼 */}
      <Button
        size="sm"
        onClick={onSync}
        className="mb-4 bg-cyan-600 hover:bg-cyan-700 text-white font-bold"
        disabled={!trackName}
      >
        SYNC
      </Button>

      {/* 재생 컨트롤 */}
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          disabled={!trackName}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={onPlayToggle}
          className={`h-10 w-10 p-0 rounded-full ${
            isPlaying ? "bg-orange-500 hover:bg-orange-600" : "bg-gray-600 hover:bg-gray-500"
          }`}
          disabled={!trackName}
        >
          {isPlaying ? (
            <Pause className="h-5 w-5 text-white" />
          ) : (
            <Play className="h-5 w-5 text-white ml-0.5" />
          )}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
          disabled={!trackName}
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default DeckPanel;
