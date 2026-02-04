"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipWrapper } from "@/components/ui/tooltip";
import { Wand2, Music, Clock, Zap, RotateCcw } from "lucide-react";

/**
 * AI 트랜지션 파라미터 인터페이스
 * BeatNet/Madmom 백엔드와 연동될 설정값들
 */
export interface AITransitionParams {
  transitionType: 'blend' | 'drop';  // 블렌드(크로스페이드) vs 드롭(하드컷)
  transitionBars: 4 | 8 | 16 | 32;   // 트랜지션 길이 (바 단위)
  targetBpm?: number;                 // 목표 BPM (없으면 자동)
  downbeatShift: number;              // 다운비트 오프셋 (-4 ~ +4 beats)
  autoSync: boolean;                  // BPM 자동 동기화
  stemBlending: {                     // 스템별 블렌딩 설정
    drums: boolean;
    bass: boolean;
    vocals: boolean;
    instruments: boolean;
  };
}

interface AIParameterPanelProps {
  params: AITransitionParams;
  onParamsChange: (params: AITransitionParams) => void;
  onMagicMix: () => void;             // AI 자동 트랜지션 생성
  isProcessing?: boolean;             // 처리 중 상태
  deckABpm?: number;                  // Deck A BPM
  deckBBpm?: number;                  // Deck B BPM
}

/**
 * AI 트랜지션 파라미터 패널
 * BeatNet/Madmom 기반 AI 믹싱 설정 UI
 */
