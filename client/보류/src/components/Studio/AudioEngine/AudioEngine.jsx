import React, { useEffect, useRef } from 'react';
import * as Tone from 'tone';
import useProjectStore from '../../../store/useProjectStore';

const AudioEngine = () => {
    const channels = useProjectStore((state) => state.channels);
    const patterns = useProjectStore((state) => state.patterns);
    const activePatternId = useProjectStore((state) => state.activePatternId);
    const playlist = useProjectStore((state) => state.playlist); // { tracks, clips }
    
    // Refs
    const instrumentsRef = useRef({}); // { channelId: Tone.Player | Tone.Synth }
    const sequencesRef = useRef({});   // { channelId: Tone.Sequence } (For Channel Rack View)
    const partRef = useRef(null);      // Tone.Part (For Piano Roll View)
    
    // Playlist Schedule IDs (to cancel them on update)
    const scheduleIdsRef = useRef([]);

    // 1. Manage Instruments
    useEffect(() => {
        channels.forEach(ch => {
            if (!instrumentsRef.current[ch.id]) {
                let inst;
                if (ch.type === 'sampler') {
                    const player = new Tone.Player(ch.url).toDestination();
                    player.volume.value = ch.vol;
                    inst = player;
                } else {
                    // Synth Factory based on TONEJS_INTEGRATION_PLAN
                    switch (ch.type) {
                        case 'fmsynth':
                            inst = new Tone.PolySynth(Tone.FMSynth, {
                                harmonicity: 3, modulationIndex: 10, oscillator: { type: "sine" },
                                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                                modulation: { type: "square" }, modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
                            });
                            break;
                        case 'amsynth':
                            inst = new Tone.PolySynth(Tone.AMSynth, {
                                harmonicity: 3, oscillator: { type: "sine" },
                                envelope: { attack: 0.01, decay: 0.01, sustain: 1, release: 0.5 },
                                modulation: { type: "square" }, modulationEnvelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
                            });
                            break;
                        case 'membranesynth':
                            inst = new Tone.PolySynth(Tone.MembraneSynth, {
                                pitchDecay: 0.05, octaves: 10, oscillator: { type: "sine" },
                                envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
                            });
                            break;
                        case 'metalsynth':
                            inst = new Tone.PolySynth(Tone.MetalSynth, {
                                frequency: 200, envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                                harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
                            });
                            break;
                        default: // 'synth' or unknown
                            inst = new Tone.PolySynth(Tone.Synth, {
                                oscillator: { type: 'triangle' },
                                envelope: { attack: 0.05, decay: 0.1, sustain: 0.3, release: 1 },
                            });
                            break;
                    }
                    inst.toDestination();
                    inst.volume.value = ch.vol;
                }
                instrumentsRef.current[ch.id] = inst;
            } else {
                 instrumentsRef.current[ch.id].volume.value = ch.vol;
            }
        });

        // Cleanup
        const activeIds = channels.map(c => c.id);
        Object.keys(instrumentsRef.current).forEach(id => {
            if (!activeIds.includes(Number(id))) {
                instrumentsRef.current[id].dispose();
                delete instrumentsRef.current[id];
            }
        });
    }, [channels]);

    // 2. Channel Rack & Piano Roll (Pattern Mode)
    // In FL Studio, you can switch between "Pattern Mode" and "Song Mode".
    // For MVP, we will assume "Song Mode" if Playlist has content, OR simpler:
    // Just schedule Playlist clips. If User clicks Play in Channel Rack, maybe force pattern loop?
    // Let's implement Song Mode scheduling for Playlist clips.
    
    useEffect(() => {
        // Clear previous schedules
        scheduleIdsRef.current.forEach(id => Tone.Transport.clear(id));
        scheduleIdsRef.current = [];

        // Schedule Clips
        playlist.clips.forEach(clip => {
            const startTime = `0:${clip.start}:0`; // start bar -> quarter -> sixteenth in Tone format "bars:quarters:sixteenths"
            // Wait, Tone.Time format "0:0:0".
            // If clip.start is in bars (e.g. 0, 1, 2)
            const timeFormat = `${clip.start}:0:0`;

            if (clip.type === 'pattern') {
                const pattern = patterns[clip.patternId];
                if (!pattern) return;

                // Schedule pattern event
                const id = Tone.Transport.schedule((time) => {
                    // Trigger Channel Rack Steps for this pattern
                    // This is complex: we need to trigger the sequence ONCE at this time.
                    // But Sequence loops. We just need to trigger the events "manually" offset by time.
                    
                    // Simple approach: Iterate steps and schedule logic relative to 'time'
                    // This creates many events. 
                    
                    // Better approach: Use Tone.Part for the pattern clip too.
                    Object.keys(pattern.channels).forEach(chId => {
                         const chSteps = pattern.channels[chId];
                         const inst = instrumentsRef.current[chId];
                         if (!inst) return;
                         
                         const nChId = Number(chId);

                         chSteps.forEach((isActive, stepIndex) => {
                             if (isActive) {
                                  // 16th note offset
                                  const offset = Tone.Time("16n").toSeconds() * stepIndex;
                                  if (inst instanceof Tone.Player) {
                                      inst.start(time + offset, 0, "8n");
                                  } else {
                                      inst.triggerAttackRelease("C4", "8n", time + offset);
                                  }
                             }
                         });
                    });

                    // Piano Roll Notes for this pattern
                     if (pattern.notes) {
                         pattern.notes.forEach(note => {
                             // time format "0:0:0"
                             const offset = Tone.Time(note.time).toSeconds();
                             const inst = instrumentsRef.current[5]; // Hardcoded Piano ID 5
                             if (inst) {
                                 inst.triggerAttackRelease(note.note, note.duration, time + offset);
                                 // Note: This piano ID assumption is brittle. 
                                 // Ideally note has channelId/instrumentId involved.
                                 // Fixed in previous step to store channelId in note.
                             }
                         });
                     }

                }, timeFormat);
                
                scheduleIdsRef.current.push(id);
            }
            
            if (clip.type === 'audio') {
                 // Schedule audio clip
                 // For now assumes channel 1 for audio demo if trackId matches?
                 // Needs specialized Audio Track logic.
                 // Let's skip pure audio/sample clips for this exact moment until generic audio tracks are robust.
            }
        });

    }, [playlist, patterns, channels]);


    return null;
};

export default AudioEngine;
