"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  VolumeX,
  Headphones,
  CircleDot,
  ChevronRight,
  ChevronDown,
  Plus,
  MoreHorizontal,
} from "lucide-react";

export interface Track {
  id: string | number;
  name: string;
  type: "audio" | "midi" | "bus" | "master";
  color: string;
  volume: number;
  pan: number;
  muted: boolean;
  solo: boolean;
  armed: boolean;
  clips: Clip[];
}

export interface Clip {
  id: string | number;
  name: string;
  start: number;
  duration: number;
  color: string;
}

interface TrackListProps {
  tracks: Track[];
  selectedTrackId: string | number | null;
  onSelectTrack: (id: string | number) => void;
  onToggleMute: (id: string | number) => void;
  onToggleSolo: (id: string | number) => void;
  onToggleArm: (id: string | number) => void;
}

export function TrackList({
  tracks,
  selectedTrackId,
  onSelectTrack,
  onToggleMute,
  onToggleSolo,
  onToggleArm,
}: TrackListProps) {
  const [expandedGroups, setExpandedGroups] = useState<number[]>([]);

  return (
    <div className="w-60 bg-[#1a1a1a] border-r border-border flex flex-col">
      {/* Header */}
      <div className="h-8 bg-[#252525] border-b border-border flex items-center justify-between px-2">
        <span className="text-xs font-medium text-muted-foreground uppercase">
          Tracks
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-6 w-6 p-0 text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      {/* Track List */}
      <div className="flex-1 overflow-y-auto">
        {tracks.map((track) => (
          <div
            key={track.id}
            className={`border-b border-border cursor-pointer ${
              selectedTrackId === track.id ? "bg-secondary" : "hover:bg-secondary/50"
            }`}
            onClick={() => onSelectTrack(track.id)}
          >
            {/* Track Header */}
            <div className="flex items-center h-16 px-2 gap-2">
              {/* Color indicator */}
              <div
                className="w-1 h-10 rounded-full"
                style={{ backgroundColor: track.color }}
              />

              {/* Track info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <span className="text-sm font-medium text-foreground truncate">
                    {track.name}
                  </span>
                </div>
                <div className="flex items-center gap-1 mt-1">
                  {/* Mini fader */}
                  <div className="w-16 h-1 bg-secondary rounded-full">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${((track.volume + 60) / 66) * 100}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {track.volume.toFixed(1)}
                  </span>
                </div>
              </div>

              {/* Track Controls */}
              <div className="flex items-center gap-0.5">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    track.muted
                      ? "text-primary bg-primary/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute(track.id);
                  }}
                >
                  {track.muted ? (
                    <VolumeX className="h-3.5 w-3.5" />
                  ) : (
                    <span className="text-[10px] font-bold">M</span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-6 w-6 p-0 ${
                    track.solo
                      ? "text-yellow-500 bg-yellow-500/20"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSolo(track.id);
                  }}
                >
                  <span className="text-[10px] font-bold">S</span>
                </Button>
                {track.type !== "master" && track.type !== "bus" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-6 w-6 p-0 ${
                      track.armed
                        ? "text-red-500 bg-red-500/20"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleArm(track.id);
                    }}
                  >
                    <CircleDot className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add Track Button */}
      <div className="p-2 border-t border-border">
        <Button
          variant="outline"
          size="sm"
          className="w-full border-dashed border-border text-muted-foreground hover:text-foreground bg-transparent"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Track
        </Button>
      </div>
    </div>
  );
}
