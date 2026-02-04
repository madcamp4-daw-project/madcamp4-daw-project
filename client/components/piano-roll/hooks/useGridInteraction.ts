import { useState, useRef, useCallback } from 'react';
import { Note, ToolType } from '@/lib/types/music';
import { TOTAL_KEYS, getKeyByRow, getKeyByPitch } from '@/lib/utils/keys';

interface InteractionProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
  notes: Note[];
  activeTool: ToolType;
  coordinates: any; // Return type of useGridCoordinates
  onAddNote: (note: Partial<Note> | Partial<Note>[]) => void;
  onDraftNote?: (note: Partial<Note> | null) => void;
  onUpdateNote: (id: string, changes: Partial<Note>) => void;
  onSelectNotes?: (ids: string[]) => void;
  onDeleteNote: (id: string) => void;
  onMuteNote?: (id: string) => void; // Mute 토글
  onSliceNote?: (id: string, sliceTime: number) => void; // 노트 자르기
  activeChannelId?: string;
  onSwitchChannel?: (id: string) => void;
  snapGrid: number;
  stampNote?: Partial<Note> | null; // Stamp 모드용 복사된 노트
  scrollX: number;
  scrollY: number;
}

export const useGridInteraction = ({
  canvasRef,
  notes,
  activeTool,
  coordinates,
  onAddNote,
  onDraftNote,
  onUpdateNote,
  onSelectNotes,
  onDeleteNote,
  onMuteNote,
  onSliceNote,
  activeChannelId,
  onSwitchChannel,
  snapGrid,
  stampNote,
  scrollX,
  scrollY
}: InteractionProps) => {
  const { screenXToTime, screenYToRow, getNoteRect, snapTime, timeToScreenX } = coordinates;

  // -- REF STATE (For High Performance Loop) --
  const interactionState = useRef<{
      hoveredCell: { time: number; row: number } | null;
      selectionBox: { x: number; y: number; w: number; h: number } | null;
      isDragging: boolean;
  }>({
      hoveredCell: null,
      selectionBox: null,
      isDragging: false
  });

  // Drag Internal State
  const dragRef = useRef<{
    isDragging: boolean;
    startX: number;
    startY: number;
    action: 'move' | 'resize' | 'select' | 'create' | null;
    targetNote: Partial<Note> | null;
    initialStart: number;
    initialPitch: string;
    initialDuration: number;
  }>({
    isDragging: false,
    startX: 0,
    startY: 0,
    action: null,
    targetNote: null,
    initialStart: 0,
    initialPitch: 'C5',
    initialDuration: 0
  });

  const getEventLocalPoint = (e: React.MouseEvent | MouseEvent) => {
    if (e instanceof MouseEvent) {
        return { x: e.offsetX, y: e.offsetY };
    } else if ('nativeEvent' in e) {
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    }
    return { x: 0, y: 0 };
  };

  const handleMouseDown = useCallback((e: React.MouseEvent | MouseEvent) => {
    let { x, y } = getEventLocalPoint(e);
    x += scrollX;
    y += scrollY;
    
    // 노트 클릭 감지 (Z-index 역순)
    const clickedNote = notes.slice().reverse().find(n => {
        if (activeChannelId && n.channelId && n.channelId !== activeChannelId) return false;
        const r = getNoteRect(n);
        return x >= r.x && x <= r.x + r.w && y >= r.y && y <= r.y + r.h;
    });

    // ========== DELETE 도구: 클릭한 노트 삭제 ==========
    if (activeTool === 'delete' && clickedNote) {
        onDeleteNote(clickedNote.id);
        return;
    }

    // ========== MUTE 도구: 클릭한 노트 음소거 토글 ==========
    if (activeTool === 'mute' && clickedNote && onMuteNote) {
        onMuteNote(clickedNote.id);
        return;
    }

    // ========== SLICE 도구: 클릭 위치에서 노트 자르기 ==========
    if (activeTool === 'slice' && clickedNote && onSliceNote) {
        const sliceTime = screenXToTime(x);
        // 노트 시작점이나 끝점이 아닌 중간만 자르기
        if (sliceTime > clickedNote.start && sliceTime < clickedNote.start + clickedNote.duration) {
            onSliceNote(clickedNote.id, sliceTime);
        }
        return;
    }

    // ========== STAMP 도구: 저장된 노트를 클릭 위치에 복사 ==========
    if (activeTool === 'stamp' && stampNote) {
        const startMeasure = screenXToTime(x);
        const snappedStart = snapTime(startMeasure, snapGrid);
        const row = screenYToRow(y);
        const key = getKeyByRow(row);
        
        if (key) {
            const newNote: Partial<Note> = {
                ...stampNote,
                pitch: key.pitch,
                start: snappedStart,
            };
            onAddNote(newNote);
        }
        return;
    }

    // ========== SELECT/DRAW 도구: 기존 노트 편집 ==========
    if (clickedNote && (activeTool === 'select' || activeTool === 'draw')) {
        const rect = getNoteRect(clickedNote);
        const isResize = x > rect.x + rect.w - 10; 

        dragRef.current = {
            isDragging: true,
            startX: x,
            startY: y,
            action: isResize ? 'resize' : 'move',
            targetNote: clickedNote,
            initialStart: clickedNote.start,
            initialPitch: clickedNote.pitch,
            initialDuration: clickedNote.duration
        };
        interactionState.current.isDragging = true;
        return;
    }

    // ========== DRAW/PAINT 도구: 새 노트 생성 (드래그 시작) ==========
    if (activeTool === 'draw' || activeTool === 'paint') {
        const startMeasure = screenXToTime(x);
        const snappedStart = snapTime(startMeasure, snapGrid); 
        const row = screenYToRow(y);
        const key = getKeyByRow(row);
        
        if (key) {
            const newNote: Partial<Note> = {
                pitch: key.pitch,
                start: snappedStart,
                duration: snapGrid, 
                velocity: 0.8,
            };

            dragRef.current = {
                isDragging: true,
                startX: x,
                startY: y,
                action: 'create',
                targetNote: newNote,
                initialStart: snappedStart,
                initialPitch: key.pitch,
                initialDuration: snapGrid
            };
            interactionState.current.isDragging = true;

            if (onDraftNote) onDraftNote(newNote);
        }
        return; 
    }

    // ========== SELECT 도구: 선택 박스 시작 ==========
    if (activeTool === 'select' && !clickedNote) {
        dragRef.current = {
            isDragging: true,
            startX: x,
            startY: y,
            action: null, 
            targetNote: null,
            initialStart: 0,
            initialPitch: 'C5',
            initialDuration: 0
        };
        interactionState.current.selectionBox = { x, y, w: 0, h: 0 };
        interactionState.current.isDragging = true;
    }

  }, [notes, activeTool, activeChannelId, snapGrid, coordinates, onAddNote, onSelectNotes, onDraftNote, onDeleteNote, onMuteNote, onSliceNote, stampNote]);

  const handleMouseMove = useCallback((e: React.MouseEvent | MouseEvent) => {
      let { x, y } = getEventLocalPoint(e);
      x += scrollX;
      y += scrollY;

      // 1. Update Hover (Restored for Guide)
      const time = screenXToTime(x);
      const row = screenYToRow(y);
      interactionState.current.hoveredCell = { time: snapTime(time, snapGrid), row };

      if (!dragRef.current.isDragging) return;

      const { startX, startY } = dragRef.current;
      const measureDelta = screenXToTime(x) - screenXToTime(startX);
      
      // 2. Box Selection
      if (activeTool === 'select' && !dragRef.current.targetNote) {
          interactionState.current.selectionBox = {
              x: Math.min(startX, x),
              y: Math.min(startY, y),
              w: Math.abs(x - startX),
              h: Math.abs(y - startY)
          };
          return;
      }

      // 3. Move Note
      if (dragRef.current.action === 'move' && dragRef.current.targetNote && 'id' in dragRef.current.targetNote) {
          if (!onUpdateNote) return;
          // ... (Move logic same)
          let newStart = dragRef.current.initialStart + measureDelta;
          newStart = snapTime(newStart, snapGrid); 
          if (newStart < 0) newStart = 0;
          
          const startRow = screenYToRow(startY);
          const currentRow = screenYToRow(y);
          const rowDelta = currentRow - startRow;
          
          const originalKey = getKeyByPitch(dragRef.current.initialPitch);
          if (originalKey) {
             const newIndex = originalKey.index + rowDelta;
             if (newIndex >= 0 && newIndex < TOTAL_KEYS) {
                 const newKey = getKeyByRow(newIndex);
                 // Need safe cast since targetNote type is Partial<Note> here
                 const tNote = dragRef.current.targetNote as Note; 
                 if (newKey && newKey.pitch !== tNote.pitch) {
                     onUpdateNote(tNote.id, { pitch: newKey.pitch });
                 }
             }
          }
          const tNote = dragRef.current.targetNote as Note; 
          if (Math.abs(newStart - tNote.start) > 0.001) {
             onUpdateNote(tNote.id, { start: newStart });
          }
      } 
      // 4. Resize Note (Existing)
      else if (dragRef.current.action === 'resize' && dragRef.current.targetNote && 'id' in dragRef.current.targetNote) {
          const tNote = dragRef.current.targetNote as Note;
          const timeCurrent = screenXToTime(x);
          const timeStart = screenXToTime(startX);
          const tDelta = timeCurrent - timeStart;
          
          let newDur = dragRef.current.initialDuration + tDelta;
          const minDur = snapGrid; 
          if (newDur < minDur) newDur = minDur;
          newDur = snapTime(newDur, snapGrid); 
          
          if (Math.abs(newDur - tNote.duration) > 0.001) {
              onUpdateNote(tNote.id, { duration: newDur });
          }
      }
      // 5. Create Note (Drag to Resize)
      else if (dragRef.current.action === 'create' && dragRef.current.targetNote) {
          const timeCurrent = screenXToTime(x);
          // Start is fixed at initial click moment
          // But duration = current - start
          // wait, startX corresponds to initialStart time.
          const initialTime = dragRef.current.initialStart;
          // If dragging backwards? Assume forward only for simple MVP or handle negative?
          // Piano roll creation usually allows backward drag which sets start earlier. 
          // But let's stick to forward (Duration) for simplicity or standard logic.
          
          let duration = timeCurrent - initialTime;
          // snap?
          duration = snapTime(duration, snapGrid);
          if (duration < snapGrid) duration = snapGrid;

          // Update local target ref
          const updatedNote = { ...dragRef.current.targetNote, duration };
          dragRef.current.targetNote = updatedNote;

          // Update Draft Visuals
          if (onDraftNote) onDraftNote(updatedNote);
      }

  }, [activeTool, coordinates, snapGrid, onUpdateNote, notes, activeChannelId, onDraftNote]);

  const handleMouseUp = useCallback((e: React.MouseEvent | MouseEvent) => {
    
    // Commit Creation
    if (dragRef.current.action === 'create' && dragRef.current.targetNote) {
        onAddNote(dragRef.current.targetNote);
        if (onDraftNote) onDraftNote(null);
    }

    // ========== 선택 박스 완료: 박스 내부 노트 선택 ==========
    if (interactionState.current.selectionBox && onSelectNotes) {
        const box = interactionState.current.selectionBox;
        const selectedIds: string[] = [];

        notes.forEach(note => {
            if (activeChannelId && note.channelId && note.channelId !== activeChannelId) return;
            const rect = getNoteRect(note);
            
            // 박스와 노트 rect가 겹치는지 확인
            const overlaps = !(
                rect.x > box.x + box.w ||
                rect.x + rect.w < box.x ||
                rect.y > box.y + box.h ||
                rect.y + rect.h < box.y
            );
            
            if (overlaps) {
                selectedIds.push(note.id);
            }
        });

        if (selectedIds.length > 0) {
            onSelectNotes(selectedIds);
        }
    }

    dragRef.current.isDragging = false;
    dragRef.current.action = null;
    dragRef.current.targetNote = null;
    interactionState.current.isDragging = false;
    
    if (interactionState.current.selectionBox) {
        interactionState.current.selectionBox = null;
    }
  }, [onAddNote, onDraftNote, onSelectNotes, notes, activeChannelId, getNoteRect]);

  return {
    interactionState, // Expose Ref
    handleMouseDown,
    handleMouseMove,
    handleMouseUp
  };
};
