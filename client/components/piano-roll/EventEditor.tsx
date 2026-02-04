'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Note } from '@/lib/types/music';

interface EventEditorProps {
    notes: Note[];
    zoomX: number;
    scrollX: number;
    width: number;
    height: number;
    activeChannelId: string;
    onUpdateNote: (id: string, updates: Partial<Note>) => void;
}

type EventTarget = 'velocity' | 'pan' | 'pitch' | 'release' | 'modX' | 'modY';

export default function EventEditor({
    notes, zoomX, scrollX, width, height, activeChannelId, onUpdateNote
}: EventEditorProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [target, setTarget] = useState<EventTarget>('velocity');
    const [isDragging, setIsDragging] = useState(false);

    // Render Logic
    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Clear
        ctx.fillStyle = '#23262b'; // Dark background
        ctx.fillRect(0, 0, width, height);
        
        // Draw Grid (Light vertical lines) matches Piano Roll
        // We need 'beats' info or just draw based on pixels?
        // Ideally pass in same grid logic, but for now simple vertical lines every beat
        const beatWidth = zoomX; 
        const startBeat = Math.floor(scrollX / beatWidth);
        const endBeat = Math.ceil((scrollX + width) / beatWidth);

        ctx.strokeStyle = '#2f343b';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = startBeat; i <= endBeat; i++) {
            const x = (i * beatWidth) - scrollX;
            ctx.moveTo(x + 0.5, 0);
            ctx.lineTo(x + 0.5, height);
        }
        ctx.stroke();

        // Draw Zero Line (Center) for Pan/Pitch
        if (target === 'pan' || target === 'pitch') {
             const midY = height / 2;
             ctx.strokeStyle = '#4b5563';
             ctx.beginPath();
             ctx.moveTo(0, midY);
             ctx.lineTo(width, midY);
             ctx.stroke();
        }

        // Draw Events
        // Filter notes by active channel? Usually Event Editor shows active pattern's events.
        // Assuming 'notes' passed are already filtered or we filter here.
        // We'll trust parent to pass relevant notes (active channel / selected pattern).
        
        ctx.lineWidth = 2;

        notes.forEach(note => {
             // Calculate X position
             // note.start is in beats? If 'start' is Measures:Quarter:Sixteenth, we need a converter.
             // implementation_plan says note.start is number (assuming steps or beats).
             // Let's assume note.start is in BEATS (Quarter notes) for MVP consistency with 'zoomX' (pixels per beat).
             
             const x = (note.start * zoomX) - scrollX;
             const w = Math.max(4, (note.duration * zoomX)); // Width of the note representation? 
             // FL Event Editor usually shows a single vertical line/bar at the START of the note.
             
             if (x < -10 || x > width + 10) return; // Skip offscreen

             // Calculate Value Height
             let value = 0; // Normalized 0-1 usually
             switch(target) {
                 case 'velocity': value = note.velocity; break;
                 case 'pan': value = (note.pan + 1) / 2; break; // -1..1 -> 0..1
                 case 'pitch': value = 0.5; break; // complex, depends on deviation
                 case 'release': value = note.release || 0.5; break;
                 default: value = 0.5;
             }

             const barHeight = value * height;
             const y = height - barHeight;

             // Color
             // FL uses pink/red for selected, lighter color for unselected.
             // We can use a default 'note' color style.
             const isSelected = false; // Need selection state passed in?
             ctx.strokeStyle = isSelected ? '#ff4d4d' : '#d4d4d8'; // Red vs Light Grey
             ctx.fillStyle = isSelected ? '#ff4d4d' : '#d4d4d8';

             // Draw Stick
             ctx.beginPath();
             ctx.moveTo(x + 1, height);
             ctx.lineTo(x + 1, y);
             ctx.stroke();

             // Draw Cap (Handle)
             ctx.fillRect(x - 1, y - 1, 4, 3);
        });

    }, [notes, zoomX, scrollX, width, height, target]);

    // Interaction Logic
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true);
        updateEventFromMouse(e);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (isDragging) {
            updateEventFromMouse(e);
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
    };

    const updateEventFromMouse = (e: React.MouseEvent) => {
        // Find note at X (with some tolerance)
        const rect = canvasRef.current?.getBoundingClientRect();
        if(!rect) return;
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        // Map mouseX to Time
        const worldX = mouseX + scrollX;
        // Find closest note start?
        // FL Event Editor acts like a "Paint" tool across the values.
        // It modifies any note under the cursor X.
        
        const beatAtX = worldX / zoomX;
        
        // Find notes within a small beat window (e.g., 0.25 beat) of the cursor?
        // Or strictly notes that "Start" near here?
        // Simple approach: Find note closest to this X.
        
        // Filter notes near cursor X
        const tolerance = 10 / zoomX; // 10 pixels tolerance
        const targetNotes = notes.filter(n => Math.abs(n.start - beatAtX) < tolerance);
        
        // Update value
        const normalizedY = 1 - (mouseY / height);
        const newValue = Math.max(0, Math.min(1, normalizedY));

        targetNotes.forEach(note => {
             let update: Partial<Note> = {};
             if (target === 'velocity') update.velocity = newValue;
             else if (target === 'pan') update.pan = (newValue * 2) - 1; // 0..1 -> -1..1
             
             onUpdateNote(note.id, update);
        });
    };

    return (
        <div className="w-full h-full flex flex-col bg-[#23262b] select-none text-[10px]">
            {/* Header / Target Selector */}
            <div className="h-6 flex items-center px-2 bg-[#2f343b] border-b border-[#1c1e22] space-x-2 shrink-0">
                <span className="text-zinc-500 uppercase font-bold tracking-wider">Control</span>
                 <select 
                    className="bg-[#1e2125] text-zinc-300 border border-zinc-700 rounded px-1 outline-none py-0.5 hover:border-zinc-500 cursor-pointer"
                    value={target}
                    onChange={(e) => setTarget(e.target.value as EventTarget)}
                >
                    <option value="velocity">Note Velocity</option>
                    <option value="pan">Note Pan</option>
                    <option value="release">Note Release</option>
                    <option value="pitch">Note Pitch</option>
                    <option value="modX">Filter Cutoff (Mod X)</option>
                    <option value="modY">Filter Res (Mod Y)</option>
                </select>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative overflow-hidden cursor-crosshair">
                <canvas
                    ref={canvasRef}
                    width={width}
                    height={height - 24} // Subtract header height
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
                    className="absolute top-0 left-0"
                />
            </div>
        </div>
    );
}
