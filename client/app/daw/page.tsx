"use client";

import { useState, useEffect } from "react";
import { Toolbar } from "@/components/toolbar";
import { TrackList, type Track } from "@/components/track-list";
import { Timeline } from "@/components/timeline";
import { Mixer } from "@/components/mixer";
import { BrowserPanel } from "@/components/browser-panel";
import { LeftFxPanel } from "@/components/left-fx-panel";
import { SynthPiano } from "@/components/synth-piano";
import { DrumMachine } from "@/components/drum-machine";
import { VocalSync } from "@/components/vocal-sync";
import { ProChannel } from "@/components/pro-channel";
import PianoRoll from "@/components/piano-roll/PianoRoll";
import { StemSeparationPanel } from "@/components/stem-separation";
import { TransitionPanel } from "@/components/transition";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Maximize2,
  Minimize2,
  Piano,
  Drum,
  Mic2,
  Sliders,
  LayoutGrid,
  X,
  Music2,
  Layers,
  Radio,
} from "lucide-react";

const initialTracks: Track[] = [
  {
    id: 1,
    name: "MAIN GTR",
    type: "audio",
    color: "#3b82f6",
    volume: -2.3,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 1, name: "Main Guitar", start: 4, duration: 8, color: "#3b82f6" },
      { id: 2, name: "Main Guitar 2", start: 16, duration: 12, color: "#3b82f6" },
    ],
  },
  {
    id: 2,
    name: "CHRIS GTR",
    type: "audio",
    color: "#22c55e",
    volume: -5.8,
    pan: -20,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 3, name: "Rhythm Guitar", start: 4, duration: 16, color: "#22c55e" },
    ],
  },
  {
    id: 3,
    name: "LOW GTR",
    type: "audio",
    color: "#a855f7",
    volume: -8.2,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 4, name: "Bass Guitar", start: 0, duration: 20, color: "#a855f7" },
    ],
  },
  {
    id: 4,
    name: "Lead Vocal",
    type: "audio",
    color: "#f97316",
    volume: -1.5,
    pan: 0,
    muted: false,
    solo: false,
    armed: true,
    clips: [
      { id: 5, name: "Verse 1", start: 8, duration: 8, color: "#f97316" },
      { id: 6, name: "Chorus", start: 20, duration: 8, color: "#f97316" },
    ],
  },
  {
    id: 5,
    name: "Lead Vocal Dub",
    type: "audio",
    color: "#eab308",
    volume: -12.3,
    pan: 30,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 7, name: "Vocal Double", start: 8, duration: 8, color: "#eab308" },
    ],
  },
  {
    id: 6,
    name: "BG Vocal",
    type: "audio",
    color: "#06b6d4",
    volume: -15.2,
    pan: -30,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 8, name: "Harmonies", start: 20, duration: 8, color: "#06b6d4" },
    ],
  },
  {
    id: 7,
    name: "Drums",
    type: "audio",
    color: "#ef4444",
    volume: -3.0,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 9, name: "Drum Loop", start: 0, duration: 32, color: "#ef4444" },
    ],
  },
  {
    id: 8,
    name: "Synth Pad",
    type: "midi",
    color: "#ec4899",
    volume: -10.5,
    pan: 0,
    muted: false,
    solo: false,
    armed: false,
    clips: [
      { id: 10, name: "Pad Layer", start: 8, duration: 24, color: "#ec4899" },
    ],
  },
];

type BottomPanelView = "mixer" | "piano" | "drums" | "vocal" | "prochannel" | "stems" | "transition" | null;

