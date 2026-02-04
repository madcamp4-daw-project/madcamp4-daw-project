import React, { useRef, useState } from 'react';
import useProjectStore from '../../../store/useProjectStore';
import styles from './PianoRoll.module.css';

const NOTE_HEIGHT = 20;
const STEP_WIDTH = 40; // 16th note width
const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

// Generate keys for 4 octaves (C3 to C6)
const OCTAVES = [6, 5, 4, 3];
const KEYS = [];
OCTAVES.forEach(octave => {
    // Reverse notes to have high pitch at top
    [...NOTES].reverse().forEach(note => {
        KEYS.push({ note, octave, label: `${note}${octave}`, isBlack: note.includes('#') });
    });
});

const PianoRoll = () => {
    const scrollRef = useRef(null);
    const activePatternId = useProjectStore(state => state.activePatternId);
    const notes = useProjectStore(state => state.patterns[activePatternId]?.notes || []);
    const length = useProjectStore(state => state.patterns[activePatternId]?.length || 16);
    const addNote = useProjectStore(state => state.addNote);
    const removeNote = useProjectStore(state => state.removeNote);

    const handleGridClick = (e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
        const y = e.clientY - rect.top + e.currentTarget.scrollTop;

        // Calculate Time (Step) and Pitch (Key Index)
        const stepIndex = Math.floor(x / STEP_WIDTH);
        const keyIndex = Math.floor(y / NOTE_HEIGHT);

        if (keyIndex < 0 || keyIndex >= KEYS.length) return;
        if (stepIndex < 0 || stepIndex >= length) return;

        const targetKey = KEYS[keyIndex];
        
        // Check if note exists at this position (simple verification)
        // In reality, we might want to check overlaps
        
        // Time format: "0:0:0" (Bars:Beats:Sixteenths)
        // Simple conversion for now: 16th steps
        // Tone.Time(stepIndex * Tone.Time("16n").toSeconds()) 
        // Let's store as "Bars:Beats:Sixteenths" string for Tone.Part
        
        const quarter = Math.floor(stepIndex / 4);
        const sixteenth = stepIndex % 4;
        const timeStr = `0:${quarter}:${sixteenth}`;

        const newNote = {
            id: Date.now(), // Simple ID
            channelId: 5, // Hardcoded to 'Piano' channel for now
            note: targetKey.label,
            time: timeStr,
            duration: '16n',
            // Store grid coords for easy rendering
            step: stepIndex,
            keyIndex: keyIndex
        };

        addNote(activePatternId, newNote);
    };

    const handleNoteClick = (e, noteId) => {
        e.stopPropagation();
        // Right click to remove? Or simple click to remove for prototype?
        // Let's do simple click to remove for now to keep it easy without context menu
        removeNote(activePatternId, noteId);
    };

    return (
        <div className={styles.pianoRollContainer}>
            {/* Keys Sidebar */}
            <div className={styles.keysContainer} style={{ paddingTop: 0 }}>
                 {/* Sync scroll manually or use same container? 
                     Better to put keys inside the scrollable area or sync scrollTop.
                     For simplicity, let's put keys and grid in separate flex divs but sync scroll? 
                     Or just let the grid scroll and keys be sticky? 
                     Sticky is easiest.
                 */}
                 <div style={{ marginTop: -scrollRef.current?.scrollTop }}> 
                    {/* Actually, syncing scroll is tricky without state. 
                        Let's just render keys absolute left? No.
                        Let's try a simple synced scroll approach if needed, 
                        but for now let's just render the keys list statically and assume it fits or user scrolls whole page?
                        No, piano roll should scroll vertically.
                        
                        Alternative: Container with overflow:hidden, Inner div with transform.
                    */}
                 </div>
                 {/* Re-rendering keys inside the shared scroll container is easier layout-wise for MVP */}
            </div>

            {/* Main Grid Area */}
            <div 
                className={styles.gridContainer} 
                ref={scrollRef}
                onClick={handleGridClick}
            >
                <div style={{ 
                    width: `${length * STEP_WIDTH}px`, 
                    height: `${KEYS.length * NOTE_HEIGHT}px`,
                    position: 'relative'
                }}>
                    {/* Background Grid */}
                    <div className={styles.gridBackground} style={{ backgroundSize: `${STEP_WIDTH}px ${NOTE_HEIGHT}px` }} />

                    {/* Keys Overlay (Left Fixed?) - Actually let's put keys IN here absolutely positioned to left? 
                        Then they scroll with Y but NOT X. 
                        Sticky positioning!
                    */}
                    <div style={{ position: 'absolute', left: 0, top: 0, width: '60px', height: '100%', zIndex: 5 }}>
                        {KEYS.map((key, i) => (
                            <div 
                                key={i} 
                                className={`${styles.key} ${key.isBlack ? styles.keyBlack : styles.keyWhite}`}
                                style={{ 
                                    height: `${NOTE_HEIGHT}px`, 
                                    position: 'sticky', 
                                    left: 0,
                                    width: '60px'
                                }}
                            >
                                {key.label}
                            </div>
                        ))}
                    </div>

                    {/* Notes */}
                    {notes.map(note => {
                         // If note doesn't have keyIndex (legacy/loaded), find it
                         const y = note.keyIndex !== undefined ? note.keyIndex * NOTE_HEIGHT : 
                                   KEYS.findIndex(k => k.label === note.note) * NOTE_HEIGHT;
                         
                         // If note doesn't have step, parse time
                         // 0:0:0 -> 0
                         // 0:1:0 -> 4
                         let x = 0;
                         if (note.step !== undefined) {
                             x = note.step * STEP_WIDTH;
                         } else {
                             const parts = note.time.split(':').map(Number);
                             const step = parts[0]*16 + parts[1]*4 + parts[2];
                             x = step * STEP_WIDTH;
                         }

                         return (
                            <div
                                key={note.id}
                                className={styles.note}
                                style={{
                                    top: `${y + 1}px`, // +1 for border
                                    left: `${x + 60}px`, // +60 for keys offset
                                    width: `${STEP_WIDTH - 2}px`,
                                }}
                                onClick={(e) => handleNoteClick(e, note.id)}
                            />
                         );
                    })}
                </div>
            </div>
        </div>
    );
};

export default PianoRoll;
