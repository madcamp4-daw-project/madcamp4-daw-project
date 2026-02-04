"use client";

import type { Track, Clip } from "./track-list";

interface TimelineProps {
  tracks: Track[];
  currentTime: number;
  zoom: number;
  bpm: number;
}

const BAR_WIDTH = 80;

export function Timeline({ tracks, currentTime, zoom, bpm }: TimelineProps) {
  const totalBars = 64;
  const pixelsPerBeat = (BAR_WIDTH / 4) * zoom;
  const playheadPosition = (currentTime / 60) * bpm * pixelsPerBeat;

  // Generate waveform-like pattern for audio clips
  const generateWaveform = (seed: number) => {
    const points: number[] = [];
    for (let i = 0; i < 100; i++) {
      const val =
        Math.sin(i * 0.3 + seed) * 0.3 +
        Math.sin(i * 0.7 + seed * 2) * 0.2 +
        Math.sin(i * 1.5 + seed * 3) * 0.15 +
        0.5;
      points.push(Math.max(0.1, Math.min(0.9, val)));
    }
    return points;
  };

  return (
    <div className="flex-1 bg-[#1a1a1a] overflow-auto relative">
      {/* Time Ruler */}
      <div className="sticky top-0 z-20 h-8 bg-[#252525] border-b border-border flex">
        <div className="flex">
          {Array.from({ length: totalBars }).map((_, i) => (
            <div
              key={i}
              className="border-r border-border flex items-end pb-1"
              style={{ width: BAR_WIDTH * zoom }}
            >
              <span className="text-[10px] text-muted-foreground ml-1">
                {i + 1}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Track Lanes */}
      <div className="relative">
        {/* Grid lines */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: `
              linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
              linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px)
            `,
            backgroundSize: `${(BAR_WIDTH * zoom) / 4}px 100%, ${BAR_WIDTH * zoom}px 100%`,
          }}
        />

        {/* Playhead */}
        <div
          className="absolute top-0 bottom-0 w-px bg-primary z-30"
          style={{ left: playheadPosition }}
        >
          <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-l-transparent border-r-transparent border-t-primary" />
        </div>

        {/* Track Rows */}
        {tracks.map((track, trackIndex) => (
          <div
            key={track.id}
            className="h-16 border-b border-border relative"
            style={{
              backgroundColor:
                trackIndex % 2 === 0
                  ? "rgba(255,255,255,0.02)"
                  : "transparent",
            }}
          >
            {/* Clips */}
            {track.clips.map((clip) => {
              const waveform = generateWaveform(clip.id);
              return (
                <div
                  key={clip.id}
                  className="absolute top-1 bottom-1 rounded overflow-hidden cursor-pointer hover:brightness-110 transition-all"
                  style={{
                    left: clip.start * BAR_WIDTH * zoom,
                    width: clip.duration * BAR_WIDTH * zoom,
                    backgroundColor: `${track.color}33`,
                    borderLeft: `3px solid ${track.color}`,
                  }}
                >
                  {/* Clip header */}
                  <div
                    className="h-4 px-1 flex items-center"
                    style={{ backgroundColor: `${track.color}66` }}
                  >
                    <span className="text-[10px] text-white font-medium truncate">
                      {clip.name}
                    </span>
                  </div>

                  {/* Waveform visualization */}
                  <div className="flex-1 flex items-center justify-center px-1">
                    <svg
                      className="w-full h-8"
                      viewBox="0 0 100 20"
                      preserveAspectRatio="none"
                    >
                      {waveform.map((val, i) => (
                        <rect
                          key={i}
                          x={i}
                          y={10 - val * 10}
                          width="0.8"
                          height={val * 20}
                          fill={track.color}
                          opacity={0.8}
                        />
                      ))}
                    </svg>
                  </div>
                </div>
              );
            })}
          </div>
        ))}

        {/* Empty space for scrolling */}
        <div style={{ width: totalBars * BAR_WIDTH * zoom, height: 1 }} />
      </div>
    </div>
  );
}
