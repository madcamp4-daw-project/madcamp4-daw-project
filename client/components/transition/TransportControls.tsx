"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, SkipBack, SkipForward } from "lucide-react";

/**
 * Transport Controls Props
 */
interface TransportControlsProps {
  side: "A" | "B";
  isPlaying: boolean;
  onPlayToggle: () => void;
  onCueSet: (index: number) => void;
  onCueJump: (index: number) => void;
  onLoopToggle: () => void;
  loopBars: number;
  onLoopBarsChange: (bars: number) => void;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  onEqChange: (band: 'low' | 'mid' | 'high', value: number) => void;
  onEqKill: (band: 'low' | 'mid' | 'high') => void;
  isLooping: boolean;
  cuePoints: number[]; // 설정된 큐 포인트 타임스탬프
}

/**
 * DJ Transport Controls 컴포넌트
 * CUE 포인트, LOOP, 3밴드 EQ 제공
 */
export function TransportControls({
  side,
  isPlaying,
  onPlayToggle,
  onCueSet,
  onCueJump,
  onLoopToggle,
  loopBars,
  onLoopBarsChange,
  eqLow,
  eqMid,
  eqHigh,
  onEqChange,
  onEqKill,
  isLooping,
  cuePoints,
}: TransportControlsProps) {
  const [activeLoopBars, setActiveLoopBars] = useState(loopBars);

  /**
   * 루프 길이 변경
   */
  const handleLoopBarsDecrease = useCallback(() => {
    const newBars = Math.max(1, activeLoopBars / 2);
    setActiveLoopBars(newBars);
    onLoopBarsChange(newBars);
  }, [activeLoopBars, onLoopBarsChange]);

  const handleLoopBarsIncrease = useCallback(() => {
    const newBars = Math.min(16, activeLoopBars * 2);
    setActiveLoopBars(newBars);
    onLoopBarsChange(newBars);
  }, [activeLoopBars, onLoopBarsChange]);

  /**
   * EQ 노브 컴포넌트
   */
  const EQKnob = ({
    label,
    value,
    onChange,
    onKill,
  }: {
    label: string;
    value: number;
    onChange: (v: number) => void;
    onKill: () => void;
  }) => (
    <div className="flex flex-col items-center gap-1">
      <span className="text-xs text-gray-400">{label}</span>
      {/* 원형 노브 시각화 */}
      <button
        onClick={onKill}
        className={`
          w-10 h-10 rounded-full border-2 flex items-center justify-center
          transition-colors relative overflow-hidden
          ${value === 0 ? 'border-red-500 bg-red-500/20' : 'border-gray-500 bg-gray-700'}
        `}
        title={`${label} (클릭하여 Kill)`}
      >
        {/* 값 표시 마커 */}
        <div
          className="absolute w-1 h-4 bg-white rounded"
          style={{
            transform: `rotate(${(value - 50) * 2.7}deg) translateY(-8px)`,
            transformOrigin: 'center center',
          }}
        />
      </button>
      {/* 수직 슬라이더 */}
      <Slider
        value={[value]}
        onValueChange={(v) => onChange(v[0])}
        min={0}
        max={100}
        step={1}
        orientation="vertical"
        className="h-16"
      />
    </div>
  );

  return (
    <div
      className={`flex items-center gap-4 p-3 bg-[#1e1e1e] rounded-lg ${
        side === "A" ? "flex-row" : "flex-row-reverse"
      }`}
    >
      {/* 재생 컨트롤 */}
      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="ghost"
          className="h-8 w-8 p-0 text-gray-400 hover:text-white"
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          size="sm"
          onClick={onPlayToggle}
          className={`h-10 w-10 p-0 rounded-full ${
            isPlaying ? "bg-green-600 hover:bg-green-700" : "bg-gray-600 hover:bg-gray-500"
          }`}
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
        >
          <SkipForward className="h-4 w-4" />
        </Button>
      </div>

      {/* CUE 포인트 버튼 */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 text-center">CUE</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((index) => (
            <Button
              key={index}
              size="sm"
              variant="outline"
              onClick={() => onCueJump(index)}
              onContextMenu={(e) => {
                e.preventDefault();
                onCueSet(index);
              }}
              className={`h-7 w-7 p-0 text-xs ${
                cuePoints[index - 1]
                  ? "bg-blue-600 border-blue-600 text-white"
                  : "bg-transparent border-gray-600 text-gray-400"
              }`}
              title={`CUE ${index} (우클릭: 설정)`}
            >
              {index}
            </Button>
          ))}
        </div>
      </div>

      {/* LOOP 컨트롤 */}
      <div className="flex flex-col gap-1">
        <span className="text-xs text-gray-500 text-center">LOOP</span>
        <div className="flex items-center gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLoopBarsDecrease}
            className="h-7 w-6 p-0 text-gray-400 hover:text-white"
          >
            ◀
          </Button>
          <Button
            size="sm"
            onClick={onLoopToggle}
            className={`h-7 px-2 text-xs ${
              isLooping
                ? "bg-green-600 hover:bg-green-700"
                : "bg-gray-600 hover:bg-gray-500"
            }`}
          >
            {activeLoopBars}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleLoopBarsIncrease}
            className="h-7 w-6 p-0 text-gray-400 hover:text-white"
          >
            ▶
          </Button>
        </div>
      </div>

      {/* 3밴드 EQ */}
      <div className="flex gap-3">
        <EQKnob
          label="LOW"
          value={eqLow}
          onChange={(v) => onEqChange('low', v)}
          onKill={() => onEqKill('low')}
        />
        <EQKnob
          label="MID"
          value={eqMid}
          onChange={(v) => onEqChange('mid', v)}
          onKill={() => onEqKill('mid')}
        />
        <EQKnob
          label="HIGH"
          value={eqHigh}
          onChange={(v) => onEqChange('high', v)}
          onKill={() => onEqKill('high')}
        />
      </div>
    </div>
  );
}

export default TransportControls;
