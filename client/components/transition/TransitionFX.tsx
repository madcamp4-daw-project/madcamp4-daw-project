"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Wand2, TrendingUp, Wind, TrendingDown, Drum, VolumeX } from "lucide-react";

/**
 * 트랜지션 이펙트 타입
 */
export type TransitionEffectType = 
  | 'riser'      // Vocal Riser - 피치+볼륨 상승
  | 'sweep'      // Noise Sweep - 화이트 노이즈 스윕
  | 'drop'       // Pitch Drop - 피치 하강 다운너
  | 'roll'       // Snare Roll - 스네어 롤 빌드업
  | 'mute';      // Selective Muting - 선택적 뮤트

/**
 * 트랜지션 이펙트 설정
 */
export interface TransitionEffect {
  type: TransitionEffectType;
  enabled: boolean;
  duration: number;    // bars
  intensity: number;   // 0-100
  parameters: Record<string, number>;
}

/**
 * TransitionFX Props
 */
interface TransitionFXProps {
  effects: TransitionEffect[];
  onEffectChange: (index: number, effect: TransitionEffect) => void;
  onApply: (effectType: TransitionEffectType) => void;
}

/**
 * 트랜지션 이펙트 패널 컴포넌트
 * 5가지 전문 DJ 트랜지션 기법 제공
 */
export function TransitionFX({
  effects,
  onEffectChange,
  onApply,
}: TransitionFXProps) {
  /**
   * 이펙트 정의
   */
  const effectDefinitions: Array<{
    type: TransitionEffectType;
    name: string;
    icon: React.ReactNode;
    description: string;
    color: string;
  }> = [
    {
      type: 'riser',
      name: 'Vocal Riser',
      icon: <TrendingUp className="w-4 h-4" />,
      description: '피치와 볼륨이 점점 상승하는 보컬 효과',
      color: '#3b82f6',
    },
    {
      type: 'sweep',
      name: 'Noise Sweep',
      icon: <Wind className="w-4 h-4" />,
      description: '화이트 노이즈 필터 스윕 효과',
      color: '#8b5cf6',
    },
    {
      type: 'drop',
      name: 'Pitch Drop',
      icon: <TrendingDown className="w-4 h-4" />,
      description: '피치가 하강하는 다운너 효과',
      color: '#ef4444',
    },
    {
      type: 'roll',
      name: 'Snare Roll',
      icon: <Drum className="w-4 h-4" />,
      description: '4th → 8th → 16th 스네어 롤 빌드업',
      color: '#f59e0b',
    },
    {
      type: 'mute',
      name: 'Selective Muting',
      icon: <VolumeX className="w-4 h-4" />,
      description: '킥/스네어 등 선택적 뮤트',
      color: '#10b981',
    },
  ];

  /**
   * 이펙트 카드 컴포넌트
   */
  const EffectCard = ({
    definition,
    effect,
    index,
  }: {
    definition: (typeof effectDefinitions)[0];
    effect?: TransitionEffect;
    index: number;
  }) => {
    const currentEffect = effect || {
      type: definition.type,
      enabled: false,
      duration: 4,
      intensity: 50,
      parameters: {},
    };

    return (
      <div
        className={`
          p-3 rounded-lg border transition-all
          ${
            currentEffect.enabled
              ? 'bg-[#252525] border-opacity-100'
              : 'bg-[#1a1a1a] border-opacity-30'
          }
        `}
        style={{ borderColor: definition.color }}
      >
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div
              className="p-1.5 rounded"
              style={{ backgroundColor: `${definition.color}20` }}
            >
              {definition.icon}
            </div>
            <span className="text-sm font-medium text-white">
              {definition.name}
            </span>
          </div>
          <Switch
            checked={currentEffect.enabled}
            onCheckedChange={(enabled) =>
              onEffectChange(index, { ...currentEffect, enabled })
            }
          />
        </div>

        {/* 설명 */}
        <p className="text-xs text-gray-500 mb-3">{definition.description}</p>

        {/* 파라미터 (활성화 시만) */}
        {currentEffect.enabled && (
          <div className="space-y-3">
            {/* Duration */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-400 w-16">Duration</Label>
              <Select
                value={String(currentEffect.duration)}
                onValueChange={(value) =>
                  onEffectChange(index, {
                    ...currentEffect,
                    duration: Number(value),
                  })
                }
              >
                <SelectTrigger className="h-7 w-20 text-xs bg-[#1e1e1e] border-gray-600">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#2a2a2a] border-gray-600">
                  {[1, 2, 4, 8].map((bars) => (
                    <SelectItem key={bars} value={String(bars)} className="text-xs">
                      {bars} bar{bars > 1 ? 's' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Intensity */}
            <div className="flex items-center gap-2">
              <Label className="text-xs text-gray-400 w-16">Intensity</Label>
              <Slider
                value={[currentEffect.intensity]}
                onValueChange={(values) =>
                  onEffectChange(index, {
                    ...currentEffect,
                    intensity: values[0],
                  })
                }
                max={100}
                step={1}
                className="flex-1"
              />
              <span className="text-xs text-gray-400 w-8">
                {currentEffect.intensity}%
              </span>
            </div>

            {/* Apply 버튼 */}
            <Button
              size="sm"
              onClick={() => onApply(definition.type)}
              className="w-full"
              style={{ backgroundColor: definition.color }}
            >
              <Wand2 className="w-3 h-3 mr-1" />
              Apply
            </Button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 bg-[#1e1e1e] rounded-lg">
      <div className="flex items-center gap-2 mb-4">
        <Wand2 className="w-5 h-5 text-purple-500" />
        <h3 className="text-lg font-semibold text-white">Transition FX</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {effectDefinitions.map((definition, index) => (
          <EffectCard
            key={definition.type}
            definition={definition}
            effect={effects.find((e) => e.type === definition.type)}
            index={index}
          />
        ))}
      </div>
    </div>
  );
}

export default TransitionFX;