export function AIParameterPanel({
  params,
  onParamsChange,
  onMagicMix,
  isProcessing = false,
  deckABpm,
  deckBBpm,
}: AIParameterPanelProps) {
  /**
   * 파라미터 업데이트 헬퍼
   */
  const updateParam = <K extends keyof AITransitionParams>(
    key: K,
    value: AITransitionParams[K]
  ) => {
    onParamsChange({ ...params, [key]: value });
  };

  return (
    <div className="bg-gradient-to-b from-[#1a1a2e] to-[#12121f] border border-[#3a3a4f] rounded-lg p-3 space-y-3">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Wand2 className="w-4 h-4 text-purple-400" />
          <span className="text-sm font-medium text-white">AI Transition</span>
        </div>
        <TooltipWrapper content="AI가 두 트랙을 분석하여 최적의 트랜지션 포인트를 자동으로 찾고, 부드러운 믹스를 생성합니다.">
          <Button
            onClick={onMagicMix}
            disabled={isProcessing}
            className="px-3 py-1 h-7 text-[10px] bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500"
          >
            {isProcessing ? "처리중..." : "Magic Mix ✨"}
          </Button>
        </TooltipWrapper>
      </div>

      {/* BPM 정보 */}
      {(deckABpm || deckBBpm) && (
        <div className="flex items-center justify-between text-[10px] text-gray-400 bg-[#252535] rounded px-2 py-1">
          <span>Deck A: {deckABpm?.toFixed(1) || '--'} BPM</span>
          <span>→</span>
          <span>Deck B: {deckBBpm?.toFixed(1) || '--'} BPM</span>
        </div>
      )}

      {/* Transition Type */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider">
          Transition Type
        </label>
        <div className="flex gap-1">
          <TooltipWrapper content="Blend 모드: 두 트랙을 부드럽게 크로스페이드합니다. 일반적인 DJ 믹싱에 적합합니다.">
            <Button
              size="sm"
              variant={params.transitionType === 'blend' ? 'default' : 'outline'}
              onClick={() => updateParam('transitionType', 'blend')}
              className={`flex-1 h-6 text-[10px] ${
                params.transitionType === 'blend'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-transparent border-[#3a3a4f] text-gray-400'
              }`}
            >
              <Music className="w-3 h-3 mr-1" />
              Blend
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="Drop 모드: 정확한 비트에서 즉시 트랙을 전환합니다. EDM 드롭이나 하드한 전환에 적합합니다.">
            <Button
              size="sm"
              variant={params.transitionType === 'drop' ? 'default' : 'outline'}
              onClick={() => updateParam('transitionType', 'drop')}
              className={`flex-1 h-6 text-[10px] ${
                params.transitionType === 'drop'
                  ? 'bg-orange-600 hover:bg-orange-500'
                  : 'bg-transparent border-[#3a3a4f] text-gray-400'
              }`}
            >
              <Zap className="w-3 h-3 mr-1" />
              Drop
            </Button>
          </TooltipWrapper>
        </div>
      </div>

      {/* Transition Length (Bars) */}
      <div className="space-y-1">
        <label className="text-[10px] text-gray-400 uppercase tracking-wider">
          Transition Length
        </label>
        <div className="flex gap-1">
          {([4, 8, 16, 32] as const).map((bars) => (
            <TooltipWrapper 
              key={bars}
              content={`${bars} bars (약 ${((bars * 4) / (deckABpm || 120) * 60).toFixed(1)}초) 동안 트랜지션합니다.`}
            >
              <Button
                size="sm"
                variant={params.transitionBars === bars ? 'default' : 'outline'}
                onClick={() => updateParam('transitionBars', bars)}
                className={`flex-1 h-6 text-[10px] ${
                  params.transitionBars === bars
                    ? 'bg-blue-600 hover:bg-blue-500'
                    : 'bg-transparent border-[#3a3a4f] text-gray-400'
                }`}
              >
                {bars}
              </Button>
            </TooltipWrapper>
          ))}
        </div>
      </div>

      {/* Downbeat Shift */}
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">
            Downbeat Shift
          </label>
          <span className="text-[10px] text-purple-400">
            {params.downbeatShift > 0 ? '+' : ''}{params.downbeatShift} beats
          </span>
        </div>
        <TooltipWrapper content="다운비트(첫 박자) 위치를 조정합니다. 비트가 맞지 않을 때 미세 조정에 사용합니다.">
          <div>
            <Slider
              value={[params.downbeatShift]}
              onValueChange={([v]) => updateParam('downbeatShift', v)}
              min={-4}
              max={4}
              step={1}
              className="h-2"
            />
          </div>
        </TooltipWrapper>
      </div>

      {/* Auto Sync Toggle */}
      <div className="flex items-center justify-between">
        <TooltipWrapper content="활성화 시 AI가 자동으로 두 트랙의 BPM을 동기화합니다.">
          <span className="text-[10px] text-gray-400 uppercase tracking-wider cursor-help">
            Auto BPM Sync
          </span>
        </TooltipWrapper>
        <Button
          size="sm"
          variant={params.autoSync ? 'default' : 'outline'}
          onClick={() => updateParam('autoSync', !params.autoSync)}
          className={`h-6 text-[10px] ${
            params.autoSync
              ? 'bg-green-600 hover:bg-green-500'
              : 'bg-transparent border-[#3a3a4f] text-gray-400'
          }`}
        >
          {params.autoSync ? 'ON' : 'OFF'}
        </Button>
      </div>

      {/* Stem Blending (Blend 모드일 때만) */}
      {params.transitionType === 'blend' && (
        <div className="space-y-1">
          <label className="text-[10px] text-gray-400 uppercase tracking-wider">
            Stem Blending
          </label>
          <div className="flex gap-1">
            {(['drums', 'bass', 'vocals', 'instruments'] as const).map((stem) => {
              const labels = {
                drums: { short: 'D', full: '드럼 스템 블렌딩', color: '#9B59B6' },
                bass: { short: 'B', full: '베이스 스템 블렌딩', color: '#E74C3C' },
                vocals: { short: 'V', full: '보컬 스템 블렌딩', color: '#2ECC71' },
                instruments: { short: 'I', full: '악기 스템 블렌딩', color: '#F39C12' },
              };
              const label = labels[stem];
              const isActive = params.stemBlending[stem];

              return (
                <TooltipWrapper key={stem} content={label.full}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => 
                      updateParam('stemBlending', { ...params.stemBlending, [stem]: !isActive })
                    }
                    className={`flex-1 h-6 text-[10px] font-bold transition-all ${
                      isActive
                        ? 'border-transparent'
                        : 'bg-transparent border-[#3a3a4f] text-gray-500'
                    }`}
                    style={isActive ? { backgroundColor: label.color, color: 'white' } : {}}
                  >
                    {label.short}
                  </Button>
                </TooltipWrapper>
              );
            })}
          </div>
        </div>
      )}

      {/* Reset Button */}
      <div className="pt-1 border-t border-[#3a3a4f]">
        <TooltipWrapper content="모든 AI 파라미터를 기본값으로 초기화합니다.">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onParamsChange({
              transitionType: 'blend',
              transitionBars: 8,
              downbeatShift: 0,
              autoSync: true,
              stemBlending: { drums: true, bass: true, vocals: true, instruments: true },
            })}
            className="w-full h-6 text-[10px] text-gray-400 hover:text-white"
          >
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset to Default
          </Button>
        </TooltipWrapper>
      </div>
    </div>
  );
}

export default AIParameterPanel;
