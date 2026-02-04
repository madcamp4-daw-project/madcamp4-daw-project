import * as Tone from 'tone';
// @ts-ignore
import Tuna from 'tunajs';
import { EffectData } from '@/lib/types/music';

// Initialize Tuna with the Tone context (must be done after Context is created/accessed)
let tuna: any = null;

export class EffectRack {
  public nodes: any[] = [];

  constructor(effectsData: EffectData[]) {
    this.rebuildChain(effectsData);
  }

  private initTuna() {
    if (!tuna && typeof window !== 'undefined') {
        const context = Tone.getContext().rawContext;
        tuna = new Tuna(context);
    }
  }

  public rebuildChain(effects: EffectData[]) {
    this.initTuna();
    
    // Disconnect old nodes if necessary (logic needed for full cleanup)
    this.nodes = [];

    effects.forEach(eff => {
        if (eff.isBypassed) return;

        let node;
        
        // Tone.js Effects
        if (eff.type === 'Tone.AutoFilter') node = new Tone.AutoFilter(eff.options).start();
        else if (eff.type === 'Tone.AutoPanner') node = new Tone.AutoPanner(eff.options).start();
        else if (eff.type === 'Tone.AutoWah') node = new Tone.AutoWah(eff.options);
        else if (eff.type === 'Tone.BitCrusher') node = new Tone.BitCrusher(eff.options);
        else if (eff.type === 'Tone.Chebyshev') node = new Tone.Chebyshev(eff.options);
        else if (eff.type === 'Tone.Chorus') node = new Tone.Chorus(eff.options).start();
        else if (eff.type === 'Tone.Distortion') node = new Tone.Distortion(eff.options);
        else if (eff.type === 'Tone.FeedbackDelay') node = new Tone.FeedbackDelay(eff.options);
        else if (eff.type === 'Tone.Freeverb') node = new Tone.Freeverb(eff.options);
        else if (eff.type === 'Tone.FrequencyShifter') node = new Tone.FrequencyShifter(eff.options);
        else if (eff.type === 'Tone.JCReverb') node = new Tone.JCReverb(eff.options);
        else if (eff.type === 'Tone.Phaser') node = new Tone.Phaser(eff.options);
        else if (eff.type === 'Tone.PingPongDelay') node = new Tone.PingPongDelay(eff.options);
        else if (eff.type === 'Tone.PitchShift') node = new Tone.PitchShift(eff.options);
        else if (eff.type === 'Tone.Reverb') node = new Tone.Reverb(eff.options);
        else if (eff.type === 'Tone.StereoWidener') node = new Tone.StereoWidener(eff.options);
        else if (eff.type === 'Tone.Tremolo') node = new Tone.Tremolo(eff.options).start();
        else if (eff.type === 'Tone.Vibrato') node = new Tone.Vibrato(eff.options);

        // Tuna.js Effects
        else if (tuna) {
            if (eff.type === 'Tuna.Bitcrusher') node = new tuna.Bitcrusher(eff.options);
            else if (eff.type === 'Tuna.Cabinet') node = new tuna.Cabinet(eff.options);
            else if (eff.type === 'Tuna.Chorus') node = new tuna.Chorus(eff.options);
            else if (eff.type === 'Tuna.Compressor') node = new tuna.Compressor(eff.options);
            else if (eff.type === 'Tuna.Convolver') node = new tuna.Convolver(eff.options);
            else if (eff.type === 'Tuna.Delay') node = new tuna.Delay(eff.options);
            else if (eff.type === 'Tuna.Filter') node = new tuna.Filter(eff.options);
            else if (eff.type === 'Tuna.Gain') node = new tuna.Gain(eff.options);
            else if (eff.type === 'Tuna.MoogFilter') node = new tuna.MoogFilter(eff.options);
            else if (eff.type === 'Tuna.Overdrive') node = new tuna.Overdrive(eff.options);
            else if (eff.type === 'Tuna.Panner') node = new tuna.Panner(eff.options);
            else if (eff.type === 'Tuna.Phaser') node = new tuna.Phaser(eff.options);
            else if (eff.type === 'Tuna.PingPongDelay') node = new tuna.PingPongDelay(eff.options);
            else if (eff.type === 'Tuna.Tremolo') node = new tuna.Tremolo(eff.options);
            else if (eff.type === 'Tuna.WahWah') node = new tuna.WahWah(eff.options);
        }

        if (node) {
            this.nodes.push(node);
        }
    });
  }
}
