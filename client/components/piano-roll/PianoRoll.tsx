'use client';

import React, { useState, useEffect, useRef } from 'react';
import { InstrumentData, Channel, Note, ToolType, EffectData, TimeMarker } from '@/lib/types/music';
import { audioEngine } from '@/lib/audio/AudioEngine';
import PianoKeys from './PianoKeys';
import Ruler from './Ruler';
import GridCanvas from './GridCanvas';
import Toolbar from './Toolbar';
import LeftControlPanel from './LeftControlPanel';
import { ChordType } from '@/lib/constants/chords';
import EffectRackPanel from './EffectRackPanel';
import NotePropertiesDialog from './NotePropertiesDialog';
import RiffMachineDialog from './RiffMachineDialog';
import EventEditor from './EventEditor';
import MarkerDialog from './MarkerDialog'; 
import { ScaleType } from '@/lib/constants/scales';
import HelpWikiDialog from './HelpWikiDialog';

import { buildKeyMap, TOTAL_KEYS, getKeyByPitch } from '@/lib/utils/keys';
import { useGridCoordinates } from './hooks/useGridCoordinates'; // Optional, but logic mainly here

export default function PianoRoll() {
  const [activeChannelId, setActiveChannelId] = useState<string>('c1');
  const [activeTool, setActiveTool] = useState<ToolType>('draw');
  const [selectedChordType, setSelectedChordType] = useState<ChordType>('Major'); 
  const [notes, setNotes] = useState<Note[]>([]); 
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());

  // Riff Machine State
  const [isRiffMachineOpen, setIsRiffMachineOpen] = useState(false);

  // Note Properties State (New)
  const [currentNoteColor, setCurrentNoteColor] = useState<number>(0);
  const [isSlideMode, setIsSlideMode] = useState<boolean>(false);
  const [isPortaMode, setIsPortaMode] = useState<boolean>(false);

  // Scale Helper State
  const [activeScale, setActiveScale] = useState<ScaleType>('Chromatic');
  const [activeScaleRoot, setActiveScaleRoot] = useState<number>(0); // 0=C

  // Waveform Helper State
  const [waveformBuffer, setWaveformBuffer] = useState<AudioBuffer | null>(null);

  const handleRiffAccept = (newNotes: Note[]) => {
      const selectedIds = Array.from(selectedNoteIds);
      setNotes(prev => {
          const others = prev.filter(n => !selectedNoteIds.has(n.id));
          return [...others, ...newNotes];
      });
      setIsRiffMachineOpen(false);
  };

  const handleSelectNotes = (ids: string[]) => {
      setSelectedNoteIds(new Set(ids));
      console.log('Selected notes:', ids.length);
  };
  
  // View State
  const [zoomX, setZoomX] = useState(40); // Pixels per beat
  const [zoomY, setZoomY] = useState(20); // Pixels per key
  const [scrollX, setScrollX] = useState(0);
  const [scrollY, setScrollY] = useState(0);
  const [viewportWidth, setViewportWidth] = useState(800);
  const [viewportHeight, setViewportHeight] = useState(600);
  
  // Dimensions
  // TOTAL_KEYS imported from keys.ts (128)
  const VIRTUAL_WIDTH = 24000; // Increased to ~150 measures (safe limit) 
  const VIRTUAL_HEIGHT = TOTAL_KEYS * zoomY; 

  // Refs
  const gridContainerRef = useRef<HTMLDivElement>(null);

  // Dialog State
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Effect Panel State
  const [isEffectsOpen, setIsEffectsOpen] = useState(false);

  // Mock Channel Data
  const [channels, setChannels] = useState<Channel[]>([
    {
        id: 'c1',
        name: 'Grand Piano',
        instrument: { type: 'Synth', options: { oscillator: { type: 'triangle' } } },
        effects: [],
        volume: 0,
        pan: 0,
        mute: false,
        solo: false,
        color: '#FF5555'
    },
    {
        id: 'c2',
        name: 'Saw Lead',
        instrument: { type: 'FMSynth', options: {} },
        effects: [],
        volume: -2,
        pan: 0,
        mute: false,
        solo: false,
        color: '#55FF55'
    }
  ]);

  // Handlers
  const handleAddNote = (newNoteOrNotes: Partial<Note> | Partial<Note>[]) => {
     const notesToAdd = Array.isArray(newNoteOrNotes) ? newNoteOrNotes : [newNoteOrNotes];
     
     const newNotes = notesToAdd.map(n => {
         const id = Math.random().toString(36).substr(2, 9);
         return {
             id,
             pitch: n.pitch || 'C5',
             start: n.start || 0,
             duration: n.duration || 0.0625, // Default 1/16th note (1 Grid Cell)
             velocity: n.velocity || 0.8,
             release: 0.5,
             pan: 0,
             modX: 0.5,
             modY: 0.5,
             activePitch: 0,
             colorIndex: currentNoteColor, 
             channelId: activeChannelId, 
             isSlide: isSlideMode,
             isPorta: isPortaMode,
             ...n
         } as Note;
     });

     setNotes(prev => [...prev, ...newNotes]);
     
     if (newNotes.length > 0) {
         audioEngine.triggerAttackRelease(activeChannelId, newNotes[0].pitch, "8n");
     }
  };

  const handleDeleteNote = (noteId: string) => {
      setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  const updateNote = (noteId: string, changes: Partial<Note>) => {
      setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...changes } : n));
  };

  // Mute 도구: 노트 음소거 토글
  const handleMuteNote = (noteId: string) => {
      setNotes(prev => prev.map(n => 
          n.id === noteId ? { ...n, isMuted: !n.isMuted } : n
      ));
  };

  // Slice 도구: 지정 시간에 노트를 두 개로 분할
  const handleSliceNote = (noteId: string, sliceTime: number) => {
      setNotes(prev => {
          const note = prev.find(n => n.id === noteId);
          if (!note) return prev;
          
          const firstDuration = sliceTime - note.start;
          const secondDuration = note.duration - firstDuration;
          
          if (firstDuration <= 0 || secondDuration <= 0) return prev;
          
          const firstNote = { ...note, duration: firstDuration };
          const secondNote = { 
              ...note, 
              id: Math.random().toString(36).substr(2, 9),
              start: sliceTime, 
              duration: secondDuration 
          };
          
          return prev.filter(n => n.id !== noteId).concat([firstNote, secondNote]);
      });
  };

  // Stamp 도구: 복사할 노트 저장
  const [stampNote, setStampNote] = useState<Partial<Note> | null>({
      duration: 0.25, // 기본 1/4 박자
      velocity: 0.8
  });

  // 선택된 노트가 있으면 자동으로 stamp에 복사
  useEffect(() => {
      if (selectedNoteIds.size > 0 && activeTool === 'stamp') {
          const selectedId = Array.from(selectedNoteIds)[0];
          const selectedNote = notes.find(n => n.id === selectedId);
          if (selectedNote) {
              setStampNote({
                  duration: selectedNote.duration,
                  velocity: selectedNote.velocity,
                  colorIndex: selectedNote.colorIndex,
                  isSlide: selectedNote.isSlide,
                  isPorta: selectedNote.isPorta
              });
          }
      }
  }, [selectedNoteIds, activeTool, notes]);

  const handlePlayNote = (pitch: string) => {
      audioEngine.triggerAttackRelease(activeChannelId, pitch, "8n");
  };

  const handlePlay = () => {
      audioEngine.scheduleSequence(notes, markers);
      audioEngine.start();
  };
  const handleStop = () => audioEngine.stop();

  const handleNoteDoubleClick = (note: Note) => {
      setEditingNote(note);
      setIsDialogOpen(true);
  };

  const handleDialogAccept = (updatedNote: Note) => {
      setNotes(prev => prev.map(n => n.id === updatedNote.id ? updatedNote : n));
      setIsDialogOpen(false);
      setEditingNote(null);
  };

  // Center C5 on mount & Observe Size
  useEffect(() => {
      if (!gridContainerRef.current) return;
      
      // Initial Scroll Center
      const containerHeight = gridContainerRef.current.clientHeight || 600;
      const c5Key = getKeyByPitch('C5');
      if (c5Key) {
          const rowC5 = c5Key.index;
          const targetScrollY = (rowC5 * zoomY) - (containerHeight / 2);
          gridContainerRef.current.scrollTop = targetScrollY;
          setScrollY(targetScrollY);
      }

      // Resize Observer for Virtualization
      const ro = new ResizeObserver(entries => {
          for (const entry of entries) {
              setViewportWidth(entry.contentRect.width);
              setViewportHeight(entry.contentRect.height);
          }
      });
      ro.observe(gridContainerRef.current);
      return () => ro.disconnect();
  }, [zoomY]); // Run once on mount (depend on zoomY if needed, but usually just initial)

  const handleUpdateEffects = (newEffects: EffectData[]) => {
      setChannels(prev => prev.map(ch => 
          ch.id === activeChannelId ? { ...ch, effects: newEffects } : ch
      ));
      // Sync Audio Engine
      audioEngine.updateChannelEffects(activeChannelId, newEffects);
  };
  
  const handleInstrumentChange = (newType: string) => {
      setChannels(prev => prev.map(ch => {
          if (ch.id === activeChannelId) {
             const newCh = { ...ch, instrument: { ...ch.instrument, type: newType } };
             audioEngine.createChannel(newCh); // Re-create audio channel
             return newCh;
          }
          return ch;
      }));
  };

  const onScroll = (e: React.UIEvent<HTMLDivElement>) => {
      setScrollX(e.currentTarget.scrollLeft);
      setScrollY(e.currentTarget.scrollTop);
  };

  const [isLooping, setIsLooping] = useState(false);
  const requestRef = useRef<number | null>(null);

  useEffect(() => {
    const initAudio = async () => {
        await audioEngine.initialize();
        channels.forEach(ch => audioEngine.createChannel(ch));
    };
    initAudio();
  }, [channels]);

  // Audio Sync: GridCanvas now handles its own rAF loop for Playhead.


  const [markers, setMarkers] = useState<any[]>([
      { id: 'start', time: 0, type: 'Signature', numerator: 4, denominator: 4 }
  ]);

  // Marker Dialog State
  const [markerDialogState, setMarkerDialogState] = useState<{
      isOpen: boolean;
      marker?: TimeMarker;
      defaultTime?: number;
  }>({ isOpen: false });

  const handleAddMarker = (time: number) => {
      // Open Dialog for new marker
      setMarkerDialogState({ isOpen: true, defaultTime: time });
  };
  
  const handleEditMarker = (marker: TimeMarker) => {
       setMarkerDialogState({ isOpen: true, marker });
  };

  const handleMarkerAccept = (marker: TimeMarker) => {
      setMarkers(prev => {
          // If editing, remove old one with same ID
          const others = prev.filter(m => m.id !== marker.id);
          // Also check if there is already a marker at this time? (For signatures, one per beat usually)
          // For now, allow overwrite if exact same time?
          // Let's just push and sort later if needed.
          return [...others, marker].sort((a,b) => a.time - b.time);
      });
  };

  const handleMarkerDelete = (id: string) => {
      setMarkers(prev => prev.filter(m => m.id !== id));
  };


  
  // Waveform Drag & Drop Handler
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith('audio/')) {
          try {
              const arrayBuffer = await file.arrayBuffer();
              const audioContext = audioEngine.getContext().rawContext; 
              // Note: Tone.getContext() returns ToneAudioContext, .rawContext is the native AudioContext (or compatible).
              // decodeAudioData requires native context usually.
              // Tone.js v14/15 exposes rawContext.
              const decoded = await audioContext.decodeAudioData(arrayBuffer);
              setWaveformBuffer(decoded);
              console.log("Waveform loaded:", decoded.duration, "seconds");
          } catch (err) {
              console.error("Failed to load audio:", err);
          }
      }
  };
  // Wiki Dialog State
  const [isWikiOpen, setIsWikiOpen] = useState(false);

  // Handlers
  const handleOpenWiki = () => setIsWikiOpen(true);
  
  const handleResetProject = () => {
      if (confirm("정말로 프로젝트를 초기화하시겠습니까? 모든 노트가 삭제됩니다.")) {
          setNotes([]);
          setMarkers([{ id: 'start', time: 0, type: 'Signature', numerator: 4, denominator: 4 }]);
          setChannels([
            { id: 'c1', name: 'Grand Piano', instrument: { type: 'Synth', options: { oscillator: { type: 'triangle' } } }, effects: [], volume: 0, pan: 0, mute: false, solo: false, color: '#FF5555' },
            { id: 'c2', name: 'Saw Lead', instrument: { type: 'FMSynth', options: {} }, effects: [], volume: -2, pan: 0, mute: false, solo: false, color: '#55FF55' }
          ]);
          setActiveChannelId('c1');
          audioEngine.stop();
          // Playhead reset handled by engine stop + next render loop
      }
  };

  const handleExportMidi = async () => {
      try {
        const { downloadMidi } = await import('@/lib/utils/midiExport');
        downloadMidi(notes, channels, 120); // Assuming 120 BPM for now
      } catch (e) {
          console.error("Failed to export MIDI", e);
          alert("MIDI Export 실패: " + e);
      }
  };

  // Snap State
  const [snapGrid, setSnapGrid] = useState<number>(0.0625); // Default 1/16

  return (
    <div className="flex flex-col h-full text-white select-none relative">
      <Toolbar 
         activeTool={activeTool}
         setActiveTool={setActiveTool}
         channels={channels}
         activeChannelId={activeChannelId}
         setActiveChannelId={setActiveChannelId}
         onPlay={handlePlay}
         onStop={handleStop}
         onToggleLoop={() => {
             const newVal = !isLooping; 
             setIsLooping(newVal); 
             // Default loop 4 measures for MVP or all notes range
             // For now fixed 4 measures
             audioEngine.setLoop(newVal, 0, '4m');
         }}
         isLooping={isLooping}
         onToggleEffects={() => setIsEffectsOpen(!isEffectsOpen)}
         isEffectsOpen={isEffectsOpen}
         onInstrumentChange={handleInstrumentChange}
         selectedChordType={selectedChordType}
         onSelectChordType={setSelectedChordType}
         onOpenRiffMachine={() => setIsRiffMachineOpen(true)}
         onOpenWiki={handleOpenWiki}
         onResetProject={handleResetProject}
         onExportMidi={handleExportMidi}
         
         // Snap Pass
         snapGrid={snapGrid}
         onSnapGridChange={setSnapGrid}
      />

      {/* ... (EffectRackPanel, NotePropertiesDialog) */}
      <EffectRackPanel 
          channelId={activeChannelId}
          effects={channels.find(c => c.id === activeChannelId)?.effects || []}
          onUpdateEffects={handleUpdateEffects}
          isOpen={isEffectsOpen}
          onClose={() => setIsEffectsOpen(false)}
      />

      {/* Note Properties Dialog */}
      {editingNote && (
           <NotePropertiesDialog 
               note={editingNote} 
               isOpen={isDialogOpen} 
               onClose={() => setIsDialogOpen(false)} 
               onAccept={handleDialogAccept}
           />
       )}

      {/* Wiki Dialog */}
      <HelpWikiDialog 
          isOpen={isWikiOpen} 
          onClose={() => setIsWikiOpen(false)} 
      />

      <div className="flex-1 flex overflow-hidden relative">
          <LeftControlPanel 
              currentColorIndex={currentNoteColor}
              onSelectColor={setCurrentNoteColor}
              isSlide={isSlideMode}
              onToggleSlide={() => setIsSlideMode(!isSlideMode)}
              isPorta={isPortaMode}
              onTogglePorta={() => setIsPortaMode(!isPortaMode)}
              activeScale={activeScale}
              activeScaleRoot={activeScaleRoot}
              onSelectScale={setActiveScale}
              onSelectScaleRoot={setActiveScaleRoot}
          />
        {/* Keys */}
        <div className="w-16 bg-zinc-800 border-r border-zinc-700 flex flex-col shrink-0">
             {/* Spacer to match Ruler height */}
             <div className="h-6 bg-zinc-800 border-b border-zinc-700 shrink-0 box-border" />
             
             {/* Key Container */}
             <div className="flex-1 relative overflow-hidden">
                <PianoKeys 
                    zoomY={zoomY} 
                    scrollY={scrollY} 
                    height={gridContainerRef.current?.clientHeight || 600} 
                    onPlayNote={handlePlayNote}
                 />
             </div>
        </div>

        {/* Grid Container */}
        <div className="flex-1 flex flex-col min-w-0 bg-zinc-900">
             <div className="h-6 bg-zinc-800 border-b border-zinc-700 shrink-0 overflow-hidden relative">
                <div style={{ transform: `translateX(${-scrollX}px)` }}>
                    <Ruler 
                        zoomX={zoomX} 
                        scrollX={0} 
                        width={VIRTUAL_WIDTH} 
                        markers={markers}
                        onAddMarker={handleAddMarker}
                        onEditMarker={handleEditMarker} // Pass edit handler
                        beatsPerBar={4} 
                    />
                </div>
             </div>
             
             <div 
                ref={gridContainerRef}
                className="flex-1 overflow-scroll relative scrollbar-thin scrollbar-thumb-zinc-600 scrollbar-track-zinc-800"
                onScroll={onScroll}
                onDragOver={handleDragOver}
                onDrop={handleDrop}
             >
                <div style={{ width: VIRTUAL_WIDTH, height: VIRTUAL_HEIGHT }} className="relative">
                    <div className="sticky top-0 left-0" style={{ width: viewportWidth, height: viewportHeight }}>
                        <GridCanvas 
                            notes={notes}
                            zoomX={zoomX}
                            zoomY={zoomY}
                            scrollX={scrollX}
                            scrollY={scrollY}
                            activeChannelId={activeChannelId}
                            width={viewportWidth}
                            height={viewportHeight}
                            activeTool={activeTool}
                            onAddNote={handleAddNote}
                            onDeleteNote={handleDeleteNote}
                            onUpdateNote={updateNote}
                            onNoteDoubleClick={handleNoteDoubleClick}
                            onSelectNotes={handleSelectNotes}
                            onMuteNote={handleMuteNote}
                            onSliceNote={handleSliceNote}
                            stampNote={stampNote}
                            selectedNoteIds={selectedNoteIds} 
                            selectedChordType={selectedChordType}
                            markers={markers}
                            activeScale={activeScale}
                            activeScaleRoot={activeScaleRoot}
                            waveformBuffer={waveformBuffer}
                            onSwitchChannel={setActiveChannelId}
                            snapGrid={snapGrid}
                        />
                    </div>
                </div>
             </div>
        </div>
      </div>

      <div className="h-36 bg-[#23262b] border-t border-[#1c1e22] shrink-0 relative">
         <EventEditor 
            notes={notes}
            zoomX={zoomX}
            scrollX={scrollX}
            width={gridContainerRef.current?.clientWidth || 800} 
            height={144}
            activeChannelId={activeChannelId}
            onUpdateNote={updateNote}
         />
      </div>
      
      {/* Riff Machine Dialog */}
      <RiffMachineDialog 
        isOpen={isRiffMachineOpen}
        onClose={() => setIsRiffMachineOpen(false)}
        onAccept={handleRiffAccept}
        selectedNotes={notes.filter(n => selectedNoteIds.has(n.id))}
      />

      {/* Marker Dialog */}
      <MarkerDialog 
          isOpen={markerDialogState.isOpen}
          onClose={() => setMarkerDialogState(prev => ({ ...prev, isOpen: false }))}
          onAccept={handleMarkerAccept}
          onDelete={handleMarkerDelete}
          initialMarker={markerDialogState.marker}
          defaultTime={markerDialogState.defaultTime}
      />
    </div>
  );
}
