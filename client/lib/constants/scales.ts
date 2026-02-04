export type ScaleType = 'Major' | 'Minor' | 'Harmonic Minor' | 'Melodic Minor' | 'Dorian' | 'Phrygian' | 'Lydian' | 'Mixolydian' | 'Locrian' | 'Chromatic';

export const SCALES: Record<ScaleType, number[]> = {
  'Chromatic': [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
  'Major': [0, 2, 4, 5, 7, 9, 11],
  'Minor': [0, 2, 3, 5, 7, 8, 10],
  'Harmonic Minor': [0, 2, 3, 5, 7, 8, 11],
  'Melodic Minor': [0, 2, 3, 5, 7, 9, 11],
  'Dorian': [0, 2, 3, 5, 7, 9, 10],
  'Phrygian': [0, 1, 3, 5, 7, 8, 10],
  'Lydian': [0, 2, 4, 6, 7, 9, 11],
  'Mixolydian': [0, 2, 4, 5, 7, 9, 10],
  'Locrian': [0, 1, 3, 5, 6, 8, 10]
};

export const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function isNoteInScale(noteIndex: number, rootNoteIndex: number, scale: ScaleType): boolean {
  if (scale === 'Chromatic') return true;
  
  // Normalize noteIndex to 0-11
  const normalizedNote = noteIndex % 12;
  const normalizedRoot = rootNoteIndex % 12;
  
  // Calculate interval from root
  let interval = (normalizedNote - normalizedRoot + 12) % 12;
  
  return SCALES[scale].includes(interval);
}

export function getNearestScaleNote(noteIndex: number, rootNoteIndex: number, scale: ScaleType): number {
    if (scale === 'Chromatic') return noteIndex;

    // Check current
    if (isNoteInScale(noteIndex, rootNoteIndex, scale)) return noteIndex;

    // Search neighbors (simple distance check)
    // Up 1, Down 1, Up 2, Down 2...
    for (let i = 1; i < 6; i++) {
        if (isNoteInScale(noteIndex + i, rootNoteIndex, scale)) return noteIndex + i; // Prefer sharp?
        if (isNoteInScale(noteIndex - i, rootNoteIndex, scale)) return noteIndex - i;
    }
    return noteIndex; // Fallback
}
