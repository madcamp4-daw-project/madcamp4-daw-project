'use client';

import React, { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { Note, ToolType, TimeMarker } from '@/lib/types/music';
import { ChordType } from '@/lib/constants/chords';
import { ScaleType, isNoteInScale } from '@/lib/constants/scales';
import { Layers, Shuffle, Send } from 'lucide-react';
import { buildKeyMap, TOTAL_KEYS } from '@/lib/utils/keys';
import { useGridCoordinates } from './hooks/useGridCoordinates';
import { useGridInteraction } from './hooks/useGridInteraction';
import { audioEngine } from '@/lib/audio/AudioEngine';
import { NOTE_COLORS } from '@/lib/constants/noteColors';


interface ContextMenuState {
  visible: boolean;
  x: number;
  y: number;
  noteId?: string;
}

interface GridCanvasProps {
  notes: Note[];
  zoomX: number; 
  zoomY: number; 
  scrollX: number;
  scrollY: number;
  width: number;
  height: number;
  activeTool: ToolType;
  onAddNote: (note: Partial<Note> | Partial<Note>[]) => void;
  onNoteDoubleClick: (note: Note) => void;
  onDeleteNote: (noteId: string) => void;
  onUpdateNote: (noteId: string, changes: Partial<Note>) => void;
  onSelectNotes?: (noteIds: string[]) => void;
  onMuteNote?: (noteId: string) => void;
  onSliceNote?: (noteId: string, sliceTime: number) => void;
  stampNote?: Partial<Note> | null;
  selectedNoteIds?: Set<string>;
  activeChannelId?: string;
  selectedChordType?: ChordType; 
  activeScale?: ScaleType;
  activeScaleRoot?: number;
  markers?: TimeMarker[];
  waveformBuffer?: AudioBuffer | null;
  onSwitchChannel?: (channelId: string) => void;
  onOpenStemSeparation?: () => void;
  onCreateTransition?: () => void;
  onExportToMixer?: () => void;
  snapGrid?: number; 
}

export default function GridCanvas({ 
  notes, zoomX, zoomY, scrollX, scrollY, width, height, 
  activeTool, onAddNote, onNoteDoubleClick, onDeleteNote, onUpdateNote, onSelectNotes,
  onMuteNote, onSliceNote, stampNote,
  selectedNoteIds, activeChannelId, activeScale = 'Chromatic', activeScaleRoot = 0,
  onOpenStemSeparation, onCreateTransition, onExportToMixer, waveformBuffer, onSwitchChannel, snapGrid = 0.0625,
  markers = [] 
}: GridCanvasProps) {
  // 3-LAYER ARCHITECTURE
  // 1. bgCanvas: Piano Key Rows (Draws only on Vertical Scroll/Zoom) - Optimized
  // 2. CSS Grid Div: Vertical Time Lines (Zero Draw Calls, Strict CSS Alignment)
  // 3. noteCanvas: Notes (Draws on Horizontal Scroll) - Transparent
  // 4. dynamicCanvas: Playhead, Selection, Dragging (High FPS)

  const bgCanvasRef = useRef<HTMLCanvasElement>(null);
  const noteCanvasRef = useRef<HTMLCanvasElement>(null); 
  const dynamicCanvasRef = useRef<HTMLCanvasElement>(null);

  const requestRef = useRef<number | null>(null);
  
  // State Refs
  const drawState = useRef({
      notes, zoomX, zoomY, scrollX, scrollY, width, height, 
      activeChannelId, activeScale, activeScaleRoot, selectedNoteIds, snapGrid, activeTool,
      interaction: null as any,
      keysMap: [] as any[],
      coordinates: null as any,
      markers,
      stampNote,
      tempNotes: [] as Partial<Note>[] 
  });

  const keysMap = useMemo(() => buildKeyMap(), []);
  const coordinates = useGridCoordinates({ zoomX, zoomY, markers });
  const { rowToScreenY, timeToScreenX, beatToScreenX, getNoteRect, screenXToTime, timeMap } = coordinates;

  // Update Ref
  useEffect(() => {
     drawState.current = {
         ...drawState.current,
         notes, zoomX, zoomY, scrollX, scrollY, width, height,
         activeChannelId, activeScale, activeScaleRoot, selectedNoteIds, snapGrid, activeTool, markers,
         stampNote, keysMap, coordinates
     };
  }, [notes, zoomX, zoomY, scrollX, scrollY, width, height, activeChannelId, activeScale, activeScaleRoot, selectedNoteIds, snapGrid, activeTool, markers, stampNote, keysMap, coordinates]);

  // --- 1. RENDER BACKGROUND (Key Rows) ---
  const renderBackground = useCallback(() => {
      const canvas = bgCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d', { alpha: false }); // Opaque
      if (!ctx) return;

      // Clear
      ctx.fillStyle = '#18181b';
      ctx.fillRect(0, 0, width, height);

      const viewportTop = scrollY;
      const viewportBottom = scrollY + (height || 600);
      const startRow = Math.max(0, Math.floor(viewportTop / zoomY));
      const endRow = Math.min(TOTAL_KEYS, Math.ceil(viewportBottom / zoomY) + 1);
      
      for (let i = startRow; i < endRow; i++) {
         const key = keysMap[i]; 
         if (!key) continue;
         const y = rowToScreenY(key.index); 
         const h = zoomY;

         let bgColor = '#141418'; 
         const noteIndex = key.midi % 12;
         let inScale = true;
         if (activeScale !== 'Chromatic') {
             inScale = isNoteInScale(noteIndex, activeScaleRoot, activeScale);
             bgColor = inScale ? '#2a2a32' : '#141418';
             if (noteIndex === activeScaleRoot % 12) bgColor = '#383840'; 
         } else {
             bgColor = key.isBlack ? '#1a1a1f' : '#2a2a32';
         }
         
         ctx.fillStyle = bgColor;
         ctx.fillRect(0, y, width, h);
         
         // Horizontal Separator
         ctx.strokeStyle = key.isC ? '#555560' : '#3a3a42';
         ctx.lineWidth = key.isC ? 1.5 : 0.5;
         ctx.beginPath(); ctx.moveTo(0, y + h); ctx.lineTo(width, y + h); ctx.stroke();
      }
  }, [width, height, scrollY, zoomY, activeScale, activeScaleRoot, rowToScreenY, keysMap]);

  // Trigger BG Render
  useEffect(() => {
      requestAnimationFrame(renderBackground);
  }, [renderBackground]);


  // --- 2. CSS GRID STYLES (Vertical Lines) ---
  const gridStyles = useMemo(() => {
      const beatPx = zoomX;
      const barPx = beatPx * 4;
      
      // Subdivision logic
      let subPx = beatPx; 
      if (snapGrid && snapGrid > 0 && snapGrid < 0.25) {
          const ratio = 0.25 / snapGrid;
          subPx = beatPx / ratio; 
      }
      
      const bgPosX = -scrollX;

      const gradients = [
          `linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)`, // Bar
          `linear-gradient(to right, rgba(255,255,255,0.04) 1px, transparent 1px)`, // Beat
      ];
      const sizes = [
          `${barPx}px 100%`,
          `${beatPx}px 100%`,
      ];

      // Add subdivision if not too dense (>4px)
      if (subPx < beatPx && subPx > 4) {
          gradients.push(`linear-gradient(to right, rgba(255,255,255,0.02) 1px, transparent 1px)`);
          sizes.push(`${subPx}px 100%`);
      }

      return {
          backgroundImage: gradients.join(', '),
          backgroundSize: sizes.join(', '),
          backgroundPositionX: `${bgPosX}px`,
          width: '100%',
          height: '100%'
      };
  }, [zoomX, scrollX, snapGrid]);


  // --- 3. RENDER NOTES (Transparent Layer) ---
  const renderNotes = useCallback(() => {
      const canvas = noteCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const state = drawState.current;
      const { width, height, notes, selectedNoteIds, activeChannelId } = state;
      const { getNoteRect } = state.coordinates;

      ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
      ctx.clearRect(0, 0, width, height);
      ctx.translate(-scrollX, -scrollY); // Virtualize

      const ghostNotes = notes.filter((n: Note) => n.channelId && n.channelId !== activeChannelId);
      const activeNotes = notes.filter((n: Note) => !n.channelId || n.channelId === activeChannelId);

      ctx.globalAlpha = 0.3;
      ghostNotes.forEach((note: Note) => {
          const rect = getNoteRect(note);
          // Optimization: Skip valid check or use viewport check if critical, 
          // but Canvas clips automatically so just drawing is fine for now.
          // Or strict verify:
          if (rect.x + rect.w < scrollX || rect.x > scrollX + width || 
              rect.y + rect.h < scrollY || rect.y > scrollY + height) return;
              
          ctx.fillStyle = '#888'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          ctx.strokeStyle = '#aaa'; ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
      });
      ctx.globalAlpha = 1.0;

      activeNotes.forEach((note: Note) => {
          const rect = getNoteRect(note);
           if (rect.x + rect.w < scrollX || rect.x > scrollX + width || 
              rect.y + rect.h < scrollY || rect.y > scrollY + height) return;

          const isSelected = selectedNoteIds?.has(note.id);
          const colorIdx = note.colorIndex ?? 0;
          const color = NOTE_COLORS[colorIdx % NOTE_COLORS.length];
          
          ctx.fillStyle = isSelected ? '#ef4444' : color;
          ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
          ctx.strokeStyle = isSelected ? '#fff' : '#000';
          ctx.lineWidth = isSelected ? 2 : 1;
          ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
          
          if (note.isSlide) {
              ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
              ctx.strokeStyle = '#ff8c00'; ctx.lineWidth = 2;
              for (let i = -rect.h; i < rect.w + rect.h; i += 6) {
                  ctx.beginPath(); ctx.moveTo(rect.x + i, rect.y); ctx.lineTo(rect.x + i + rect.h, rect.y + rect.h); ctx.stroke();
              }
              ctx.restore();
              ctx.fillStyle = '#ff8c00'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('S', rect.x + 2, rect.y + 9);
          }
          if (note.isPorta) {
              ctx.save(); ctx.beginPath(); ctx.rect(rect.x, rect.y, rect.w, rect.h); ctx.clip();
              ctx.strokeStyle = '#a855f7'; ctx.lineWidth = 2; 
              ctx.beginPath();
              // Simplify wave
              const waveFreq = Math.PI / 8;
              const waveHeight = rect.h * 0.3;
              ctx.moveTo(rect.x, rect.y + rect.h/2);
              for (let px = 0; px < rect.w; px += 2) {
                   const wy = rect.y + rect.h / 2 + Math.sin(px * waveFreq) * waveHeight;
                   ctx.lineTo(rect.x + px, wy);
              }
              ctx.stroke(); 
              ctx.restore();
              ctx.fillStyle = '#a855f7'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('P', rect.x + rect.w - 9, rect.y + 9);
          }
          if (note.isMuted) {
              ctx.save();
              ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'; ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
              ctx.strokeStyle = '#ff6b6b'; ctx.lineWidth = 2;
              ctx.beginPath(); ctx.moveTo(rect.x, rect.y); ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
              ctx.moveTo(rect.x + rect.w, rect.y); ctx.lineTo(rect.x, rect.y + rect.h); ctx.stroke();
              ctx.fillStyle = '#ff6b6b'; ctx.font = 'bold 8px sans-serif'; ctx.fillText('M', rect.x + rect.w / 2 - 3, rect.y + rect.h / 2 + 3);
              ctx.restore();
          }
      });
  }, [notes, width, height, selectedNoteIds, activeChannelId]);

  useEffect(() => {
     requestAnimationFrame(renderNotes);
  }, [renderNotes, scrollX, zoomX]); 


  // --- 4. RENDER DYNAMIC (Playhead) ---
  const renderDynamic = () => {
      const canvas = dynamicCanvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const state = drawState.current;
      if (!state.coordinates || !state.interaction) {
          requestRef.current = requestAnimationFrame(renderDynamic);
          return;
      }

      const { width, height, stampNote: stateStampNote, activeTool, zoomX, zoomY, snapGrid } = state;
      const { beatToScreenX, getNoteRect, timeToScreenX, rowToScreenY } = state.coordinates;
      const { selectionBox, hoveredCell } = state.interaction.interactionState.current; 
      
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, width, height);
      ctx.translate(-scrollX, -scrollY);

      // Hover
      if (hoveredCell && (activeTool === 'draw' || activeTool === 'paint' || activeTool === 'stamp')) {
           const { time, row } = hoveredCell;
           const hX = timeToScreenX(time);
           const hY = rowToScreenY(row); 
           
           if (activeTool === 'stamp' && stateStampNote) {
               const stampDuration = stateStampNote.duration || snapGrid || 0.0625;
               const hW = stampDuration * 4 * zoomX;
               const hH = zoomY;
               ctx.fillStyle = 'rgba(59, 130, 246, 0.5)'; ctx.fillRect(hX, hY, hW, hH);
               ctx.strokeStyle = 'rgba(59, 130, 246, 0.8)'; ctx.lineWidth = 2; ctx.strokeRect(hX, hY, hW, hH);
               ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.fillText('STAMP', hX + 3, hY + 12);
           } else {
               const hW = (snapGrid || 0.0625) * 4 * zoomX; 
               const hH = zoomY;
               ctx.fillStyle = 'rgba(255, 255, 255, 0.1)'; ctx.fillRect(hX, hY, hW, hH);
               ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)'; ctx.lineWidth = 1; ctx.strokeRect(hX, hY, hW, hH);
           }
      }

      // Playhead
      const currentBeat = audioEngine.getCurrentBeat ? audioEngine.getCurrentBeat() : 0;
      const phX = beatToScreenX(currentBeat);
      if (phX >= 0 && phX <= width) {
          ctx.strokeStyle = '#f97316'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(phX, 0); ctx.lineTo(phX, height); ctx.stroke();
          ctx.fillStyle = '#f97316';
          ctx.beginPath(); ctx.moveTo(phX - 6, 0); ctx.lineTo(phX + 6, 0); ctx.lineTo(phX, 10); ctx.fill();
      }

      // Selection
      if (selectionBox) {
          ctx.fillStyle = 'rgba(255, 100, 100, 0.2)';
          ctx.strokeStyle = '#ff5555'; ctx.lineWidth = 1;
          ctx.fillRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
          ctx.strokeRect(selectionBox.x, selectionBox.y, selectionBox.w, selectionBox.h);
      }
      
      requestRef.current = requestAnimationFrame(renderDynamic);
  };
  
  useEffect(() => {
     requestRef.current = requestAnimationFrame(renderDynamic);
     return () => { if (requestRef.current) cancelAnimationFrame(requestRef.current); };
  }, []);

  // Interaction
  const handleDraftNote = (note: Partial<Note> | null) => { drawState.current.tempNotes = note ? [note] : []; };
  const handleOptimisticAddNote = (note: Partial<Note> | Partial<Note>[]) => { onAddNote(note); };

  const interaction = useGridInteraction({
      canvasRef: dynamicCanvasRef as React.RefObject<HTMLCanvasElement>, 
      notes, activeTool, coordinates, 
      onAddNote: handleOptimisticAddNote, onDraftNote: handleDraftNote,
      onUpdateNote, onSelectNotes, onDeleteNote, onMuteNote, onSliceNote, stampNote,
      activeChannelId, onSwitchChannel, snapGrid,
      scrollX, scrollY
  });
  
  drawState.current.interaction = interaction;
  drawState.current.coordinates = coordinates;

  // Event Listeners
  useEffect(() => {
     const canvas = dynamicCanvasRef.current;
     if (!canvas) return;
     const onMouseDown = (e: MouseEvent) => {
         drawState.current.interaction?.handleMouseDown(e); renderDynamic(); 
     };
     const onMouseMove = (e: MouseEvent) => {
        drawState.current.interaction?.handleMouseMove(e);
     };
     const onMouseUp = (e: MouseEvent) => drawState.current.interaction?.handleMouseUp(e);
     const onMouseLeave = (e: MouseEvent) => drawState.current.interaction?.handleMouseUp(e);
     canvas.addEventListener('mousedown', onMouseDown, { passive: false });
     canvas.addEventListener('mousemove', onMouseMove, { passive: false });
     canvas.addEventListener('mouseup', onMouseUp, { passive: false });
     canvas.addEventListener('mouseleave', onMouseLeave, { passive: false });
     return () => {
         canvas.removeEventListener('mousedown', onMouseDown);
         canvas.removeEventListener('mousemove', onMouseMove);
         canvas.removeEventListener('mouseup', onMouseUp);
         canvas.removeEventListener('mouseleave', onMouseLeave);
     };
  }, []);

  const [contextMenu, setContextMenu] = useState<ContextMenuState>({ visible: false, x: 0, y: 0 });
  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      const rect = dynamicCanvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const { getNoteRect } = drawState.current.coordinates;
      let clickedNoteId: string | undefined;
      for (let i = notes.length - 1; i >= 0; i--) {
          const n = notes[i];
          const r = getNoteRect(n);
          if (x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h) {
              clickedNoteId = n.id; break;
          }
      }
      setContextMenu({ visible: true, x: e.clientX - rect.left, y: e.clientY - rect.top, noteId: clickedNoteId });
  };

  return (
    <div className="relative w-full h-full" onClick={() => setContextMenu({ visible: false, x: 0, y: 0 })}>
      
      {/* 1. LAYER - BACKGROUND CANVAS (Key Rows) */}
      <canvas
        ref={bgCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 block"
        style={{ pointerEvents: 'none', zIndex: 0 }}
      />
      
      {/* 2. LAYER - CSS GRID LINES */}
      <div 
        className="absolute top-0 left-0 w-full h-full"
        style={{ pointerEvents: 'none', zIndex: 1, ...gridStyles }}
      />

      {/* 3. LAYER - NOTE CANVAS (Notes Only) */}
      <canvas
        ref={noteCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 block"
        style={{ pointerEvents: 'none', zIndex: 2 }} 
      />
      
      {/* 4. LAYER - DYNAMIC CANVAS (Interaction) */}
      <canvas
        ref={dynamicCanvasRef}
        width={width}
        height={height}
        className="absolute top-0 left-0 block cursor-crosshair"
        style={{ zIndex: 3 }}
        onContextMenu={handleContextMenu}
      />
      
      {/* CONTEXT MENU */}
      {contextMenu.visible && (
          <div
              className="absolute z-50 bg-[#2a2a2e] border border-[#3a3a3f] rounded-md shadow-xl py-1 min-w-[180px]"
              style={{ left: contextMenu.x, top: contextMenu.y }}
              onClick={(e) => e.stopPropagation()}
          >
              <button className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-purple-600/30 hover:text-purple-300 flex items-center gap-2 transition-colors" onClick={() => { setContextMenu({ visible: false, x:0,y:0 }); onOpenStemSeparation?.(); }}>
                  <Layers className="w-4 h-4 text-purple-400" /> <span>🎵 Stem Separation...</span>
              </button>
              <button className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-orange-600/30 hover:text-orange-300 flex items-center gap-2 transition-colors" onClick={() => { setContextMenu({ visible: false, x:0,y:0 }); onCreateTransition?.(); }}>
                  <Shuffle className="w-4 h-4 text-orange-400" /> <span>🔀 Create Transition...</span>
              </button>
              <div className="my-1 border-t border-[#3a3a3f]" />
              <button className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-blue-600/30 hover:text-blue-300 flex items-center gap-2 transition-colors" onClick={() => { setContextMenu({ visible: false, x:0,y:0 }); onExportToMixer?.(); }}>
                  <Send className="w-4 h-4 text-blue-400" /> <span>📤 Export to Mixer...</span>
              </button>
              {contextMenu.noteId && (
                  <>
                      <div className="my-1 border-t border-[#3a3a3f]" />
                      <div className="px-3 py-1 text-[10px] text-gray-500 uppercase">Selected Note</div>
                      <button className="w-full px-3 py-2 text-left text-sm text-gray-200 hover:bg-red-600/30 hover:text-red-300 flex items-center gap-2 transition-colors" onClick={() => { onDeleteNote(contextMenu.noteId!); setContextMenu({ visible: false, x:0,y:0 }); }}>
                          <span>🗑️ Delete Note</span>
                      </button>
                  </>
              )}
          </div>
      )}
    </div>
  );
}