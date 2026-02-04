export interface Note {
  id: string;
  pitch: string; // e.g. "C#5"
  start: number; // in measures (float) or seconds, depending on sequencer logic. Usually ppq or measure-relative measures.
  duration: number; // in measures (float)
  velocity: number; // 0-1
  release: number; // 0-1
  pan: number; // -1 to 1
  modX: number; // 0-1 (Filter Cutoff mapping)
  modY: number; // 0-1 (Filter Resonance mapping)
  activePitch: number; // Detune cents (for fine pitch adjustments)
  colorIndex: number; // 0-15 (maps to 16 separate event channels/groups)
  channelId: string; // The Instrument Channel this note belongs to
  isSlide: boolean; // Triangle icon, frequency ramps previous note
  isPorta: boolean; // Short glissando entry
  isMuted?: boolean; // Mute tool로 음소거된 노트
}

export interface InstrumentData {
  type: string; // e.g. "Synth", "FMSynth", "Sampler"
  options?: any; // Tone.js constructor options
}

export interface EffectData {
  id: string;
  type: string; // e.g. "Chorus", "Tuna.Delay"
  isBypassed: boolean;
  options?: any;
}

export interface Channel {
  id: string;
  name: string;
  instrument: InstrumentData;
  effects: EffectData[];
  volume: number; // -60 to +6 dB
  pan: number; // -1 to 1
  mute: boolean;
  solo: boolean;
  color: string; // Display color for the channel
}

export interface TimeMarker {
  id: string;
  time: number; // in measures (float)
  type: 'Signature' | 'Tempo' | 'Label' | 'Loop';
  label?: string;
  numerator?: number; // for Signature
  denominator?: number; // for Signature
  bpm?: number; // for Tempo
}

export type ToolType = 'draw' | 'paint' | 'delete' | 'select' | 'slice' | 'mute' | 'play' | 'stamp';
export type SnapType = 'line' | 'cell' | 'none' | '1/6' | '1/4' | '1/3' | '1/2' | '1/1';