export default function DAWPage() {
  const [tracks, setTracks] = useState<Track[]>(initialTracks);
  const [selectedTrackId, setSelectedTrackId] = useState<number | null>(1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bottomPanel, setBottomPanel] = useState<BottomPanelView>("mixer");
  const [showBrowser, setShowBrowser] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 1000);
    return `${mins}:${secs.toString().padStart(2, "0")}:${ms.toString().padStart(3, "0")}`;
  };

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => prev + 0.05);
      }, 50);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const handleToggleMute = (id: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === id ? { ...track, muted: !track.muted } : track
      )
    );
  };

  const handleToggleSolo = (id: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === id ? { ...track, solo: !track.solo } : track
      )
    );
  };

  const handleToggleArm = (id: number) => {
    setTracks(
      tracks.map((track) =>
        track.id === id ? { ...track, armed: !track.armed } : track
      )
    );
  };

  const handleVolumeChange = (id: number, volume: number) => {
    setTracks(
      tracks.map((track) => (track.id === id ? { ...track, volume } : track))
    );
  };

  const handlePanChange = (id: number, pan: number) => {
    setTracks(
      tracks.map((track) => (track.id === id ? { ...track, pan } : track))
    );
  };

  const handlePlay = () => setIsPlaying(!isPlaying);
  const handleStop = () => {
    setIsPlaying(false);
    setCurrentTime(0);
  };
  const handleRecord = () => setIsRecording(!isRecording);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* Top Bar */}
      <div className="h-10 bg-[#0d0d0d] border-b border-border flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Music2 className="h-5 w-5 text-primary" />
            <span className="text-sm font-bold text-foreground">SONAR</span>
          </div>
          <span className="text-xs text-muted-foreground">|</span>
          <span className="text-sm text-foreground">Untitled Project</span>
        </div>

        {/* View Toggles */}
        <div className="flex items-center gap-2">
          <Tabs value={bottomPanel || "none"} onValueChange={(v) => setBottomPanel(v === "none" ? null : v as BottomPanelView)}>
            <TabsList className="h-7 bg-[#1a1a1a]">
              <TabsTrigger value="mixer" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <LayoutGrid className="h-3 w-3 mr-1" />
                Mixer
              </TabsTrigger>
              <TabsTrigger value="piano" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Piano className="h-3 w-3 mr-1" />
                Piano
              </TabsTrigger>
              <TabsTrigger value="drums" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Drum className="h-3 w-3 mr-1" />
                Drums
              </TabsTrigger>
              {/* VocalSync 탭 - 임시 비활성화
              <TabsTrigger value="vocal" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Mic2 className="h-3 w-3 mr-1" />
                VocalSync
              </TabsTrigger>
              */}
              <TabsTrigger value="prochannel" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Sliders className="h-3 w-3 mr-1" />
                ProChannel
              </TabsTrigger>
              <TabsTrigger value="stems" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Layers className="h-3 w-3 mr-1" />
                Stems
              </TabsTrigger>
              <TabsTrigger value="transition" className="h-6 px-2 text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                <Radio className="h-3 w-3 mr-1" />
                Transition DJ
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <Button
          variant="ghost"
          size="sm"
          className="h-7 text-muted-foreground hover:text-foreground"
          onClick={toggleFullscreen}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>

      {/* Toolbar */}
      <Toolbar
        isPlaying={isPlaying}
        isRecording={isRecording}
        bpm={bpm}
        currentTime={formatTime(currentTime)}
        onPlay={handlePlay}
        onStop={handleStop}
        onRecord={handleRecord}
        onBpmChange={setBpm}
      />

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left FX Panel */}
        {showLeftPanel && (
          <div className="relative">
            <LeftFxPanel selectedTrackId={selectedTrackId} />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5 z-10"
              onClick={() => setShowLeftPanel(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Track List */}
        <TrackList
          tracks={tracks}
          selectedTrackId={selectedTrackId}
          onSelectTrack={setSelectedTrackId}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onToggleArm={handleToggleArm}
        />

        {/* Timeline */}
        <Timeline
          tracks={tracks}
          currentTime={currentTime}
          zoom={zoom}
          bpm={bpm}
        />

        {/* Browser Panel */}
        {showBrowser && (
          <div className="relative">
            <BrowserPanel activeTab="fx" />
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-1 right-1 h-5 w-5 z-10"
              onClick={() => setShowBrowser(false)}
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Bottom Panel */}
      {bottomPanel && (
        <div className="border-t border-border">
          {bottomPanel === "mixer" && (
            <Mixer
              tracks={tracks}
              onVolumeChange={handleVolumeChange}
              onPanChange={handlePanChange}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
            />
          )}
          {bottomPanel === "piano" && (
            <div className="h-[600px] w-full border-t border-zinc-700">
               <PianoRoll />
            </div>
          )}
          {bottomPanel === "drums" && (
            <div className="p-4 max-h-[350px] overflow-auto">
              <DrumMachine />
            </div>
          )}
          {/* VocalSync 패널 - 임시 비활성화
          {bottomPanel === "vocal" && (
            <div className="max-h-[500px] overflow-auto">
              <VocalSync />
            </div>
          )}
          */}
          {bottomPanel === "prochannel" && (
            <div className="p-4 max-h-[500px] overflow-auto">
              <div className="max-w-md">
                <ProChannel />
              </div>
            </div>
          )}
          {bottomPanel === "stems" && (
            <div className="fixed top-[88px] left-0 right-0 bottom-0 z-50 bg-[#1a1a1a]">
              <StemSeparationPanel />
            </div>
          )}
          {bottomPanel === "transition" && (
            <div className="h-[600px] overflow-hidden">
              <TransitionPanel />
            </div>
          )}
        </div>
      )}

      {/* Panel Toggle Buttons (when hidden) */}
      <div className="fixed left-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
        {!showLeftPanel && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowLeftPanel(true)}
          >
            <Sliders className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="fixed right-2 top-1/2 -translate-y-1/2 flex flex-col gap-2 z-50">
        {!showBrowser && (
          <Button
            variant="secondary"
            size="icon"
            className="h-8 w-8"
            onClick={() => setShowBrowser(true)}
          >
            <LayoutGrid className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
