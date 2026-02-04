import * as Tone from 'tone';
import { InstrumentRack } from '@/lib/audio/InstrumentRack';
import { EffectRack } from '@/lib/audio/EffectRack';
import { Channel, Note, TimeMarker } from '@/lib/types/music';
import { TimeMap } from '@/lib/utils/timeMap';

class AudioEngine {
  private static instance: AudioEngine;
  public instrumentRack: InstrumentRack;
  public activeChannels: Map<string, any> = new Map();
  private isInitialized: boolean = false;

  private constructor() {
    this.instrumentRack = new InstrumentRack();
  }

  public static getInstance(): AudioEngine {
    if (!AudioEngine.instance) {
      AudioEngine.instance = new AudioEngine();
    }
    return AudioEngine.instance;
  }

  public async initialize() {
    if (this.isInitialized) return;
    
    await Tone.start();
    console.log("Tone.js Context Started");

    // Patch for Tuna.js (requires createScriptProcessor on the context)
    const context = Tone.getContext().rawContext;
    if (!(context as any).createScriptProcessor) {
        (context as any).createScriptProcessor = (context as any).createJavaScriptNode;
    }
    // Double check if createJavaScriptNode exists, or simple AudioWorklet is needed?
    // Modern Safari/Chrome have createScriptProcessor deprecated but present. 
    // IF it is missing completely, we are in trouble with Tuna v1. 
    // Usually it's there. But let's verify.
    
    // Set up Transport defaults
    Tone.Transport.bpm.value = 120;
    Tone.Transport.timeSignature = 4;
    
    this.isInitialized = true;
  }

  public getContext() {
    return Tone.getContext();
  }

  public start() {
    if (Tone.Transport.state !== 'started') {
      Tone.Transport.start();
    }
  }

  public stop() {
    if (Tone.Transport.state === 'started') {
      Tone.Transport.stop();
    }
  }

  public pause() {
    Tone.Transport.pause();
  }

  public setBpm(bpm: number) {
    Tone.Transport.bpm.value = bpm;
  }

  public setLoop(loop: boolean, start: number | string = 0, end: number | string = '4m') {
      Tone.Transport.loop = loop;
      Tone.Transport.loopStart = start;
      Tone.Transport.loopEnd = end;
  }

  public getCurrentMeasure(): number {
      if (Tone.Transport.state !== 'started') return 0;
      // Legacy wrapper. 
      // Note: This returns "4/4 Measures" strictly.
      return (Tone.Transport.ticks / Tone.Transport.PPQ) / 4; 
  }

  public getCurrentBeat(): number {
       if (Tone.Transport.state !== 'started') return 0;
       // High precision float ticks
       return Tone.Transport.ticks / Tone.Transport.PPQ;
  }

  private currentPart: Tone.Part | null = null;

  // Channel Management
  public createChannel(channelData: Channel) {
    const instrument = this.instrumentRack.createInstrument(channelData.instrument.type, channelData.instrument.options);
    const chain = new EffectRack(channelData.effects);
    
    // Connect Chain
    let current: any = instrument;
    chain.nodes.forEach(node => {
        current.connect(node);
        current = node;
    });
    current.toDestination(); // Or to Master Bus

    // Store in Map
    this.activeChannels.set(channelData.id, instrument);
  }

  public updateChannelEffects(channelId: string, effects: any[]) {
      // Rebuild chain logic... for MVP ignore or simple rebuild
      // Ideally we dispose old effects and create new chain
  }

  public triggerAttackRelease(channelId: string, note: string, duration: string | number, time?: number, velocity: number = 1) {
    const channel = this.activeChannels.get(channelId);
    if (channel) {
        // channel은 instrument 자체입니다 (createChannel에서 instrument를 직접 저장)
        try {
            channel.triggerAttackRelease(note, duration, time, velocity);
        } catch (e) {
            console.warn('triggerAttackRelease failed:', e);
        }
    }
  }

  public scheduleSequence(notes: Note[], markers: TimeMarker[] = []) {
      // Cleanup
      if (this.currentPart) {
          this.currentPart.dispose();
          this.currentPart = null;
      }
      Tone.Transport.cancel(); // Clear all transport events

      // Schedule Markers
      const sortedMarkers = [...markers].sort((a,b) => a.time - b.time);
      
      // Initial Sig
      Tone.Transport.timeSignature = 4;
      
      sortedMarkers.forEach(m => {
          if (m.type === 'Signature' && m.numerator) {
              Tone.Transport.schedule((time) => {
                  Tone.Transport.timeSignature = m.numerator!;
                  console.log(`[Transport] TimeSig: ${m.numerator}/${m.denominator} @ ${m.time}`);
              }, `${m.time}:0:0`);
          }
      });

      // Use TimeMap for absolute beat calculation
      // This ensures 100% sync with Visuals which also use TimeMap
      const timeMap = new TimeMap(markers);

      // Muted 노트 필터링 - 음소거된 노트는 재생하지 않음
      const playableNotes = notes.filter(n => !n.isMuted);

      const events = playableNotes.map(note => {
          // Calculate exact start and duration in Beats provided by our TimeMap logic
          const startBeats = timeMap.measureToBeats(note.start);
          const endBeats = timeMap.measureToBeats(note.start + note.duration);
          const durationBeats = endBeats - startBeats;

          // Convert Beats to Ticks for Tone.js scheduling
          // This bypasses any internal "Measure" confusion in Tone.js
          const ppq = Tone.Transport.PPQ; // Usually 192
          const startTicks = startBeats * ppq;
          const durationTicks = durationBeats * ppq;

          return {
              // Vital Fix: Tone.js interprets number as Seconds. Must use "i" suffix for Ticks.
              time: `${startTicks}i`, 
              note: note,
              durationTicks: durationTicks
          };
      });

      this.currentPart = new Tone.Part((time, event) => {
          const n = event.note;
          const instrument = this.activeChannels.get(n.channelId);
          if (instrument) {
              if (n.isPorta || n.isSlide) {
                  const glideTime = 0.1;
                  if (instrument.set) {
                      instrument.set({ portamento: glideTime });
                  }
              } else {
                  if (instrument.set) {
                      instrument.set({ portamento: 0 });
                  }
              }
              
              // Use calculated tick duration
              instrument.triggerAttackRelease(n.pitch, event.durationTicks + "i", time, n.velocity);
          }
      }, events).start(0);
  }
}

export const audioEngine = AudioEngine.getInstance();
