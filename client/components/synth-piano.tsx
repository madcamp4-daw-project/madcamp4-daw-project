"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Volume2, VolumeX, Music } from "lucide-react";

interface Note {
  note: string;
  frequency: number;
  isBlack: boolean;
  keyBinding: string;
}

const NOTES: Note[] = [
  { note: "C3", frequency: 130.81, isBlack: false, keyBinding: "z" },
  { note: "C#3", frequency: 138.59, isBlack: true, keyBinding: "s" },
  { note: "D3", frequency: 146.83, isBlack: false, keyBinding: "x" },
  { note: "D#3", frequency: 155.56, isBlack: true, keyBinding: "d" },
  { note: "E3", frequency: 164.81, isBlack: false, keyBinding: "c" },
  { note: "F3", frequency: 174.61, isBlack: false, keyBinding: "v" },
  { note: "F#3", frequency: 185.0, isBlack: true, keyBinding: "g" },
  { note: "G3", frequency: 196.0, isBlack: false, keyBinding: "b" },
  { note: "G#3", frequency: 207.65, isBlack: true, keyBinding: "h" },
  { note: "A3", frequency: 220.0, isBlack: false, keyBinding: "n" },
  { note: "A#3", frequency: 233.08, isBlack: true, keyBinding: "j" },
  { note: "B3", frequency: 246.94, isBlack: false, keyBinding: "m" },
  { note: "C4", frequency: 261.63, isBlack: false, keyBinding: "q" },
  { note: "C#4", frequency: 277.18, isBlack: true, keyBinding: "2" },
  { note: "D4", frequency: 293.66, isBlack: false, keyBinding: "w" },
  { note: "D#4", frequency: 311.13, isBlack: true, keyBinding: "3" },
  { note: "E4", frequency: 329.63, isBlack: false, keyBinding: "e" },
  { note: "F4", frequency: 349.23, isBlack: false, keyBinding: "r" },
  { note: "F#4", frequency: 369.99, isBlack: true, keyBinding: "5" },
  { note: "G4", frequency: 392.0, isBlack: false, keyBinding: "t" },
  { note: "G#4", frequency: 415.3, isBlack: true, keyBinding: "6" },
  { note: "A4", frequency: 440.0, isBlack: false, keyBinding: "y" },
  { note: "A#4", frequency: 466.16, isBlack: true, keyBinding: "7" },
  { note: "B4", frequency: 493.88, isBlack: false, keyBinding: "u" },
  { note: "C5", frequency: 523.25, isBlack: false, keyBinding: "i" },
];

type WaveType = "sine" | "square" | "sawtooth" | "triangle";

interface SynthPianoProps {
  onNotePlay?: (note: string, frequency: number) => void;
}

