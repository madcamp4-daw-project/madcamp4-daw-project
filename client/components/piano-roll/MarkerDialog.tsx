'use client';

import React, { useState, useEffect } from 'react';
import { TimeMarker } from '@/lib/types/music';

interface MarkerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept: (marker: TimeMarker) => void;
  onDelete?: (markerId: string) => void;
  initialMarker?: TimeMarker; // If editing existing
  defaultTime?: number; // If creating new
}

export default function MarkerDialog({ isOpen, onClose, onAccept, onDelete, initialMarker, defaultTime = 0 }: MarkerDialogProps) {
  const [type, setType] = useState<'Signature'>('Signature'); // Expand to 'Tempo' etc later if needed
  const [numerator, setNumerator] = useState(4);
  const [denominator, setDenominator] = useState(4);
  const [bar, setBar] = useState(1);

  useEffect(() => {
    if (isOpen) {
        if (initialMarker) {
            setType(initialMarker.type as 'Signature');
            setNumerator(initialMarker.numerator || 4);
            setDenominator(initialMarker.denominator || 4);
            setBar(Math.round(initialMarker.time + 1));
        } else {
            setBar(Math.round(defaultTime + 1));
            setNumerator(4);
            setDenominator(4);
        }
    }
  }, [isOpen, initialMarker, defaultTime]);

  const handleSave = () => {
      const time = Math.max(0, bar - 1); // 1-based UI -> 0-based Logic
      const newMarker: TimeMarker = {
          id: initialMarker?.id || Math.random().toString(36).substr(2, 9),
          time: time,
          type: type,
          numerator: numerator,
          denominator: denominator
      };
      onAccept(newMarker);
      onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-[#282b30] border border-zinc-700 rounded-lg shadow-xl w-80 overflow-hidden">
        {/* Header */}
        <div className="bg-[#363a42] px-4 py-2 border-b border-zinc-700 flex justify-between items-center">
            <span className="text-sm font-bold text-zinc-200">
                {initialMarker ? '마커 수정' : '타임 키 추가'}
            </span>
            <button onClick={onClose} className="text-zinc-400 hover:text-white">&times;</button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
            {/* Bar Position */}
            <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-400">위치 (마디)</span>
                <input 
                    type="number" 
                    className="w-20 bg-[#1e2125] border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
                    value={bar}
                    onChange={(e) => setBar(Math.max(1, parseInt(e.target.value) || 1))}
                />
            </div>

            {/* Type Selector (Hidden for now as we focus on Signature) */}
            
            {/* Signature Settings */}
            <div className="space-y-2 pt-2 border-t border-zinc-700">
                <span className="text-xs font-bold text-zinc-300">박자표 (Time Signature)</span>
                <div className="flex items-center space-x-2">
                    <div className="flex-1">
                        <span className="block text-[10px] text-zinc-500 mb-1">분자 (박자 수)</span>
                        <input 
                            type="number" 
                            className="w-full bg-[#1e2125] border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
                            value={numerator}
                            onChange={(e) => setNumerator(Math.max(1, parseInt(e.target.value) || 1))}
                        />
                    </div>
                    <span className="text-zinc-500 mt-4">/</span>
                    <div className="flex-1">
                        <span className="block text-[10px] text-zinc-500 mb-1">분모 (음표 단위)</span>
                        <select 
                            className="w-full bg-[#1e2125] border border-zinc-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-orange-500"
                            value={denominator}
                            onChange={(e) => setDenominator(parseInt(e.target.value))}
                        >
                            <option value="2">2</option>
                            <option value="4">4</option>
                            <option value="8">8</option>
                            <option value="16">16</option>
                        </select>
                    </div>
                </div>
            </div>

        </div>

        {/* Footer */}
        <div className="bg-[#363a42] px-4 py-3 flex justify-between items-center">
            {initialMarker && onDelete ? (
                 <button 
                    onClick={() => { onDelete(initialMarker.id); onClose(); }} 
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1"
                >
                    삭제
                </button>
            ) : <div></div>}

            <div className="flex space-x-2">
                <button 
                    onClick={onClose} 
                    className="px-3 py-1 bg-zinc-700 hover:bg-zinc-600 rounded text-xs text-white"
                >
                    취소
                </button>
                <button 
                    onClick={handleSave} 
                    className="px-3 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs text-white font-bold"
                >
                    확인
                </button>
            </div>
        </div>
      </div>
    </div>
  );
}
