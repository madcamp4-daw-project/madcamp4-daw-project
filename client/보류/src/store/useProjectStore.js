import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';

const useProjectStore = create(
  immer((set, get) => ({
    // Transport State
    isPlaying: false,
    bpm: 128,
    currentTime: 0, // In seconds or Tone.Transport format
    isMetronomeOn: false,
    _refresh: 0, // triggerLibraryRefresh용

    // 선택 트랙/채널 (Left Fx Panel, Piano Roll 연동)
    selectedTrackId: null,
    selectedInsertId: null,

    // Project Data
    activePatternId: 1,
    patterns: {
      1: {
        id: 1,
        name: 'Pattern 1',
        length: 16, // Steps (16 = 1 bar)
        channels: {
          // Channel ID -> Steps Array (e.g., [1, 0, 0, 1...])
          1: new Array(16).fill(false),
          2: new Array(16).fill(false),
          3: new Array(16).fill(false),
          4: new Array(16).fill(false),
        },
        // Piano Roll Notes: { channelId: 1, note: 'C4', time: '0:0:0', duration: '8n' }
        notes: [],
      },
    },

    // Channel Rack Config (Instruments)
    channels: [
      { id: 1, name: 'Kick', type: 'sampler', url: '/samples/kick.wav', vol: 0, pan: 0 },
      { id: 2, name: 'Clap', type: 'sampler', url: '/samples/clap.wav', vol: 0, pan: 0 },
      { id: 3, name: 'Hat', type: 'sampler', url: '/samples/hat.wav', vol: 0, pan: 0 },
      { id: 4, name: 'Snare', type: 'sampler', url: '/samples/snare.wav', vol: 0, pan: 0 },
      // Add a synth for Piano Roll testing
      { id: 5, name: 'Piano', type: 'synth', vol: -5, pan: 0 },
    ],

    // Playlist Data
    playlist: {
      tracks: [
        { id: 1, name: 'Track 1' },
      ],
      clips: [], // { id, type: 'pattern'|'audio', start: 0, duration: 2, val: patternId|url, trackId: 1 }
    },

    // Mixer Data (Inserts)
    mixer: {
      inserts: [
        { id: 0, name: 'Master', vol: 0, pan: 0, mute: false, solo: false, effects: [] },
        { id: 1, name: 'Insert 1', vol: 0, pan: 0, mute: false, solo: false, effects: [] },
        { id: 2, name: 'Insert 2', vol: 0, pan: 0, mute: false, solo: false, effects: [] },
        { id: 3, name: 'Insert 3', vol: 0, pan: 0, mute: false, solo: false, effects: [] },
        { id: 4, name: 'Insert 4', vol: 0, pan: 0, mute: false, solo: false, effects: [] },
      ]
    },

    // Actions
    setMixerVolume: (insertId, val) =>
      set((state) => {
         const insert = state.mixer.inserts.find(i => i.id === insertId);
         if(insert) insert.vol = val;
      }),

    toggleMute: (insertId) =>
      set((state) => {
         const insert = state.mixer.inserts.find(i => i.id === insertId);
         if(insert) insert.mute = !insert.mute;
      }),

    toggleSolo: (insertId) =>
      set((state) => {
         const insert = state.mixer.inserts.find(i => i.id === insertId);
         if(insert) insert.solo = !insert.solo;
      }),

    // Helper: Clip Actions
    addClip: (clip) =>
      set((state) => {
        state.playlist.clips.push({ ...clip, id: Date.now() });
      }),

    removeClip: (clipId) =>
      set((state) => {
        state.playlist.clips = state.playlist.clips.filter(c => c.id !== clipId);
      }),

    addNote: (patternId, note) => 
      set((state) => {
        state.patterns[patternId].notes.push(note);
      }),
    
    removeNote: (patternId, noteId) =>
      set((state) => {
        // Simple removal by reference or ID needed. For now, filter by matching props or add ID to note.
        // Assuming note object has a unique id or we use index.
        // Let's assume note has an ID.
        state.patterns[patternId].notes = state.patterns[patternId].notes.filter(n => n.id !== noteId);
      }),

    // Actions
    setIsPlaying: (isPlaying) => set({ isPlaying }),
    setBpm: (bpm) => set({ bpm }),
    setIsMetronomeOn: (isMetronomeOn) => set({ isMetronomeOn }),
    triggerLibraryRefresh: () => set({ _refresh: Date.now() }),
    setSelectedTrackId: (selectedTrackId) => set({ selectedTrackId }),
    setSelectedInsertId: (selectedInsertId) => set({ selectedInsertId }),

    toggleStep: (channelId, stepIndex) =>
      set((state) => {
        const pattern = state.patterns[state.activePatternId];
        if (pattern && pattern.channels[channelId]) {
             pattern.channels[channelId][stepIndex] = !pattern.channels[channelId][stepIndex];
        }
      }),

    setChannelVolume: (id, val) => 
      set((state) => {
        const ch = state.channels.find(c => c.id === id);
        if(ch) ch.vol = val;
      }),

    setChannelPan: (id, val) => 
      set((state) => {
        const ch = state.channels.find(c => c.id === id);
        if(ch) ch.pan = val;
      }),
  }))
);

export default useProjectStore;
