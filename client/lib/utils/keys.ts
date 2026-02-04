import { NOTES, midiToPitch, pitchToMidi } from './noteUtils';

// Standard MIDI Range: 0 (C-1) to 127 (G9)
// Visual rendering is usually Top (High Pitch) -> Bottom (Low Pitch)
// So Index 0 = MIDI 127 (G9)
// Index 127 = MIDI 0 (C-1)

export const TOTAL_KEYS = 128; // 0 to 127
export const MAX_MIDI = 127;
export const MIN_MIDI = 0;

export interface PianoKey {
  index: number; // 0 (Top/G9) to 127 (Bottom/C-1)
  midi: number;
  pitch: string;
  name: string;
  octave: number;
  isBlack: boolean;
  isC: boolean;
}

// Cache keys to prevent garbage collection on every render
let cachedKeys: PianoKey[] | null = null;

// Helper to get note name from index (0-11)
// NOTES is likely ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']

export function buildKeyMap(): PianoKey[] {
  if (cachedKeys) return cachedKeys;

  const keys: PianoKey[] = [];

  for (let index = 0; index < TOTAL_KEYS; index++) {
    // Current Index 0 -> Should be MIDI 127
    const midi = MAX_MIDI - index; // 127 - 0 = 127
    
    // Calculate Pitch Info
    // Standard: MIDI 60 = C4 => MIDI 0 = C-1
    // pitchToMidi / midiToPitch usually handles this depending on convention
    // We will trust midiToPitch from noteUtils but ensure it handles negative octaves if needed
    // or just calculate manually if noteUtils is simple.
    
    // Let's rely on standard calculation for stability:
    const noteIndex = midi % 12;
    const octave = Math.floor(midi / 12) - 1; // 0 -> -1, 12 -> 0, 60 -> 4
    const name = NOTES[noteIndex];
    const pitch = `${name}${octave}`; 
    
    // Use existing util if it matches, but manual is safer for our specific range requirement
    // const pitch = midiToPitch(midi); 

    const isBlack = name.includes('#');
    const isC = name === 'C';

    keys.push({
      index,
      midi,
      pitch,
      name,
      octave,
      isBlack, // FL Studio: Black keys are usually rows with darker color
      isC
    });
  }

  cachedKeys = keys;
  return keys;
}

export function getKeyByRow(rowIndex: number): PianoKey | undefined {
  const keys = buildKeyMap();
  if (rowIndex < 0 || rowIndex >= keys.length) return undefined;
  return keys[rowIndex];
}

export function getKeyByMidi(midi: number): PianoKey | undefined {
  if (midi < MIN_MIDI || midi > MAX_MIDI) return undefined;
  const keys = buildKeyMap();
  // Midi 127 is at index 0
  // Index = 127 - midi
  // e.g. Midi 127 -> 127 - 127 = 0
  // e.g. Midi 0 -> 127 - 0 = 127
  const index = MAX_MIDI - midi;
  return keys[index];
}

export function getKeyByPitch(pitch: string): PianoKey | undefined {
  // We can use pitchToMidi or search
  const midi = pitchToMidi(pitch); // Ensure this util works correctly or use map
  return getKeyByMidi(midi);
}


