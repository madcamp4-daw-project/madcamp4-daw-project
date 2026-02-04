"use client";

import React from "react"

import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Play,
  Square,
  ZoomIn,
  ZoomOut,
  Mic2,
  Music2,
  Waves,
  Settings2,
} from "lucide-react";

interface PitchPoint {
  time: number;
  pitch: number;
  isSelected: boolean;
}

interface VocalRegion {
  id: string;
  name: string;
  start: number;
  duration: number;
  pitchData: PitchPoint[];
  color: string;
}

// Simulated vocal regions with pitch data
const generatePitchData = (start: number, duration: number): PitchPoint[] => {
  const points: PitchPoint[] = [];
  const baseNote = 60 + Math.random() * 12; // Base MIDI note
  for (let t = 0; t < duration; t += 0.05) {
    points.push({
      time: start + t,
      pitch: baseNote + Math.sin(t * 2) * 2 + (Math.random() - 0.5) * 0.5,
      isSelected: false,
    });
  }
  return points;
};

const initialRegions: VocalRegion[] = [
  {
    id: "vocal-1",
    name: "Lead Vocal",
    start: 2,
    duration: 6,
    pitchData: generatePitchData(2, 6),
    color: "#f97316",
  },
  {
    id: "vocal-2",
    name: "Verse 2",
    start: 10,
    duration: 8,
    pitchData: generatePitchData(10, 8),
    color: "#f97316",
  },
  {
    id: "backing-1",
    name: "Backing Vocal",
    start: 4,
    duration: 4,
    pitchData: generatePitchData(4, 4),
    color: "#22c55e",
  },
];

