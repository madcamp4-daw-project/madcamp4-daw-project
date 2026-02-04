'use client';

import React, { useState } from 'react';
import { EffectData } from '@/lib/types/music';
import { Plus, X, Power, Volume2 } from 'lucide-react';

interface EffectRackPanelProps {
  channelId: string;
  effects: EffectData[];
  onUpdateEffects: (effects: EffectData[]) => void;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * 사용 가능한 이펙트 목록
 */
const AVAILABLE_EFFECTS = [
    // Tone.js
    { type: 'Tone.AutoFilter', label: 'AutoFilter', category: 'Tone' },
    { type: 'Tone.AutoPanner', label: 'AutoPanner', category: 'Tone' },
    { type: 'Tone.AutoWah', label: 'AutoWah', category: 'Tone' },
    { type: 'Tone.BitCrusher', label: 'BitCrusher', category: 'Tone' },
    { type: 'Tone.Chorus', label: 'Chorus', category: 'Tone' },
    { type: 'Tone.Distortion', label: 'Distortion', category: 'Tone' },
    { type: 'Tone.FeedbackDelay', label: 'FeedbackDelay', category: 'Tone' },
    { type: 'Tone.Freeverb', label: 'Freeverb', category: 'Tone' },
    { type: 'Tone.JCReverb', label: 'JCReverb', category: 'Tone' },
    { type: 'Tone.Phaser', label: 'Phaser', category: 'Tone' },
    { type: 'Tone.PingPongDelay', label: 'PingPongDelay', category: 'Tone' },
    { type: 'Tone.Reverb', label: 'Reverb', category: 'Tone' },
    { type: 'Tone.Tremolo', label: 'Tremolo', category: 'Tone' },
    { type: 'Tone.Vibrato', label: 'Vibrato', category: 'Tone' },
    // Tuna.js
    { type: 'Tuna.Chorus', label: 'Chorus', category: 'Tuna' },
    { type: 'Tuna.Compressor', label: 'Compressor', category: 'Tuna' },
    { type: 'Tuna.Delay', label: 'Delay', category: 'Tuna' },
    { type: 'Tuna.Filter', label: 'Filter', category: 'Tuna' },
    { type: 'Tuna.Overdrive', label: 'Overdrive', category: 'Tuna' },
    { type: 'Tuna.Phaser', label: 'Phaser', category: 'Tuna' },
    { type: 'Tuna.Tremolo', label: 'Tremolo', category: 'Tuna' },
    { type: 'Tuna.WahWah', label: 'WahWah', category: 'Tuna' },
];

/**
 * Effect Rack 패널 컴포넌트
 * FX 버튼 클릭 시 표시되는 이펙트 관리 패널
 */
export default function EffectRackPanel({ channelId, effects, onUpdateEffects, isOpen, onClose }: EffectRackPanelProps) {
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'Tone' | 'Tuna'>('Tone');

  if (!isOpen) return null;

  // 이펙트 추가 핸들러
  const handleAddEffect = (type: string) => {
      const newEffect: EffectData = {
          id: Math.random().toString(36).substr(2, 9),
          type,
          isBypassed: false,
          options: {}
      };
      onUpdateEffects([...effects, newEffect]);
      setIsAddMenuOpen(false);
  };

  // 이펙트 제거 핸들러
  const handleRemoveEffect = (id: string) => {
      onUpdateEffects(effects.filter(e => e.id !== id));
  };

  // 바이패스 토글 핸들러
  const handleToggleBypass = (id: string) => {
      onUpdateEffects(effects.map(e => e.id === id ? { ...e, isBypassed: !e.isBypassed } : e));
  };

  const filteredEffects = AVAILABLE_EFFECTS.filter(e => e.category === activeCategory);

  return (
    <div className="fixed right-0 top-14 bottom-36 w-72 bg-zinc-900 border-l border-zinc-700 flex flex-col shadow-2xl z-50">
        {/* 헤더 */}
        <div className="flex justify-between items-center p-3 border-b border-zinc-700 bg-zinc-800">
            <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-orange-400" />
                <h3 className="font-bold text-white text-sm">Effect Rack</h3>
                <span className="text-xs text-zinc-500 bg-zinc-700 px-2 py-0.5 rounded">{channelId}</span>
            </div>
            <button 
                onClick={onClose} 
                className="text-zinc-500 hover:text-white p-1 rounded hover:bg-zinc-700"
            >
                <X className="w-4 h-4" />
            </button>
        </div>

        {/* 이펙트 리스트 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {effects.length === 0 && (
                <div className="text-center py-8 text-zinc-600">
                    <Volume2 className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-xs">이펙트가 없습니다</p>
                    <p className="text-xs">아래 버튼으로 추가하세요</p>
                </div>
            )}
            
            {effects.map((eff, idx) => (
                <div 
                    key={eff.id} 
                    className={`
                        p-3 rounded-lg border transition-all
                        ${eff.isBypassed 
                            ? 'bg-zinc-800/50 border-zinc-800 opacity-60' 
                            : 'bg-zinc-800 border-zinc-600'
                        }
                    `}
                >
                    <div className="flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-zinc-500 bg-zinc-700 w-5 h-5 flex items-center justify-center rounded">
                                {idx + 1}
                            </span>
                            <span className="font-medium text-white text-sm">
                                {eff.type.split('.')[1]}
                            </span>
                            <span className="text-xs text-zinc-500">
                                ({eff.type.split('.')[0]})
                            </span>
                        </div>
                        <div className="flex items-center gap-1">
                            <button 
                                onClick={() => handleToggleBypass(eff.id)} 
                                className={`
                                    p-1 rounded transition-colors
                                    ${eff.isBypassed 
                                        ? 'text-zinc-600 hover:text-zinc-400' 
                                        : 'text-green-400 hover:text-green-300'
                                    }
                                `}
                                title={eff.isBypassed ? "활성화" : "바이패스"}
                            >
                                <Power className="w-4 h-4" />
                            </button>
                            <button 
                                onClick={() => handleRemoveEffect(eff.id)} 
                                className="text-zinc-600 hover:text-red-400 p-1 rounded transition-colors"
                                title="제거"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>

        {/* 추가 버튼 */}
        <div className="p-3 border-t border-zinc-700 bg-zinc-800">
            {!isAddMenuOpen ? (
                <button 
                    onClick={() => setIsAddMenuOpen(true)}
                    className="w-full py-2 bg-orange-600 hover:bg-orange-500 text-white text-sm rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    이펙트 추가
                </button>
            ) : (
                <div className="bg-zinc-900 rounded-lg border border-zinc-700 overflow-hidden">
                    {/* 카테고리 탭 */}
                    <div className="flex border-b border-zinc-700">
                        <button
                            onClick={() => setActiveCategory('Tone')}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${
                                activeCategory === 'Tone' 
                                    ? 'bg-orange-600 text-white' 
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            Tone.js
                        </button>
                        <button
                            onClick={() => setActiveCategory('Tuna')}
                            className={`flex-1 py-2 text-xs font-medium transition-colors ${
                                activeCategory === 'Tuna' 
                                    ? 'bg-purple-600 text-white' 
                                    : 'bg-zinc-800 text-zinc-400 hover:text-white'
                            }`}
                        >
                            Tuna.js
                        </button>
                    </div>
                    
                    {/* 이펙트 목록 */}
                    <div className="max-h-48 overflow-y-auto">
                        {filteredEffects.map(eff => (
                            <button 
                                key={eff.type} 
                                className="block w-full text-left px-3 py-2 text-sm hover:bg-zinc-700 text-zinc-300 transition-colors border-b border-zinc-800 last:border-0"
                                onClick={() => handleAddEffect(eff.type)}
                            >
                                {eff.label}
                            </button>
                        ))}
                    </div>
                    
                    {/* 닫기 */}
                    <button
                        onClick={() => setIsAddMenuOpen(false)}
                        className="w-full py-2 text-xs text-zinc-500 hover:text-white bg-zinc-800 transition-colors"
                    >
                        취소
                    </button>
                </div>
            )}
        </div>
    </div>
  );
}
