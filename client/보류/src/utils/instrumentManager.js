import * as Tone from 'tone';

class InstrumentManager {
  constructor() {
    this.synth = null;
    this.recorder = null;
    this.audioContext = null;
    this.dest = null;
    this.chunks = [];
    this.isPreviewing = false;
    this.isRecording = false;

    // Instruments
    this.activeInstrument = 'synth'; // 'synth' or 'piano'
    this.sampler = null;
    this.isSamplerLoaded = false;
    this.isLoading = false;
  }

  // Alias for backward compatibility
  init() {
    return this.initialize();
  }

  async initialize() {
    if (this.synth) return;

    await Tone.start();
    console.log('Audio Context Started');

    this.audioContext = Tone.context;
    this.dest = this.audioContext.createMediaStreamDestination();

    // 1. PolySynth (Default)
    this.synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: 'triangle' },
      envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 },
    }).toDestination();
    this.synth.connect(this.dest);
    this.synth.volume.value = -8; // 클리핑 방지

    // 2. Sampler (Real Piano)
    this.sampler = new Tone.Sampler({
      urls: {
        'A0': "A0.mp3", 'C1': "C1.mp3", 'D#1': "Ds1.mp3", 'F#1': "Fs1.mp3", 'A1': "A1.mp3",
        'C2': "C2.mp3", 'D#2': "Ds2.mp3", 'F#2': "Fs2.mp3", 'A2': "A2.mp3",
        'C3': "C3.mp3", 'D#3': "Ds3.mp3", 'F#3': "Fs3.mp3", 'A3': "A3.mp3",
        'C4': "C4.mp3", 'D#4': "Ds4.mp3", 'F#4': "Fs4.mp3", 'A4': "A4.mp3",
        'C5': "C5.mp3", 'D#5': "Ds5.mp3", 'F#5': "Fs5.mp3", 'A5': "A5.mp3",
        'C6': "C6.mp3", 'D#6': "Ds6.mp3", 'F#6': "Fs6.mp3", 'A6': "A6.mp3",
        'C7': "C7.mp3", 'D#7': "Ds7.mp3", 'F#7': "Fs7.mp3", 'A7': "A7.mp3",
        'C8': "C8.mp3"
      },
      release: 1,

    }).toDestination();
    this.isLoading = true;
    this.sampler.connect(this.dest);

    this.recorder = new MediaRecorder(this.dest.stream);
    this.recorder.ondataavailable = (e) => this.chunks.push(e.data);

    console.log('InstrumentManager initialized');
  }

  get isPianoReady() {
    return this.activeInstrument === 'piano' && this.isSamplerLoaded;
  }

  setInstrument(type) {
    if (this.activeInstrument === type) return;

    // cleanup previous synth if it's not the sampler (sampler is kept loaded)
    if (this.synth && this.activeInstrument !== 'piano') {
        this.synth.dispose();
        this.synth = null;
    }

    this.activeInstrument = type;
    console.log(`Instrument changing to: ${type}`);

    if (type === 'piano') {
        // Piano logic is handled in startNote/triggerAttack via checks
        return;
    }

    // Factory Pattern for Synths
    let synthOptions = {
        volume: -8
    };

    switch (type) {
        case 'synth': // Default Triangle
            this.synth = new Tone.PolySynth(Tone.Synth, {
                oscillator: { type: 'triangle' },
                envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 }
            });
            break;
        case 'fmsynth':
            this.synth = new Tone.PolySynth(Tone.FMSynth, {
                harmonicity: 3,
                modulationIndex: 10,
                detune: 0,
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                modulation: { type: "square" },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            });
            break;
        case 'amsynth':
            this.synth = new Tone.PolySynth(Tone.AMSynth, {
                harmonicity: 3,
                detune: 0,
                oscillator: { type: "sine" },
                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                modulation: { type: "square" },
                modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
            });
            break;
        case 'membranesynth': // Kick/Tom like
            this.synth = new Tone.PolySynth(Tone.MembraneSynth, {
                pitchDecay: 0.05,
                octaves: 10,
                oscillator: { type: "sine" },
                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
            });
            break;
        case 'metalsynth': // Cymbals like
            this.synth = new Tone.PolySynth(Tone.MetalSynth, {
                frequency: 200,
                envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                harmonicity: 5.1,
                modulationIndex: 32,
                resonance: 4000,
                octaves: 1.5
            });
            break;
        case 'monosynth':
            this.synth = new Tone.PolySynth(Tone.MonoSynth, {
                oscillator: { type: "square" },
                envelope: { attack: 0.1 }
            });
            break;
        case 'duosynth':
            this.synth = new Tone.PolySynth(Tone.DuoSynth, {
                vibratoAmount: 0.5,
                vibratoRate: 5,
                harmonicity: 1.5
            });
            break;
         case 'plucksynth':
            this.synth = new Tone.PolySynth(Tone.PluckSynth, {
                attackNoise: 1,
                dampening: 4000,
                resonance: 0.7
            });
            break;
        default:
            console.warn("Unknown instrument type, falling back to basic synth");
            this.synth = new Tone.PolySynth(Tone.Synth);
    }

    if (this.synth) {
        this.synth.toDestination();
        this.synth.connect(this.dest);
    }
  }

  loadPreview(type, preset) {
    this.isPreviewing = true;
    if (!this.synth) this.initialize();
  }

  closePreview() {
    this.isPreviewing = false;
  }

  startPreviewNote(note) {
    if (this.activeInstrument === 'piano' && this.isSamplerLoaded) {
      this.sampler.triggerAttack(note);
    } else if (this.synth) {
       // PolySynth or other synths
       this.synth.triggerAttack(note);
    }
  }

  startNote(padId, note) {
    if (this.activeInstrument === 'piano' && this.isSamplerLoaded) {
      this.sampler.triggerAttack(note);
    } else if (this.synth) {
      this.synth.triggerAttack(note);
    }
  }

  stopPreviewNote(note) {
    if (this.activeInstrument === 'piano' && this.isSamplerLoaded) {
      this.sampler.triggerRelease(note);
    } else if (this.synth) {
      this.synth.triggerRelease(note);
    }
  }

  stopNote(padId, note) {
    if (this.activeInstrument === 'piano' && this.isSamplerLoaded) {
      this.sampler.triggerRelease(note);
    } else if (this.synth) {
      this.synth.triggerRelease(note);
    }
  }

  async startRecording() {
    await this.initialize();
    if (this.isRecording) return;
    
    this.chunks = [];
    this.recorder.start();
    this.isRecording = true;
    console.log('Recording started');
  }

  async stopRecording() {
    if (!this.isRecording) return null;

    return new Promise((resolve) => {
      this.recorder.onstop = () => {
        const blob = new Blob(this.chunks, { type: 'audio/webm' });
        this.chunks = [];
        this.isRecording = false;
        console.log('Recording stopped', blob);
        resolve(blob);
      };
      this.recorder.stop();
    });
  }
}

export const instrumentManager = new InstrumentManager();