const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export function VocalSync() {
  const [regions, setRegions] = useState<VocalRegion[]>(initialRegions);
  const [selectedRegion, setSelectedRegion] = useState<string | null>("vocal-1");
  const [zoom, setZoom] = useState(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playhead, setPlayhead] = useState(0);
  const [pitchCorrection, setPitchCorrection] = useState(50);
  const [pitchDrift, setPitchDrift] = useState(0);
  const [formantShift, setFormantShift] = useState(0);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState("1/16");
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const midiToNoteName = (midi: number) => {
    const note = Math.round(midi);
    const octave = Math.floor(note / 12) - 1;
    const noteName = NOTE_NAMES[note % 12];
    return `${noteName}${octave}`;
  };

  // Draw pitch editor
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.fillStyle = "#1a1a1a";
    ctx.fillRect(0, 0, width, height);

    // Draw grid lines (notes)
    const minNote = 48; // C3
    const maxNote = 84; // C6
    const noteRange = maxNote - minNote;
    const pixelsPerNote = height / noteRange;

    // Horizontal grid lines (notes)
    ctx.strokeStyle = "#2b2b2b";
    ctx.lineWidth = 1;
    for (let note = minNote; note <= maxNote; note++) {
      const y = height - ((note - minNote) / noteRange) * height;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Draw note labels
      if (note % 12 === 0) {
        ctx.fillStyle = "#666";
        ctx.font = "10px monospace";
        ctx.fillText(midiToNoteName(note), 4, y - 2);
      }
    }

    // Vertical grid lines (time)
    const pixelsPerSecond = (width / 20) * zoom;
    ctx.strokeStyle = "#2b2b2b";
    for (let t = 0; t <= 20; t += 0.5) {
      const x = t * pixelsPerSecond;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();

      if (t % 1 === 0) {
        ctx.fillStyle = "#666";
        ctx.font = "10px monospace";
        ctx.fillText(`${t}s`, x + 2, 12);
      }
    }

    // Draw pitch curves for each region
    regions.forEach((region) => {
      const isSelected = region.id === selectedRegion;
      
      // Draw region background
      const startX = region.start * pixelsPerSecond;
      const regionWidth = region.duration * pixelsPerSecond;
      ctx.fillStyle = isSelected ? `${region.color}20` : `${region.color}10`;
      ctx.fillRect(startX, 0, regionWidth, height);

      // Draw pitch curve
      ctx.strokeStyle = region.color;
      ctx.lineWidth = isSelected ? 3 : 2;
      ctx.beginPath();

      region.pitchData.forEach((point, i) => {
        const x = point.time * pixelsPerSecond;
        const y = height - ((point.pitch - minNote) / noteRange) * height;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });
      ctx.stroke();

      // Draw pitch points if selected
      if (isSelected) {
        region.pitchData.forEach((point) => {
          const x = point.time * pixelsPerSecond;
          const y = height - ((point.pitch - minNote) / noteRange) * height;

          ctx.fillStyle = point.isSelected ? "#fff" : region.color;
          ctx.beginPath();
          ctx.arc(x, y, point.isSelected ? 5 : 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }

      // Draw region label
      ctx.fillStyle = region.color;
      ctx.font = "bold 11px sans-serif";
      ctx.fillText(region.name, startX + 4, 24);
    });

    // Draw playhead
    const playheadX = playhead * pixelsPerSecond;
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(playheadX, 0);
    ctx.lineTo(playheadX, height);
    ctx.stroke();

    // Playhead triangle
    ctx.fillStyle = "#fff";
    ctx.beginPath();
    ctx.moveTo(playheadX - 6, 0);
    ctx.lineTo(playheadX + 6, 0);
    ctx.lineTo(playheadX, 8);
    ctx.closePath();
    ctx.fill();
  }, [regions, selectedRegion, zoom, playhead]);

  // Playback simulation
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setPlayhead((prev) => (prev + 0.05) % 20);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const pixelsPerSecond = (canvas.width / 20) * zoom;
    const clickTime = x / pixelsPerSecond;

    // Find clicked region
    const clickedRegion = regions.find(
      (r) => clickTime >= r.start && clickTime <= r.start + r.duration
    );

    if (clickedRegion) {
      setSelectedRegion(clickedRegion.id);
    } else {
      setSelectedRegion(null);
    }

    setPlayhead(clickTime);
  };

  const applyPitchCorrection = () => {
    if (!selectedRegion) return;

    setRegions(
      regions.map((region) => {
        if (region.id !== selectedRegion) return region;

        return {
          ...region,
          pitchData: region.pitchData.map((point) => ({
            ...point,
            pitch: Math.round(point.pitch) + pitchDrift / 100,
          })),
        };
      })
    );
  };

  return (
    <div className="bg-[#1a1a1a] border border-border rounded-lg overflow-hidden">
      {/* Header */}
      <div className="h-10 bg-[#252525] border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Mic2 className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">
              VocalSync / ARA Editor
            </span>
          </div>

          {/* Transport */}
          <div className="flex items-center gap-1">
            <Button
              variant={isPlaying ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Square className="h-3 w-3" />
              ) : (
                <Play className="h-3 w-3" />
              )}
            </Button>
          </div>

          {/* Zoom */}
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(Math.max(0.5, zoom - 0.25))}
            >
              <ZoomOut className="h-3 w-3" />
            </Button>
            <span className="text-xs text-muted-foreground w-12 text-center">
              {(zoom * 100).toFixed(0)}%
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setZoom(Math.min(4, zoom + 0.25))}
            >
              <ZoomIn className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {/* Grid Settings */}
          <div className="flex items-center gap-2">
            <Button
              variant={snapToGrid ? "default" : "ghost"}
              size="sm"
              className="h-7 text-xs"
              onClick={() => setSnapToGrid(!snapToGrid)}
            >
              Snap
            </Button>
            <Select value={gridSize} onValueChange={setGridSize}>
              <SelectTrigger className="h-7 w-16 text-xs bg-[#2b2b2b] border-border">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1/4">1/4</SelectItem>
                <SelectItem value="1/8">1/8</SelectItem>
                <SelectItem value="1/16">1/16</SelectItem>
                <SelectItem value="1/32">1/32</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="flex">
        {/* Left Panel - Pitch Controls */}
        <div className="w-48 bg-[#1e1e1e] border-r border-border p-3 space-y-4">
          <div className="text-xs font-medium text-foreground mb-2">
            Pitch Correction
          </div>

          {/* Correction Amount */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Correction</span>
              <span className="text-xs text-foreground">{pitchCorrection}%</span>
            </div>
            <Slider
              value={[pitchCorrection]}
              onValueChange={([v]) => setPitchCorrection(v)}
              min={0}
              max={100}
              step={1}
            />
          </div>

          {/* Pitch Drift */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Pitch Drift</span>
              <span className="text-xs text-foreground">{pitchDrift} ct</span>
            </div>
            <Slider
              value={[pitchDrift]}
              onValueChange={([v]) => setPitchDrift(v)}
              min={-100}
              max={100}
              step={1}
            />
          </div>

          {/* Formant Shift */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-xs text-muted-foreground">Formant</span>
              <span className="text-xs text-foreground">{formantShift} st</span>
            </div>
            <Slider
              value={[formantShift]}
              onValueChange={([v]) => setFormantShift(v)}
              min={-12}
              max={12}
              step={1}
            />
          </div>

          {/* Apply Button */}
          <Button
            variant="default"
            size="sm"
            className="w-full"
            onClick={applyPitchCorrection}
            disabled={!selectedRegion}
          >
            Apply Correction
          </Button>

          {/* Tools */}
          <div className="pt-2 border-t border-border">
            <div className="text-xs font-medium text-foreground mb-2">Tools</div>
            <div className="grid grid-cols-2 gap-1">
              <Button variant="ghost" size="sm" className="h-8 text-xs justify-start">
                <Waves className="h-3 w-3 mr-1" />
                Pitch
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs justify-start">
                <Music2 className="h-3 w-3 mr-1" />
                Time
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs justify-start">
                <Settings2 className="h-3 w-3 mr-1" />
                Vibrato
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs justify-start">
                <Mic2 className="h-3 w-3 mr-1" />
                Breath
              </Button>
            </div>
          </div>

          {/* Selected Region Info */}
          {selectedRegion && (
            <div className="pt-2 border-t border-border">
              <div className="text-xs font-medium text-foreground mb-2">
                Selected Region
              </div>
              <div className="text-xs text-muted-foreground space-y-1">
                <div>
                  Name:{" "}
                  <span className="text-foreground">
                    {regions.find((r) => r.id === selectedRegion)?.name}
                  </span>
                </div>
                <div>
                  Start:{" "}
                  <span className="text-foreground">
                    {regions.find((r) => r.id === selectedRegion)?.start}s
                  </span>
                </div>
                <div>
                  Duration:{" "}
                  <span className="text-foreground">
                    {regions.find((r) => r.id === selectedRegion)?.duration}s
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Canvas Editor */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <canvas
            ref={canvasRef}
            width={1200}
            height={400}
            className="cursor-crosshair"
            onClick={handleCanvasClick}
          />
        </div>
      </div>
    </div>
  );
}