export function SynthPiano({ onNotePlay }: SynthPianoProps) {
  const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
  const [volume, setVolume] = useState(0.5);
  const [waveType, setWaveType] = useState<WaveType>("sine");
  const [attack, setAttack] = useState(0.02);
  const [release, setRelease] = useState(0.3);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscillatorsRef = useRef<Map<string, OscillatorNode>>(new Map());
  const gainNodesRef = useRef<Map<string, GainNode>>(new Map());

  // Initialize AudioContext on first interaction
  const initAudioContext = useCallback(() => {
    if (!audioContextRef.current) {
      audioContextRef.current = new AudioContext();
    }
    return audioContextRef.current;
  }, []);

  const playNote = useCallback(
    (note: Note) => {
      if (isMuted) return;

      const audioContext = initAudioContext();
      if (audioContext.state === "suspended") {
        audioContext.resume();
      }

      // Stop existing note if playing
      if (oscillatorsRef.current.has(note.note)) {
        return;
      }

      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = waveType;
      oscillator.frequency.setValueAtTime(note.frequency, audioContext.currentTime);

      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        volume,
        audioContext.currentTime + attack
      );

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.start();

      oscillatorsRef.current.set(note.note, oscillator);
      gainNodesRef.current.set(note.note, gainNode);

      setActiveNotes((prev) => new Set([...prev, note.note]));
      onNotePlay?.(note.note, note.frequency);
    },
    [isMuted, initAudioContext, waveType, volume, attack, onNotePlay]
  );

  const stopNote = useCallback(
    (note: Note) => {
      const audioContext = audioContextRef.current;
      const oscillator = oscillatorsRef.current.get(note.note);
      const gainNode = gainNodesRef.current.get(note.note);

      if (oscillator && gainNode && audioContext) {
        gainNode.gain.linearRampToValueAtTime(
          0,
          audioContext.currentTime + release
        );
        setTimeout(() => {
          oscillator.stop();
          oscillator.disconnect();
          gainNode.disconnect();
          oscillatorsRef.current.delete(note.note);
          gainNodesRef.current.delete(note.note);
        }, release * 1000);
      }

      setActiveNotes((prev) => {
        const newSet = new Set(prev);
        newSet.delete(note.note);
        return newSet;
      });
    },
    [release]
  );

  // Keyboard event handlers
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const note = NOTES.find((n) => n.keyBinding === e.key.toLowerCase());
      if (note) {
        playNote(note);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const note = NOTES.find((n) => n.keyBinding === e.key.toLowerCase());
      if (note) {
        stopNote(note);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, [playNote, stopNote]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      oscillatorsRef.current.forEach((osc) => {
        osc.stop();
        osc.disconnect();
      });
      gainNodesRef.current.forEach((gain) => {
        gain.disconnect();
      });
    };
  }, []);

  const whiteKeys = NOTES.filter((n) => !n.isBlack);
  const blackKeys = NOTES.filter((n) => n.isBlack);

  return (
    <div className="bg-[#1a1a1a] border border-border rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Music className="h-5 w-5 text-primary" />
          <span className="text-sm font-medium text-foreground">Synth Piano</span>
        </div>
        <div className="flex items-center gap-4">
          {/* Wave Type */}
          <Select value={waveType} onValueChange={(v) => setWaveType(v as WaveType)}>
            <SelectTrigger className="w-28 h-7 text-xs bg-[#252525] border-border">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="sine">Sine</SelectItem>
              <SelectItem value="square">Square</SelectItem>
              <SelectItem value="sawtooth">Sawtooth</SelectItem>
              <SelectItem value="triangle">Triangle</SelectItem>
            </SelectContent>
          </Select>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX className="h-4 w-4 text-muted-foreground" />
              ) : (
                <Volume2 className="h-4 w-4 text-foreground" />
              )}
            </Button>
            <Slider
              value={[volume]}
              onValueChange={([v]) => setVolume(v)}
              min={0}
              max={1}
              step={0.01}
              className="w-20"
            />
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-6 mb-4">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Attack</span>
          <Slider
            value={[attack]}
            onValueChange={([v]) => setAttack(v)}
            min={0.01}
            max={0.5}
            step={0.01}
            className="w-16"
          />
          <span className="text-xs text-foreground w-8">{attack.toFixed(2)}s</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Release</span>
          <Slider
            value={[release]}
            onValueChange={([v]) => setRelease(v)}
            min={0.05}
            max={2}
            step={0.05}
            className="w-16"
          />
          <span className="text-xs text-foreground w-8">{release.toFixed(2)}s</span>
        </div>
      </div>

      {/* Piano Keys */}
      <div className="relative h-36">
        {/* White Keys */}
        <div className="flex h-full">
          {whiteKeys.map((note, index) => (
            <button
              key={note.note}
              className={`relative flex-1 border border-[#333] rounded-b transition-colors flex flex-col items-center justify-end pb-2 ${
                activeNotes.has(note.note)
                  ? "bg-primary/80"
                  : "bg-[#e0e0e0] hover:bg-[#d0d0d0]"
              }`}
              onMouseDown={() => playNote(note)}
              onMouseUp={() => stopNote(note)}
              onMouseLeave={() => stopNote(note)}
              onTouchStart={(e) => {
                e.preventDefault();
                playNote(note);
              }}
              onTouchEnd={(e) => {
                e.preventDefault();
                stopNote(note);
              }}
            >
              <span className="text-[10px] text-[#333] font-medium">{note.note}</span>
              <span className="text-[8px] text-[#666] uppercase">{note.keyBinding}</span>
            </button>
          ))}
        </div>

        {/* Black Keys */}
        <div className="absolute top-0 left-0 right-0 h-[60%] flex pointer-events-none">
          {whiteKeys.map((whiteNote, index) => {
            const blackNote = blackKeys.find((b) => {
              const whiteIndex = NOTES.indexOf(whiteNote);
              const blackIndex = NOTES.indexOf(b);
              return blackIndex === whiteIndex + 1;
            });

            if (!blackNote) {
              return <div key={`spacer-${index}`} className="flex-1" />;
            }

            return (
              <div key={blackNote.note} className="flex-1 relative">
                <button
                  className={`absolute right-0 translate-x-1/2 w-[70%] h-full rounded-b z-10 pointer-events-auto flex flex-col items-center justify-end pb-1 ${
                    activeNotes.has(blackNote.note)
                      ? "bg-primary"
                      : "bg-[#1a1a1a] hover:bg-[#333]"
                  }`}
                  onMouseDown={() => playNote(blackNote)}
                  onMouseUp={() => stopNote(blackNote)}
                  onMouseLeave={() => stopNote(blackNote)}
                  onTouchStart={(e) => {
                    e.preventDefault();
                    playNote(blackNote);
                  }}
                  onTouchEnd={(e) => {
                    e.preventDefault();
                    stopNote(blackNote);
                  }}
                >
                  <span className="text-[8px] text-white/70">{blackNote.keyBinding}</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Keyboard Hint */}
      <div className="mt-2 text-[10px] text-muted-foreground text-center">
        Use keyboard keys (Z-M for lower octave, Q-I for upper octave) or click/tap to play
      </div>
    </div>
  );
}
