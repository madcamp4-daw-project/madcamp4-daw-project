'use client';

import React, { useRef, useEffect } from 'react';
import { TimeMarker } from '@/lib/types/music';

interface RulerProps {
  zoomX: number; 
  scrollX: number;
  width: number;
  beatsPerBar?: number;
  markers?: TimeMarker[]; // using real type
  onAddMarker?: (time: number) => void;
  onEditMarker?: (marker: TimeMarker) => void;
}

export default function Ruler({ zoomX, scrollX, width, beatsPerBar = 4, markers = [], onAddMarker, onEditMarker }: RulerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      // ... logic
  };
  
  const handleDoubleClick = (e: React.MouseEvent) => {
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left + scrollX;
      
      // Check for marker hit
      // Marker is drawn at marker.time * beatsPerBar * zoomX
      // Tolerance +/- 6px
      const hitMarker = markers.find(m => { // Reverse find to pick top?
          // We need accurate time base.
          // Is `beatsPerBar` constant? If variable time signatures exist, we must calculate per measure.
          // BUT for now, let's assume we use the marker's own time. 
          // If we support variable signatures, the x position calculation gets complex (sum of previous measures).
          // For MVP Step 1: Assume constant 4/4 grid spacing for X calculation or passed from parent?
          // If we want TRUE variable signatures, we need a "TimeMap" helper.
          // Let's stick to simple fixed grid for detection for now, OR rely on the same calc used in draw.
          
          // Let's use the loop logic for X? No, too slow.
          // Simple calc: X = time (in measures) * 4 * zoomX (if fixed 4/4).
          // With variable, we'd need to know the 'beat' position.
          // Let's assume time is strictly measures for now and we accept visual deviation if signatures change heavily,
          // OR we implement the proper beat-counting logic.
          
          // Proper logic: We need to know the Start Beat of each marker to map Measure -> X.
          // If we keep it simple: strict 4/4 assumption for now to get the DIALOG working.
          
          const markerX = m.time * beatsPerBar * zoomX;
          return Math.abs(x - markerX) < 10;
      });

      if (hitMarker && onEditMarker) {
          onEditMarker(hitMarker);
      } else if (onAddMarker) {
          // Add new
           const measure = x / (beatsPerBar * zoomX);
           onAddMarker(measure);
      }
  };

  const handleRightClick = (e: React.MouseEvent) => {
       e.preventDefault();
       const rect = canvasRef.current?.getBoundingClientRect();
       if (!rect) return;
       const x = e.clientX - rect.left + scrollX;
       const measure = x / (beatsPerBar * zoomX);
       if(onAddMarker) onAddMarker(measure);
  };


  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear
    ctx.fillStyle = '#27272a'; 
    ctx.fillRect(0, 0, width, 24);

    ctx.save();
    ctx.translate(-scrollX, 0);

    // ... (Drawing Grid - unchanged mostly)
    ctx.fillStyle = '#a1a1aa'; 
    ctx.font = '10px sans-serif';
    ctx.strokeStyle = '#52525b'; 
    ctx.lineWidth = 1;

    const startBeat = Math.floor(scrollX / zoomX);
    const endBeat = Math.floor((scrollX + width) / zoomX) + 1;

    for (let i = startBeat; i <= endBeat; i++) {
        const x = i * zoomX;
        if (i % beatsPerBar === 0) {
            const barNum = (i / beatsPerBar) + 1;
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, 24);
            ctx.stroke();
            ctx.fillText(barNum.toString(), x + 4, 16);
        } else {
             // Beat
            ctx.beginPath();
            ctx.moveTo(x, 15);
            ctx.lineTo(x, 24);
            ctx.stroke();
        }
    }

    // Draw markers
    markers.forEach(m => {
       const x = m.time * beatsPerBar * zoomX;

       if (x >= scrollX - 20 && x <= scrollX + width + 20) {
           // Draw Triangle
           ctx.fillStyle = '#facc15'; 
           ctx.beginPath();
           ctx.moveTo(x, 0);
           ctx.lineTo(x + 6, 0); 
           ctx.lineTo(x + 6, 6); 
           ctx.lineTo(x, 12);   
           ctx.lineTo(x - 6, 6); 
           ctx.lineTo(x - 6, 0); 
           ctx.closePath();
           ctx.fill();

           // Label
           if (m.type === 'Signature') {
               ctx.fillStyle = '#facc15';
               ctx.font = 'bold 10px sans-serif';
               ctx.fillText(`${m.numerator}/${m.denominator}`, x + 8, 10);
           }
       }
    });

    ctx.restore();
  }, [zoomX, scrollX, width, beatsPerBar, markers]);

  return (
    <canvas 
        ref={canvasRef} 
        width={width} 
        height={24} 
        className="block cursor-pointer select-none"
        onContextMenu={handleRightClick}
        onDoubleClick={handleDoubleClick}
    />
  );
}
