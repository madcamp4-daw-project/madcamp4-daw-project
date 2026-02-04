import * as Tone from 'tone';

export class InstrumentRack {
  
  public createInstrument(type: string, options: any = {}): any {
    switch (type) {
      case 'Synth':
        return new Tone.PolySynth(Tone.Synth, options);
      case 'FMSynth':
        return new Tone.PolySynth(Tone.FMSynth, options);
      case 'AMSynth':
        return new Tone.PolySynth(Tone.AMSynth, options);
      case 'MembraneSynth':
        return new Tone.PolySynth(Tone.MembraneSynth, options);
      case 'MetalSynth':
        return new Tone.PolySynth(Tone.MetalSynth, options);
      case 'MonoSynth':
        return new Tone.PolySynth(Tone.MonoSynth, options);
      case 'DuoSynth':
        return new Tone.PolySynth(Tone.DuoSynth, options);
      case 'PluckSynth':
        return new Tone.PolySynth(Tone.PluckSynth as any, options);
      case 'NoiseSynth':
        return new Tone.PolySynth(Tone.NoiseSynth as any, options);
      case 'Sampler':
        return new Tone.Sampler(options);
      case 'PolySynth':
         // Default generic PolySynth
         return new Tone.PolySynth(Tone.Synth, options);
      default:
        console.warn(`Instrument type ${type} not recognized, falling back to Synth`);
        return new Tone.PolySynth(Tone.Synth);
    }
  }
}
