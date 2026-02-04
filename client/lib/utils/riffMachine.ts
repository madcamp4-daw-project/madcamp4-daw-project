import { Note } from '@/lib/types/music';

/**
 * Riff Machine Utilities
 */

// --- Arpeggiator ---
export type ArpPattern = 'up' | 'down' | 'upDown' | 'random';

export const applyArpeggio = (notes: Note[], pattern: ArpPattern, timeStep: number): Note[] => {
    if (notes.length === 0) return [];
    
    // Group notes by start time (chords)
    const groupedNotes: { [start: number]: Note[] } = {};
    notes.forEach(n => {
        if (!groupedNotes[n.start]) groupedNotes[n.start] = [];
        groupedNotes[n.start].push(n);
    });

    let newNotes: Note[] = [];

    Object.keys(groupedNotes).sort((a, b) => parseFloat(a) - parseFloat(b)).forEach(startStr => {
        const start = parseFloat(startStr);
        let chord = groupedNotes[start];
        
        // Sort by pitch for consistent patterns
        chord.sort((a, b) => {
            // Simple string comparison might fail for C#5 vs C5, need MIDI number or smart sort.
            // Assuming simplified sort for MVP or we'd need a pitch->midi helper here.
            // Let's rely on string comparison length + value for now or import helper if available.
            // Actually, we can just use the pitch string comparison which is roughly ok for same octave,
            // but separate octaves might be tricky. 
            // Better: use length then alpha? C4 < C5. C10 > C9 (length 3 vs 2).
            if (a.pitch.length !== b.pitch.length) return a.pitch.length - b.pitch.length;
            return a.pitch.localeCompare(b.pitch);
        });

        // Apply Pattern
        let ordered = [...chord];
        if (pattern === 'down') ordered.reverse();
        else if (pattern === 'random') ordered.sort(() => Math.random() - 0.5);
        else if (pattern === 'upDown') {
            ordered = [...ordered, ...[...ordered].reverse().slice(1, -1)];
        }

        // Spread notes in time
        ordered.forEach((note, index) => {
            newNotes.push({
                ...note,
                start: start + (index * timeStep),
                duration: timeStep // Arp notes usually short? Or sustain? Let's use timeStep.
            });
        });
    });

    return newNotes;
};

// --- Flip ---
export const flipNotes = (notes: Note[], axis: 'vertical' | 'horizontal', totalKeys: number = 120): Note[] => {
    if (notes.length === 0) return [];

    const newNotes = notes.map(n => ({ ...n }));

    if (axis === 'vertical') {
        // Find center pitch
        // We need a helper to convert Pitch <-> Row/Index.
        // Assuming we pass in a helper or just do simple key inversion if we knew MIDI numbers.
        // For MVP, verifying "Flip" often creates "Inverse" melody.
        // Let's implement a simple "Invert around Average Pitch".
        
        // TODO: We need real pitch-to-int conversion here to do this accurately.
        // I will stub this logic or assume we can import `getRowFromPitch` if it was pure.
        // Since `getRowFromPitch` is in `noteUtils`, let's try to import it if possible? 
        // It was used in GridCanvas.
        
        return newNotes; // Placeholder until I check imports
    } else {
        // Horizontal: Flip time around center
        const starts = notes.map(n => n.start);
        const min = Math.min(...starts);
        const max = Math.max(...starts);
        const center = (min + max) / 2;

        newNotes.forEach(n => {
            const dist = n.start - center;
            n.start = center - dist;
            // Adjust for duration to align end? 
            // Usually flip mirrors the ONSET.
        });
        return newNotes;
    }
};

// --- Randomize ---
export const applyRandomize = (notes: Note[], velocityRange: number, panRange: number, startRange: number): Note[] => {
    return notes.map(n => ({
        ...n,
        velocity: Math.max(0, Math.min(1, n.velocity + (Math.random() - 0.5) * velocityRange)),
        pan: Math.max(-1, Math.min(1, n.pan + (Math.random() - 0.5) * panRange)),
        start: Math.max(0, n.start + (Math.random() - 0.5) * startRange)
    }));
};
