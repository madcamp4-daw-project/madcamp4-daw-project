import { Midi } from '@tonejs/midi';
import { Note, Channel } from '@/lib/types/music';

/**
 * Downloads the current project as a MIDI file
 * @param notes All notes in the project
 * @param channels List of channels to determine instrument names/tracks
 * @param bpm Project BPM (default 120)
 */
export const downloadMidi = (notes: Note[], channels: Channel[], bpm: number = 120) => {
    const midi = new Midi();
    
    // Set Tempo (using generic push if setTempo mismatch, or follow lint)
    // Lint suggested 'setTempo'.
    midi.header.setTempo(bpm);
    
    // Create Tracks per Channel
    channels.forEach(channel => {
        const track = midi.addTrack();
        track.name = channel.name;
        
        // Filter notes for this channel
        const channelNotes = notes.filter(n => n.channelId === channel.id);
        
        channelNotes.forEach(note => {
             const secondsPerBeat = 60 / bpm;
             const startTime = note.start * secondsPerBeat;
             const durationTime = note.duration * secondsPerBeat;
             
             track.addNote({
                 name: note.pitch, 
                 time: startTime,
                 duration: durationTime,
                 velocity: note.velocity
             });
        });
    });
    
    // Trigger Download
    const data = midi.toArray();
    const blob = new Blob([data as any], { type: "audio/midi" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "project.mid";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

// Helper for pitch to midi if needed, but @tonejs/midi mostly handles it?
// Actually @tonejs/midi expects 'midi' (number) or 'name' (string C4).
// Let's modify above to pass 'name' if supported or convert.
// track.addNote({ name: 'C4', ... }) is supported.
// But we need to verify.
// Tone.Midi source: note.midi is number, note.name is string.
// addNote arguments: { midi?: number, name?: string, ... }
