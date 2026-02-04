"use client";

import React, { useState, useCallback } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { ArrowLeftRight } from "lucide-react";

/**
 * Crossfader Props
 */
interface CrossfaderProps {
  value: number;                 // -1 (A) ~ 0 (center) ~ 1 (B)
  onChange: (value: number) => void;
  onAutoTransition?: (type: 'blend' | 'drop') => void;
  disabled?: boolean;
}

/**
 * DJ 크로스페이더 컴포넌트
 * A/B 덱 간 믹스 밸런스 조절
 */
export function Crossfader({
  value,
  onChange,
  onAutoTransition,
  disabled = false,
}: CrossfaderProps) {
  const [transitionType, setTransitionType] = useState<'blend' | 'drop'>('blend');

  /**
   * 슬라이더 값 변경 핸들러
   */
  const handleChange = useCallback(
    (values: number[]) => {
      onChange(values[0] / 100);
    },
    [onChange]
  );

  /**
   * 자동 트랜지션 시작
   */
  const handleAutoTransition = useCallback(() => {
    onAutoTransition?.(transitionType);
  }, [onAutoTransition, transitionType]);

  /**
   * A/B 표시 색상 계산
   */
  const getAColor = () => (value <= 0 ? "#3b82f6" : "#666");
  const getBColor = () => (value >= 0 ? "#ef4444" : "#666");

  return (
    <div className="flex flex-col items-center gap-3 p-4 bg-[#252525] rounded-lg">
      {/* A/B 레이블 */}
      <div className="flex items-center justify-between w-full px-2">
        <span
          className="text-lg font-bold transition-colors"
          style={{ color: getAColor() }}
        >
          A
        </span>
        <span className="text-xs text-gray-500">CROSSFADER</span>
        <span
          className="text-lg font-bold transition-colors"
          style={{ color: getBColor() }}
        >
          B
        </span>
      </div>

      {/* 크로스페이더 슬라이더 */}
      <div className="w-full px-2">
        <Slider
          value={[value * 100]}
          onValueChange={handleChange}
          min={-100}
          max={100}
          step={1}
          disabled={disabled}
          className="w-full"
        />
      </div>

      {/* 현재 믹스 비율 표시 */}
      <div className="flex items-center justify-between w-full px-2">
        <span className="text-xs text-gray-400">
          A: {Math.round((1 - (value + 1) / 2) * 100)}%
        </span>
        <span className="text-xs text-gray-400">
          B: {Math.round(((value + 1) / 2) * 100)}%
        </span>
      </div>

      {/* 트랜지션 타입 선택 및 자동 트랜지션 */}
      <div className="flex items-center gap-2 mt-2">
        <Button
          size="sm"
          variant={transitionType === 'blend' ? 'default' : 'outline'}
          onClick={() => setTransitionType('blend')}
          className={`text-xs ${
            transitionType === 'blend'
              ? 'bg-purple-600 hover:bg-purple-700'
              : 'bg-transparent border-gray-600'
          }`}
        >
          Blend
        </Button>
        <Button
          size="sm"
          variant={transitionType === 'drop' ? 'default' : 'outline'}
          onClick={() => setTransitionType('drop')}
          className={`text-xs ${
            transitionType === 'drop'
              ? 'bg-orange-600 hover:bg-orange-700'
              : 'bg-transparent border-gray-600'
          }`}
        >
          Drop
        </Button>
        <Button
          size="sm"
          onClick={handleAutoTransition}
          disabled={disabled}
          className="bg-green-600 hover:bg-green-700"
        >
          <ArrowLeftRight className="w-4 h-4 mr-1" />
          Auto
        </Button>
      </div>
    </div>
  );
}

export default Crossfader;
