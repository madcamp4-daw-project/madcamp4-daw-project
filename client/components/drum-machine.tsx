"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Slider } from "@/components/ui/slider";
import { TooltipProvider, TooltipWrapper } from "@/components/ui/tooltip";
import { Play, Square, Plus, ChevronUp, ChevronDown, Download, PlusCircle, Trash2, Settings, ArrowRight } from "lucide-react";
import * as Tone from "tone";
import { Midi } from "@tonejs/midi";

interface DrumSound {
  id: string; // Unique ID for keying
  name: string;
  type: "kick" | "snare" | "hihat" | "tom" | "clap" | "cymbal";
}

const DEFAULT_SOUNDS: DrumSound[] = [
  { id: "kick", name: "Kick", type: "kick" },
  { id: "clap", name: "Clap", type: "clap" },
  { id: "hat", name: "Hat",  type: "hihat" },
  { id: "snare", name: "Snare", type: "snare" },
  { id: "tom", name: "Tom", type: "tom" },
  { id: "cymbal", name: "Cymbal", type: "cymbal" },
];

const MAX_PATTERNS = 9;

// --- Components ---

function MuteLED({ active, onClick }: { active: boolean; onClick: (e: React.MouseEvent) => void }) {
    return (
        <button 
            onClick={onClick}
            className={`
                w-[10px] h-[10px] rounded-full mx-[4px]
                border border-[#111] shadow-[0_1px_1px_rgba(255,255,255,0.1)]
                flex items-center justify-center
                ${!active 
                    ? "bg-gradient-to-br from-[#84cc6e] to-[#4ade80] shadow-[0_0_5px_#4ade80]" 
                    : "bg-[#2a2a2a]"}
            `}
        >
            {!active && <div className="w-[3px] h-[3px] bg-white rounded-full opacity-60 blur-[1px]"></div>}
        </button>
    )
}

function VolumePanKnob({ value, min, max, onChange, onInteractEnd, color = "#c0c0c0" }: { value: number, min: number, max: number, onChange: (v: number) => void, onInteractEnd?: () => void, color?: string }) {
    const startY = useRef<number | null>(null);
    const startValue = useRef<number | null>(null);

    const handleMouseDown = (e: React.MouseEvent) => {
        startY.current = e.clientY;
        startValue.current = value;
        document.body.style.cursor = "ns-resize";
        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (startY.current === null || startValue.current === null) return;
        const dy = startY.current - e.clientY;
        const range = max - min;
        const sensitivity = 0.005 * range;
        let newVal = startValue.current + dy * sensitivity;
        newVal = Math.max(min, Math.min(max, newVal));
        onChange(newVal);
    }, [max, min, onChange]);

    const handleMouseUp = useCallback(() => {
        startY.current = null;
        startValue.current = null;
        document.body.style.cursor = "default";
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        if (onInteractEnd) onInteractEnd();
    }, [handleMouseMove, onInteractEnd]);

    const percent = (value - min) / (max - min);
    const rotation = -135 + percent * 270;

    return (
        <div className="w-[18px] h-[18px] relative rounded-full bg-[#1e1e1e] border border-[#111] shadow-[0_1px_0_rgba(255,255,255,0.1)] cursor-ns-resize group" onMouseDown={handleMouseDown}>
             <div className="absolute inset-[1px] rounded-full border border-[#333]"></div>
             <div 
                className="absolute w-[2px] h-[6px] bg-[#ddd] left-[7px] top-[1px] origin-bottom rounded-[1px]"
                style={{ transform: `rotate(${rotation}deg) translateY(2px)` }}
             ></div>
        </div>
    )
}

