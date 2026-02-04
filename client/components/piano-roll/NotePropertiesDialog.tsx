'use client';

import React, { useState, useEffect } from 'react';
import { Note } from '@/lib/types/music';

interface NotePropertiesDialogProps {
  note: Note;
  isOpen: boolean;
  onClose: () => void;
  onAccept: (updatedNote: Note) => void;
}

export default function NotePropertiesDialog({ note, isOpen, onClose, onAccept }: NotePropertiesDialogProps) {
  const [localNote, setLocalNote] = useState<Note>({ ...note });

  useEffect(() => {
    setLocalNote({ ...note });
  }, [note, isOpen]);

  if (!isOpen) return null;

  const handleChange = (field: keyof Note, value: any) => {
    setLocalNote(prev => ({ ...prev, [field]: value }));
  };

  // Convert Time to Bar:Step:Tick for display (Mock logic for now)
  // Assuming 1 Bar = 4 Beats = 16 Steps = 16.0 duration?
  // Let's keep it simple: just raw values for V1 or basic formatting.
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-600 rounded-lg shadow-2xl w-96 overflow-hidden text-xs text-zinc-300">
        {/* Header */}
        <div className="bg-zinc-700 px-2 py-1 flex justify-between items-center border-b border-zinc-600">
            <span className="font-bold text-orange-400">Note properties - {note.pitch}</span>
            <button onClick={onClose} className="hover:text-white">✕</button>
        </div>

        <div className="p-4 space-y-4">
            {/* Levels Section */}
            <div>
                <div className="text-zinc-500 mb-2 border-b border-zinc-700 pb-1">Levels</div>
                <div className="flex justify-between text-center">
                    {/* Knobs (Mock UI) */}
                    {[
                        { label: 'PAN', field: 'pan', min: -1, max: 1 },
                        { label: 'VEL', field: 'velocity', min: 0, max: 1 },
                        { label: 'REL', field: 'release', min: 0, max: 1 },
                        { label: 'MOD X', field: 'modX', min: 0, max: 1 },
                        { label: 'MOD Y', field: 'modY', min: 0, max: 1 },
                        { label: 'PITCH', field: 'activePitch', min: -1200, max: 1200 },
                    ].map(knob => (
                        <div key={knob.label} className="flex flex-col items-center space-y-1">
                             <div className="w-8 h-8 rounded-full border border-zinc-500 bg-zinc-900 relative">
                                 {/* Simple Visual Indicator of value */}
                                 <div className="absolute inset-1 rounded-full bg-zinc-700 overflow-hidden">
                                     {/* This would be a real circular slider */}
                                 </div>
                             </div>
                             <input 
                                type="range" 
                                min={knob.min} max={knob.max} step="0.01"
                                value={(localNote as any)[knob.field]}
                                onChange={(e) => handleChange(knob.field as keyof Note, parseFloat(e.target.value))}
                                className="w-10 h-1 opacity-50 cursor-pointer"
                             />
                             <span className="text-[9px]">{knob.label}</span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Toggles & Color */}
            <div className="flex justify-between items-center bg-zinc-900/50 p-2 rounded">
                <div className="flex space-x-3">
                    <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={localNote.isSlide}
                            onChange={(e) => handleChange('isSlide', e.target.checked)}
                        />
                        <span>Slide (△)</span>
                    </label>
                    <label className="flex items-center space-x-1 cursor-pointer">
                        <input 
                            type="checkbox" 
                            checked={localNote.isPorta}
                            onChange={(e) => handleChange('isPorta', e.target.checked)}
                        />
                        <span>Porta (∫)</span>
                    </label>
                </div>
                
                <div className="flex items-center space-x-1">
                    <span>Color</span>
                    <input 
                        type="number" min="0" max="15" 
                        value={localNote.colorIndex}
                        onChange={(e) => handleChange('colorIndex', parseInt(e.target.value))}
                        className="w-10 bg-zinc-800 border border-zinc-600 rounded text-center"
                    />
                    <div className="w-4 h-4 rounded" style={{ backgroundColor: '#a3e635' }}></div>
                </div>
            </div>

            {/* Time Section */}
            <div>
                <div className="text-zinc-500 mb-2 border-b border-zinc-700 pb-1">Time</div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="flex flex-col">
                        <label className="mb-1">Start time</label>
                        <input 
                            type="number" step="0.01"
                            value={localNote.start}
                            onChange={(e) => handleChange('start', parseFloat(e.target.value))}
                            className="bg-red-900/80 text-orange-200 border border-red-900 rounded px-2 py-1 text-right font-mono text-lg"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="mb-1">Duration</label>
                        <input 
                            type="number" step="0.01"
                            value={localNote.duration}
                            onChange={(e) => handleChange('duration', parseFloat(e.target.value))}
                            className="bg-red-900/80 text-orange-200 border border-red-900 rounded px-2 py-1 text-right font-mono text-lg"
                        />
                    </div>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="bg-zinc-700 px-4 py-2 flex justify-between items-center">
            <button 
                onClick={() => setLocalNote({ ...note })}
                className="px-4 py-1 bg-zinc-600 hover:bg-zinc-500 rounded text-zinc-200 shadow"
            >
                Reset
            </button>
            <button 
                onClick={() => onAccept(localNote)}
                className="px-4 py-1 bg-zinc-600 hover:bg-zinc-500 rounded text-zinc-200 font-bold shadow"
            >
                Accept
            </button>
        </div>
      </div>
    </div>
  );
}
