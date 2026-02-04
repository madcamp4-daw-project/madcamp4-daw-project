'use client';

import React, { useRef, useCallback, useMemo } from 'react';
import * as Tone from 'tone';
import { buildKeyMap } from '@/lib/utils/keys';

interface PianoKeysProps {
  zoomY: number; // 각 키의 높이 (픽셀)
  scrollY: number; // 수직 스크롤 오프셋
  height: number; // 컨테이너 총 높이
  onPlayNote: (pitch: string) => void;
}

const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * 피아노 건반 컴포넌트
 * C0 ~ C9 (10 옥타브, 120 keys) 지원
 * 건반 클릭 시 소리 재생
 */
export default function PianoKeys({ zoomY, scrollY, height, onPlayNote }: PianoKeysProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const synthRef = useRef<Tone.Synth | null>(null);
  
  const keysMap = useMemo(() => buildKeyMap(), []);

  /**
   * 건반 클릭 핸들러
   * Tone.js 직접 재생 + onPlayNote 콜백 호출
   */
  const handleKeyClick = useCallback(async (pitch: string) => {
    // Tone.js 오디오 컨텍스트 시작 (사용자 인터랙션 필요)
    await Tone.start();
    
    // Synth 생성 (지연 초기화)
    if (!synthRef.current) {
      synthRef.current = new Tone.Synth({
        oscillator: { type: 'triangle' },
        envelope: { attack: 0.01, decay: 0.3, sustain: 0.5, release: 0.8 }
      }).toDestination();
    }
    
    // 소리 재생
    synthRef.current.triggerAttackRelease(pitch, "8n");
    
    // 부모 콜백도 호출 (AudioEngine 연동용)
    onPlayNote(pitch);
  }, [onPlayNote]);

  /**
   * 건반 렌더링
   * 높은 음(상단) → 낮은 음(하단) 순서
   */
  const renderKeys = () => {
    const elements = [];
    
    // index 0 = 최상단(B9), index N-1 = 최하단(C0)
    for (const key of keysMap) {
      elements.push(
        <div
          key={key.pitch}
          className={`
            flex items-center justify-end pr-2 border-b cursor-pointer select-none
            transition-colors duration-75
            ${key.isBlack 
              ? 'bg-zinc-800 text-zinc-400 border-zinc-900 hover:bg-zinc-700 active:bg-zinc-600' 
              : 'bg-zinc-200 text-zinc-800 border-zinc-300 hover:bg-zinc-300 active:bg-zinc-400'
            }
            ${key.isC ? 'border-b-2 border-b-orange-500/50' : ''}
          `}
          style={{ height: zoomY, boxSizing: 'border-box' }}
          onMouseDown={() => handleKeyClick(key.pitch)}
        >
          {/* C 노트 또는 줌이 충분히 클 때 라벨 표시 */}
          {(key.isC || zoomY > 18) && (
            <span className={`text-[10px] font-mono ${key.isBlack ? 'text-zinc-300' : 'text-zinc-600'}`}>
              {key.pitch}
            </span>
          )}
        </div>
      );
    }
    return elements;
  };

  return (
    <div 
      ref={containerRef}
      className="w-full relative bg-zinc-900 border-r border-zinc-700 overflow-hidden"
      style={{ height: height }}
    >
      <div style={{ transform: `translateY(${-scrollY}px)` }}>
        {renderKeys()}
      </div>
    </div>
  );
}
