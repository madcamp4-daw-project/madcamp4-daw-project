import React from 'react';
import { Music, Triangle, Activity } from 'lucide-react';
import { ScaleType, SCALES, NOTE_NAMES } from '@/lib/constants/scales';
import { NOTE_COLORS } from '@/lib/constants/noteColors';

interface LeftControlPanelProps {
    currentColorIndex: number;
    onSelectColor: (index: number) => void;
    isSlide: boolean;
    onToggleSlide?: () => void;
    isPorta: boolean;
    onTogglePorta?: () => void;
    activeScale?: ScaleType;
    activeScaleRoot?: number;
    onSelectScale?: (scale: ScaleType) => void;
    onSelectScaleRoot?: (root: number) => void;
}

export default function LeftControlPanel({
    currentColorIndex, onSelectColor, isSlide, isPorta, onToggleSlide, onTogglePorta,
    activeScale = 'Chromatic', activeScaleRoot = 0, onSelectScale, onSelectScaleRoot
}: LeftControlPanelProps) {
    return (
        <div className="w-12 bg-zinc-800 border-r border-zinc-700 flex flex-col items-center py-2 space-y-4 shrink-0">
            {/* Note Color Selector */}
            <div className="flex flex-col space-y-1">
                <div
                    className="w-8 h-8 rounded border border-zinc-600 cursor-pointer relative"
                    style={{ backgroundColor: NOTE_COLORS[currentColorIndex] }}
                    title="Active Note Color"
                >
                    <div className="absolute -top-1 -right-1 text-[8px] bg-zinc-900 text-zinc-400 px-1 rounded">
                        {currentColorIndex + 1}
                    </div>
                </div>

                {/* Mini Grid for Selection (Simplified POPUP or just cycle? FL has a grid).
                    For MVP, let's just show the grid directly or cycle.
                    Let's do a mini grid popover or just a vertical list of recently used?
                    For now, a simple grid of 16 small boxes.
                */}
                <div className="grid grid-cols-2 gap-0.5 bg-zinc-900 p-0.5 rounded">
                    {NOTE_COLORS.map((color, idx) => (
                        <button
                            key={idx}
                            className={`w-3 h-3 rounded-sm ${currentColorIndex === idx ? 'border border-white' : ''}`}
                            style={{ backgroundColor: color }}
                            onClick={() => onSelectColor(idx)}
                            title={`Color ${idx + 1}`}
                        />
                    ))}
                </div>
            </div>

            <div className="h-px w-8 bg-zinc-700"></div>

            {/* Toggles - Slide & Portamento (크게 보이도록 개선) */}
            <div className="space-y-3 w-full px-1">
                {/* Slide 버튼 - 더 크고 명확하게 */}
                <button
                    onClick={onToggleSlide}
                    className={`w-full flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold transition-all border-2 ${
                        isSlide 
                            ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white border-orange-400 shadow-lg shadow-orange-500/40 scale-105' 
                            : 'bg-zinc-800 text-zinc-400 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500'
                    }`}
                    title="Slide Mode (글라이드 피치)"
                >
                    <Triangle size={16} className={`fill-current mb-0.5 ${isSlide ? 'animate-pulse' : ''}`} />
                    <span>SLIDE</span>
                </button>
                
                {/* Portamento 버튼 - 더 크고 명확하게 */}
                <button
                    onClick={onTogglePorta}
                    className={`w-full flex flex-col items-center justify-center p-2 rounded-lg text-xs font-bold transition-all border-2 ${
                        isPorta 
                            ? 'bg-gradient-to-br from-purple-500 to-purple-600 text-white border-purple-400 shadow-lg shadow-purple-500/40 scale-105' 
                            : 'bg-zinc-800 text-zinc-400 border-zinc-600 hover:bg-zinc-700 hover:border-zinc-500'
                    }`}
                    title="Portamento Mode (연속 피치 슬라이드)"
                >
                    <Activity size={16} className={`mb-0.5 ${isPorta ? 'animate-pulse' : ''}`} />
                    <span>PORTA</span>
                </button>
            </div>
        </div>
    );
}
