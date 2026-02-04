export type ChordType = 'Major' | 'Minor' | 'Major 7th' | 'Minor 7th' | 'Diminished' | 'Augmented' | 'Sus2' | 'Sus4';

export const CHORD_INTERVALS: Record<ChordType, number[]> = {
  'Major': [0, 4, 7],
  'Minor': [0, 3, 7],
  'Major 7th': [0, 4, 7, 11],
  'Minor 7th': [0, 3, 7, 10],
  'Diminished': [0, 3, 6],
  'Augmented': [0, 4, 8],
  'Sus2': [0, 2, 7],
  'Sus4': [0, 5, 7]
};
