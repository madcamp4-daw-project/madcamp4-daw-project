import { TimeMarker } from '@/lib/types/music';

// Default 4/4 if no markers
const DEFAULT_SIG = { numerator: 4, denominator: 4 };

/**
 * Calculates the absolute beat alignment for measures based on time signature markers.
 * This is critical for syncing visuals (Measures) with Audio (linear Beats).
 */
export class TimeMap {
  private markers: TimeMarker[];
  private map: { startMeasure: number; startBeat: number; numerator: number; denominator: number }[] = [];

  constructor(markers: TimeMarker[]) {
    this.markers = [...markers].sort((a, b) => a.time - b.time);
    this.buildMap();
  }

  private buildMap() {
    this.map = [];
    let currentBeat = 0;
    let currentMeasure = 0;
    let currentSig = { ...DEFAULT_SIG };

    // Always start at 0
    this.map.push({ 
        startMeasure: 0, 
        startBeat: 0, 
        numerator: 4, 
        denominator: 4 
    });

    for (const marker of this.markers) {
       if (marker.type !== 'Signature' || !marker.numerator || !marker.denominator) continue;
       if (marker.time <= 0) {
           // Overwrite initial
           this.map[0] = { ...this.map[0], numerator: marker.numerator, denominator: marker.denominator };
           currentSig = { numerator: marker.numerator, denominator: marker.denominator };
           continue;
       }

       // Calculate beats from last checkpoint to here
       const prev = this.map[this.map.length - 1];
       const measuresDelta = marker.time - prev.startMeasure;
       const beatsDelta = measuresDelta * (prev.numerator * (4 / prev.denominator)); 
       
       currentBeat = prev.startBeat + beatsDelta;
       currentMeasure = marker.time;
       currentSig = { numerator: marker.numerator, denominator: marker.denominator };

       this.map.push({
           startMeasure: currentMeasure,
           startBeat: currentBeat,
           numerator: currentSig.numerator,
           denominator: currentSig.denominator
       });
    }
  }

  /**
   * Converts a Measure Time (e.g. 1.5) to Absolute Beats
   */
  public measureToBeats(measure: number): number {
      // Find valid segment
      let segment = this.map[0];
      for (let i = 1; i < this.map.length; i++) {
          if (measure >= this.map[i].startMeasure) {
              segment = this.map[i];
          } else {
              break;
          }
      }

      const deltaMeasures = measure - segment.startMeasure;
      const beatsPerMeasure = segment.numerator * (4 / segment.denominator);
      
      return segment.startBeat + (deltaMeasures * beatsPerMeasure);
  }

  /**
   * Converts Absolute Beats to Measure Time
   */
  public beatsToMeasure(beats: number): number {
      let segment = this.map[0];
      for (let i = 1; i < this.map.length; i++) {
          if (beats >= this.map[i].startBeat) {
              segment = this.map[i];
          } else {
              break;
          }
      }
      
      const deltaBeats = beats - segment.startBeat;
      const beatsPerMeasure = segment.numerator * (4 / segment.denominator);
      
      return segment.startMeasure + (deltaBeats / beatsPerMeasure);
  }

  public getSignatureAtMeasure(measure: number) {
       let segment = this.map[0];
      for (let i = 1; i < this.map.length; i++) {
          if (measure >= this.map[i].startMeasure) {
              segment = this.map[i];
          } else {
              break;
          }
      }
      return { numerator: segment.numerator, denominator: segment.denominator };
  }
}