export function DrumMachine() {
  const [stepCount, setStepCount] = useState(32); // Default larger for "screen end" feel
  
  // Patterns: Record<PatternID, Record<SoundID, boolean[]>>
  const [patterns, setPatterns] = useState<Record<number, Record<string, boolean[]>>>({
      1: Object.fromEntries(DEFAULT_SOUNDS.map(s => [s.id, Array(32).fill(false)])) 
  });
  
  const [hint, setHint] = useState<string | null>(null);
  const [channelViews, setChannelViews] = useState<Record<string, 'step' | 'piano'>>({});

  // Helper to format values for Hints
  const formatPan = (val: number) => {
      if (Math.abs(val) < 0.05) return "Panning: Centered";
      const percent = Math.round(Math.abs(val) * 100);
      return `Panning: ${val < 0 ? 'Left' : 'Right'} ${percent}%`;
  };
  
  const formatVol = (val: number) => {
      const db = Math.round(val);
      return `Volume: ${db > 0 ? '+' : ''}${db} dB`;
  };

  const toggleChannelView = (soundId: string) => {
      setChannelViews(prev => ({
          ...prev,
          [soundId]: prev[soundId] === 'piano' ? 'step' : 'piano'
      }));
  };

  
  const [activePatternId, setActivePatternId] = useState(1);
  const [channelVols, setChannelVols] = useState<Record<string, number>>(Object.fromEntries(DEFAULT_SOUNDS.map(s => [s.id, -6]))); // dB
  const [channelPans, setChannelPans] = useState<Record<string, number>>(Object.fromEntries(DEFAULT_SOUNDS.map(s => [s.id, 0])));
  const [channelMutes, setChannelMutes] = useState<Record<string, boolean>>(Object.fromEntries(DEFAULT_SOUNDS.map(s => [s.id, false])));
  const [activeChannel, setActiveChannel] = useState<string | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [bpm, setBpm] = useState(128);

  // Tone.js Refs
  const synths = useRef<Record<string, Tone.Synth | Tone.MembraneSynth | Tone.NoiseSynth | Tone.MetalSynth | any>>({});
  const panners = useRef<Record<string, Tone.Panner>>({});
  const vols = useRef<Record<string, Tone.Volume>>({});
  
  // Initialize Synths
  useEffect(() => {
      // Setup Synths for existing sounds
      DEFAULT_SOUNDS.forEach(sound => {
          if (!synths.current[sound.id]) {
              // Create Chain: Synth -> Panner -> Volume -> Destination
              const vol = new Tone.Volume(channelVols[sound.id] || -6).toDestination();
              const pan = new Tone.Panner(channelPans[sound.id] || 0).connect(vol);
              
              let synth;
              try {
                  switch(sound.type) {
                      case 'kick':
                          synth = new Tone.MembraneSynth({
                              pitchDecay: 0.05,
                              octaves: 10,
                              oscillator: { type: "sine" },
                              envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
                          }).connect(pan);
                          break;
                      case 'snare':
                          synth = new Tone.NoiseSynth({
                              noise: { type: "white" },
                              envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
                          }).connect(pan);
                          break;
                      case 'clap':
                          synth = new Tone.NoiseSynth({
                              noise: { type: "pink" },
                              envelope: { attack: 0.005, decay: 0.1, sustain: 0 }
                          }).connect(pan);
                          break; 
                       case 'hihat':
                           synth = new Tone.MetalSynth({
                               envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
                               harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
                           }).connect(pan);
                           break;
                       case 'cymbal':
                           synth = new Tone.MetalSynth({
                               envelope: { attack: 0.001, decay: 1, release: 1 },
                               harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
                           }).connect(pan);
                           break;
                       case 'tom':
                            synth = new Tone.MembraneSynth({
                              pitchDecay: 0.05, octaves: 4, oscillator: { type: "sine" },
                              envelope: { attack: 0.001, decay: 0.4, sustain: 0.01, release: 1.4 }
                            }).connect(pan);
                            break;
                  }
              } catch (e) {
                  console.error("Failed to create synth", e);
              }
              
              if (synth) {
                synths.current[sound.id] = synth;
                panners.current[sound.id] = pan;
                vols.current[sound.id] = vol;
              }
          }
      });
  }, []); 

  // Update Vol/Pan
  useEffect(() => {
      Object.entries(channelVols).forEach(([id, val]) => {
         if (vols.current[id]) vols.current[id].volume.value = val;
      });
      Object.entries(channelPans).forEach(([id, val]) => {
          if (panners.current[id]) panners.current[id].pan.value = val;
      });
  }, [channelVols, channelPans]);
  
  // Transport & Sequencing
  useEffect(() => {
     let loopId: number | null = null;
     
     if (isPlaying) {
         Tone.Transport.start();
         
         // Schedule a repeating event every 16th note
         loopId = Tone.Transport.scheduleRepeat((time) => {
             // 1. Calculate current step based on Transport position
             // We can't rely on React state inside this callback for the *very latest* step increment 
             // if we want straightforward logic, but we can look up the ref-based step or simple counter.
             // However, Tone.Transport guarantees precise timing. 
             // Let's use a ref for the step counter to avoid closure staleness.
         }, "16n");
         
         // To properly sync step counting with Tone's timeline, 
         // it is often easier to use `Tone.Sequence` or just calculate based on ticks.
         // Given dynamic step counts, a custom callback using a ref is robust.
     } else {
         Tone.Transport.stop();
         Tone.Transport.cancel(); // Clear all scheduled events
     }
     
     return () => {
         if (loopId !== null) Tone.Transport.clear(loopId);
     };
  }, [isPlaying]);

  // We need a ref to track the current step inside the Tone callback
  const stepRef = useRef(0);
  
  // Update Transport BPM
  useEffect(() => {
     Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  const togglePlayback = async () => {
      if (!isPlaying) {
          await Tone.start();
          stepRef.current = 0;
          setCurrentStep(0);
          Tone.Transport.stop(); // Ensure clean start
          Tone.Transport.cancel();
          
          Tone.Transport.scheduleRepeat((time) => {
              const step = stepRef.current;
              
              // Trigger Sounds
              const currentGrid = patterns[activePatternId];
              if (currentGrid) {
                  DEFAULT_SOUNDS.forEach(sound => {
                      if (currentGrid[sound.id]?.[step] && !channelMutes[sound.id]) {
                           const synth = synths.current[sound.id];
                           if (synth) {
                               try {
                                   if (sound.type === 'kick') synth.triggerAttackRelease("C1", "8n", time);
                                   else if (sound.type === 'snare') synth.triggerAttackRelease("16n", time); 
                                   else if (sound.type === 'clap') synth.triggerAttackRelease("16n", time);
                                   else if (sound.type === 'hihat') synth.triggerAttackRelease("32n", time); 
                                   else if (sound.type === 'tom') synth.triggerAttackRelease("G2", "8n", time);
                                   else if (sound.type === 'cymbal') synth.triggerAttackRelease("16n", time);
                               } catch (e) {
                                   console.warn("Trigger error", e);
                               }
                           }
                      }
                  });
              }

              // Visual Update via Tone.Draw
              Tone.Draw.schedule(() => {
                  setCurrentStep(step);
              }, time);
              
              // Increment step
              stepRef.current = (step + 1) % stepCount;
              
          }, "16n");

          Tone.Transport.start();
          setIsPlaying(true);
      } else {
          Tone.Transport.stop();
          Tone.Transport.cancel();
          setIsPlaying(false);
          setCurrentStep(0);
          stepRef.current = 0;
      }
  };

  // Remove the old setInterval useEffect
  // (The previous "Sequencer Visual Loop" on lines 206-219 and "triggerStep" on 221-244 are replaced by the logic in togglePlayback and the effect above)


  // Preview Sound
  const playPreview = async (soundId: string) => {
      await Tone.start();
      const synth = synths.current[soundId];
      const type = DEFAULT_SOUNDS.find(s => s.id === soundId)?.type;
      const playTime = Tone.now() + 0.05;

      if (synth) {
           try {
               if (type === 'kick') synth.triggerAttackRelease("C1", "8n", playTime);
               else if (type === 'tom') synth.triggerAttackRelease("G2", "8n", playTime);
               else synth.triggerAttackRelease("16n", playTime);
           } catch(e) { console.warn("Preview error", e); }
      }
  };

  // Drag state
  const isDragging = useRef(false);
  const dragMode = useRef(true); // true = turning ON, false = turning OFF

  useEffect(() => {
      const handleGlobalUp = () => isDragging.current = false;
      window.addEventListener("mouseup", handleGlobalUp);
      return () => window.removeEventListener("mouseup", handleGlobalUp);
  }, []);

  // Update specific step
  const setStep = (soundId: string, step: number, value: boolean) => {
      setPatterns(prev => {
          const p = prev[activePatternId] || {};
          let row = p[soundId] ? [...p[soundId]] : Array(stepCount).fill(false);
          
          if (row.length < stepCount) {
             const diff = stepCount - row.length;
             row = [...row, ...Array(diff).fill(false)];
          }

          if (row[step] === value) return prev; // No change

          row[step] = value;
          return {
              ...prev,
              [activePatternId]: {
                  ...p,
                  [soundId]: row
              }
          };
      });
  };

  const onStepMouseDown = (e: React.MouseEvent, soundId: string, step: number) => {
      e.preventDefault(); // Prevent text selection/drag behaviors
      e.stopPropagation();
      const currentVal = patterns[activePatternId]?.[soundId]?.[step] || false;
      const nextVal = !currentVal;
      isDragging.current = true;
      dragMode.current = nextVal;
      setStep(soundId, step, nextVal);
  };

  const onStepMouseEnter = (soundId: string, step: number) => {
      if (isDragging.current) {
          setStep(soundId, step, dragMode.current);
      }
  };
  
  const changePattern = (delta: number) => {
      let nextId = activePatternId + delta;
      if (nextId < 1) nextId = 1;
      if (nextId > MAX_PATTERNS) nextId = MAX_PATTERNS;
      setActivePatternId(nextId);
      
      if (!patterns[nextId]) {
           setPatterns(prev => ({
               ...prev,
               [nextId]: Object.fromEntries(DEFAULT_SOUNDS.map(s => [s.id, Array(stepCount).fill(false)]))
           }));
      }
  };

  const addSteps = () => {
      const increment = 16;
      setStepCount(prev => prev + increment);
      
      // Expand all patterns by increment
      setPatterns(prev => {
          const newPatterns: Record<number, Record<string, boolean[]>> = {};
          
          // Iterate all loaded patterns
          Object.keys(prev).forEach(pidStr => {
              const pid = Number(pidStr);
              const pattern = prev[pid];
              const newPatternRows: Record<string, boolean[]> = {};
              
              Object.keys(pattern).forEach(soundId => {
                  newPatternRows[soundId] = [...pattern[soundId], ...Array(increment).fill(false)];
              });
              
              newPatterns[pid] = newPatternRows;
          });
          
          return newPatterns;
      });
  };

  const shrinkSteps = () => {
      const decrement = 16;
      if (stepCount <= 16) return; // Minimum 16 steps
      setStepCount(prev => prev - decrement);
      
      // Truncate
      setPatterns(prev => {
          const newPatterns: Record<number, Record<string, boolean[]>> = {};
          Object.keys(prev).forEach(pidStr => {
              const pid = Number(pidStr);
              const pattern = prev[pid];
              const newPatternRows: Record<string, boolean[]> = {};
              Object.keys(pattern).forEach(soundId => {
                  newPatternRows[soundId] = pattern[soundId].slice(0, pattern[soundId].length - decrement);
              });
              newPatterns[pid] = newPatternRows;
          });
          return newPatterns;
      });
  };

  const resetPattern = () => {
      if (confirm("Are you sure you want to clear the current pattern?")) {
          setPatterns(prev => {
              const current = prev[activePatternId];
              const cleared: Record<string, boolean[]> = {};
              Object.keys(current).forEach(key => {
                  cleared[key] = Array(stepCount).fill(false);
              });
              return {
                  ...prev,
                  [activePatternId]: cleared
              };
          });
      }
  };

  const exportMIDI = () => {
      const midi = new Midi();
      const track = midi.addTrack();
      
      // Set to MIDI Channel 10 (Percussion) - 0-indexed is 9
      track.channel = 9;
      // Optional: Set Instrument name
      track.instrument.name = "Drum Kit";

      DEFAULT_SOUNDS.forEach((sound) => {
          let midiNote = 60; 
          // Verified General MIDI Percussion Map
          // https://en.wikipedia.org/wiki/General_MIDI#Percussion
          if (sound.type === 'kick') midiNote = 36;       // Bass Drum 1
          else if (sound.type === 'snare') midiNote = 38; // Acoustic Snare
          else if (sound.type === 'clap') midiNote = 39;  // Hand Clap
          else if (sound.type === 'hihat') midiNote = 42; // Closed Hi-Hat
          else if (sound.type === 'tom') midiNote = 45;   // Low Tom
          else if (sound.type === 'cymbal') midiNote = 49;// Crash Cymbal 1
          
          const row = patterns[activePatternId]?.[sound.id];
          if (row) {
              row.forEach((isActive, step) => {
                  if (isActive && step < stepCount) {
                      track.addNote({
                          midi: midiNote,
                          time: step * (60 / bpm / 4), // start time in seconds
                          duration: 0.1, // short duration for hits
                          velocity: 0.8  // standard velocity
                      });
                  }
              });
          }
      });
      
      const array = midi.toArray();
      const blob = new Blob([array.buffer as ArrayBuffer], { type: "audio/midi" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `beat-pattern-${activePatternId}.mid`;
      a.click();
      URL.revokeObjectURL(url);
  };

  const currentGrid = patterns[activePatternId] || {};

  return (
    <TooltipProvider>
    <div className="bg-[#4a4d52] w-full h-full flex flex-col font-sans select-none text-[#d6d6d6] text-[11px] overflow-hidden rounded-md border border-[#333]">
      {/* 1. Toolbar */}
      <div className="flex items-center h-[36px] bg-[#33363b] px-2 border-b border-[#222] shrink-0 gap-2 relative">
         {/* Hint Overlay (Absolute, covers left side if active) */}
         <div className={`absolute left-0 top-0 h-full bg-[#3d4045] items-center px-4 min-w-[200px] z-20 border-r border-[#555] shadow-md transition-opacity duration-200 ${hint ? "opacity-100 flex" : "opacity-0 pointer-events-none hidden"}`}>
             <span className="text-white font-semibold tracking-wide drop-shadow-sm">{hint}</span>
         </div>

         {/* Play */}
         <TooltipWrapper content="재생/정지. 패턴 재생을 시작하거나 중지합니다." shortcut="Space">
         <button onClick={togglePlayback} className={`w-[26px] h-[26px] rounded-[4px] border border-[#111] shadow-sm flex items-center justify-center ${isPlaying ? "bg-[#eab308] text-black" : "bg-[#444] text-[#aaa] hover:bg-[#555] hover:text-white"}`}>
             {isPlaying ? <Square size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" />}
         </button>
         </TooltipWrapper>
         
         {/* Pattern Selector */}
         <div className="flex items-center bg-[#24272b] h-[24px] rounded-[3px] border border-[#1a1c1f]">
             <div className="px-3 text-[#ccc] font-semibold border-r border-[#333] flex items-center h-full">
                 Pattern {activePatternId}
             </div>
             <div className="flex flex-col h-full w-[14px]">
                 <button onClick={() => changePattern(1)} className="flex-1 hover:bg-[#333] flex items-center justify-center text-[#777] hover:text-white"><ChevronUp size={8} strokeWidth={3} /></button>
                 <button onClick={() => changePattern(-1)} className="flex-1 hover:bg-[#333] flex items-center justify-center text-[#777] hover:text-white"><ChevronDown size={8} strokeWidth={3} /></button>
             </div>
         </div>
         
         {!hint && (
            <div className="flex items-center gap-2 ml-4">
                <span className="text-[#eab308]"><Play size={10} fill="currentColor" className=""/></span>
                <span className="font-bold text-[#ccc] tracking-wide text-xs">Channel rack</span>
            </div>
         )}

         {/* BPM & Export */}
         <div className="ml-auto flex items-center gap-3">
             <TooltipWrapper content="MIDI 내보내기. 현재 패턴을 MIDI 파일로 저장합니다.">
             <button onClick={exportMIDI} className="flex items-center gap-1 bg-[#24272b] px-2 py-1 rounded-[3px] border border-[#1a1c1f] hover:bg-[#333] text-[#aaa] text-[10px]" title="Export MIDI">
                 <Download size={10} />
                 <span>MIDI</span>
             </button>
             </TooltipWrapper>

             <div className="flex items-center gap-2 bg-[#24272b] px-2 py-1 rounded-[3px] border border-[#1a1c1f]">
                 <span className="text-[#eab308] font-bold text-[9px]">TEMPO</span>
                 <Slider value={[bpm]} onValueChange={([v]) => setBpm(v)} min={60} max={180} step={1} className="w-16 h-3" />
                 <span className="font-mono text-[#eab308] w-[24px] text-right">{bpm}</span>
             </div>
         </div>
      </div>

      {/* 2. Rack Area */}
      <div className="flex-1 bg-[#373a3f] p-[2px] overflow-y-auto custom-scrollbar flex flex-col gap-[2px]">
          {DEFAULT_SOUNDS.map((sound, i) => (
             <div key={sound.id} className={`flex items-center h-[34px] bg-[#43464c] rounded-[3px] pr-[1px] relative group hover:bg-[#4b4e54] transition-colors ${activeChannel === sound.id ? "bg-[#4b4e54]" : ""}`} onClick={() => setActiveChannel(sound.id)}>
                 
                 {/* Left Controls */}
                 <div className="w-[190px] h-full flex items-center px-[4px] shrink-0 border-r border-[#2a2c30] bg-[#3e4146] rounded-l-[3px] z-10 sticky left-0 shadow-[2px_0_5px_rgba(0,0,0,0.2)]">
                     <MuteLED active={channelMutes[sound.id]} onClick={(e) => { e.stopPropagation(); setChannelMutes(p => ({...p, [sound.id]: !p[sound.id]})); }} />
                     
                     <div className="flex gap-[4px] mr-[6px]">
                         {/* Pan Knob (Left, -1 to 1) */}
                         <TooltipWrapper content="패닝. 좌우 스테레오 밸런스를 조절합니다.">
                            <VolumePanKnob 
                                value={channelPans[sound.id]} 
                                min={-1} 
                                max={1} 
                                onChange={(v) => {
                                    setChannelPans(p => ({...p, [sound.id]: v}));
                                    setHint(formatPan(v));
                                }}
                                onInteractEnd={() => setHint(null)}
                            />
                         </TooltipWrapper>
                         {/* Volume Knob (Right, 0 to 1 scale mapped to dB) */}
                         <TooltipWrapper content="볼륨. 채널의 출력 레벨을 조절합니다.">
                            <VolumePanKnob 
                                value={(channelVols[sound.id] + 30) / 40} 
                                min={0} 
                                max={1} 
                                onChange={(v) => {
                                    const db = (v * 40) - 30;
                                    setChannelVols(p => ({...p, [sound.id]: db}));
                                    setHint(formatVol(db));
                                }}
                                onInteractEnd={() => setHint(null)}
                            />
                         </TooltipWrapper>
                     </div>

                     <button 
                        className="w-[24px] h-[18px] bg-[#222428] border border-[#1a1c1f] rounded-[2px] flex items-center justify-center mr-[4px] shadow-inner font-mono text-[10px] text-[#777] hover:text-[#ccc] hover:bg-[#333]"
                        title="Toggle Piano Roll / Step View"
                        onClick={(e) => { e.stopPropagation(); toggleChannelView(sound.id); }}
                     >
                         {channelViews[sound.id] === 'piano' ? (
                             <div className="flex gap-[1px] items-end h-[8px]">
                                 <div className="w-[2px] h-[4px] bg-[#84cc6e]"></div>
                                 <div className="w-[2px] h-[8px] bg-[#84cc6e]"></div>
                                 <div className="w-[2px] h-[5px] bg-[#84cc6e]"></div>
                             </div>
                         ) : (
                            <span className="">{i + 1}</span>
                         )}
                     </button>

                     <button 
                        className="flex-1 h-[22px] bg-gradient-to-b from-[#5c6066] to-[#404348] border-t border-[#6e727a] border-b border-[#2b2d31] border-x border-[#4a4d53] rounded-[2px] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] flex items-center justify-center active:translate-y-[1px] active:from-[#404348] active:to-[#5c6066] truncate px-1"
                        onClick={() => playPreview(sound.id)}
                     >
                         <span className="text-[#e2e2e2] font-semibold text-[10px] drop-shadow-md">{sound.name}</span>
                     </button>
                 </div>

                 
                 {/* Sequencer / Piano Roll Area */}
                 <div className="flex-1 h-full flex items-center gap-[1px] pl-[1px] overflow-x-auto custom-scrollbar-horizontal pr-[30px] relative">
                     {channelViews[sound.id] === 'piano' ? (
                         // Mini Piano Roll View
                         <div className="flex w-full h-full bg-[#2d3035] relative cursor-pointer" 
                              onClick={() => toggleChannelView(sound.id)} // Click to switch back? Or separate interact? Keep simple toggle for now.
                              title="Piano Roll Preview"
                         >
                             {/* Background Grid */}
                             {Array.from({ length: stepCount }).map((_, step) => (
                                 <div key={step} className={`absolute top-0 bottom-0 border-r border-[#3a3d42] ${step % 4 === 0 ? "border-[#4a4d53]" : ""}`} style={{ left: `${(step / stepCount) * 100}%`, width: `${(1 / stepCount) * 100}%` }}></div>
                             ))}

                             {/* Note Blocks */}
                             {Array.from({ length: stepCount }).map((_, step) => {
                                 const isOn = currentGrid[sound.id]?.[step];
                                 if (!isOn) return null;
                                 return (
                                     <div 
                                        key={step} 
                                        className="absolute top-[2px] bottom-[2px] bg-[#84cc6e] border border-[#9be285] rounded-[1px] shadow-sm"
                                        style={{ 
                                            left: `${(step / stepCount) * 100}%`, 
                                            width: `${(1 / stepCount) * 100}%` 
                                        }}
                                     ></div>
                                 )
                             })}
                             
                             {/* Playhead */}
                             {isPlaying && (
                                 <div 
                                    className="absolute top-0 bottom-0 w-[1px] bg-[#eab308] z-20 pointer-events-none"
                                    style={{ left: `${(currentStep / stepCount) * 100}%` }}
                                 ></div>
                             )}
                         </div>
                     ) : (
                         // Step Sequencer View
                         Array.from({ length: stepCount }).map((_, step) => {
                             const group = Math.floor(step / 4);
                             const isOddGroup = group % 2 !== 0; 
                             const isOn = currentGrid[sound.id]?.[step] || false;
                             const isCurrent = currentStep === step && isPlaying;
                         
                             const offColor = isOddGroup ? "bg-[#53565c] border-[#3e4146]" : "bg-[#5e5050] border-[#4b3e3e]";
                             const activeColor = "bg-[#dcdde1] border-[#c0c1c5] shadow-[0_0_4px_rgba(255,255,255,0.4)]";
                         
                             return (
                                 <button
                                    key={step}
                                    onMouseDown={(e) => onStepMouseDown(e, sound.id, step)}
                                    onMouseEnter={() => onStepMouseEnter(sound.id, step)}
                                    className={`
                                        h-[22px] min-w-[12px] flex-1 rounded-[2px] border box-border transition-none shrink-0
                                        ${isOn ? activeColor : offColor}
                                        ${isCurrent ? "brightness-150 scale-105 z-10" : "hover:brightness-110"}
                                    `}
                                    style={{ width: '22px' }}
                                 >
                                     {isOn && <div className="w-full h-[50%] bg-gradient-to-b from-white/40 to-transparent"></div>}
                                 </button>
                             )
                         })
                     )}
                 </div>
             </div>
          ))}
      </div>
      
      {/* Footer / Status Bar */}
      <div className="h-[24px] bg-[#2a2c30] border-t border-[#222] flex items-center px-2 justify-end gap-2">
            <button 
                onClick={resetPattern}
                className="flex items-center gap-1 text-[10px] text-[#aaa] hover:text-white px-2 py-0.5 rounded hover:bg-[#333] transition-colors"
                title="Clear current pattern"
            >
                <Trash2 size={10} />
                <span>Reset Pattern</span>
            </button>
            <div className="w-[1px] h-[12px] bg-[#444]"></div>
            <button 
                onClick={shrinkSteps}
                className="flex items-center gap-1 text-[10px] text-[#aaa] hover:text-white px-2 py-0.5 rounded hover:bg-[#333] transition-colors"
                title="Remove 16 Steps"
            >
                <ChevronDown size={10} />
                <span>Shrink</span>
            </button>
            <button 
                onClick={addSteps}
                className="flex items-center gap-1 text-[10px] text-[#aaa] hover:text-white px-2 py-0.5 rounded hover:bg-[#333] transition-colors"
                title="Add 16 Steps"
            >
                <Plus size={10} />
                <span>Extend</span>
            </button>
      </div>
    </div>
    </TooltipProvider>
  );
}
