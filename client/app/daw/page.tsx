"use client";

import { useState, useEffect } from "react";
import { Toolbar } from "@/components/toolbar";
import { TrackList } from "@/components/track-list";
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

import useMixerStore from "@/lib/stores/useMixerStore";

type BottomPanelView = "mixer" | "piano" | "drums" | "vocal" | "prochannel" | "stems" | "transition" | null;

export default function DAWPage() {
  const tracks = useMixerStore((state) => state.tracks);
  const selectedTrackId = useMixerStore((state) => state.selectedTrackId);
  const selectTrack = useMixerStore((state) => state.selectTrack);
  
  const setVolume = useMixerStore((state) => state.setVolume);
  const setPan = useMixerStore((state) => state.setPan);
  const toggleMute = useMixerStore((state) => state.toggleMute);
  const toggleSolo = useMixerStore((state) => state.toggleSolo);
  const toggleArmed = useMixerStore((state) => state.toggleArmed);
  const addTrack = useMixerStore((state) => state.addTrack);
  const removeTrack = useMixerStore((state) => state.removeTrack);
  
  const loadFromServer = useMixerStore((state) => state.loadFromServer);
  const saveToServer = useMixerStore((state) => state.saveToServer);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [bpm, setBpm] = useState(120);
  const [currentTime, setCurrentTime] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [bottomPanel, setBottomPanel] = useState<BottomPanelView>("mixer");
  const [showBrowser, setShowBrowser] = useState(true);
  const [showLeftPanel, setShowLeftPanel] = useState(true);

  // Load from server on mount
  useEffect(() => {
    loadFromServer().then(() => {
        // If empty, maybe seeding? 
        // For now, let's assume server is source of truth.
        // If the user wants defaults, they should be in server's default state or added manually.
    });
  }, [loadFromServer]);

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

  // Wrap store actions with save
  const handleToggleMute = (id: string | number) => {
    toggleMute(String(id));
    saveToServer();
  };

  const handleToggleSolo = (id: string | number) => {
    toggleSolo(String(id));
    saveToServer();
  };

  const handleToggleArm = (id: string | number) => {
    toggleArmed(String(id));
    saveToServer();
  };

  const handleVolumeChange = (id: string | number, volume: number) => {
    setVolume(String(id), volume);
    saveToServer();
  };

  const handlePanChange = (id: string | number, pan: number) => {
    setPan(String(id), pan);
    saveToServer();
  };
  
  const handleSelectTrack = (id: string | number) => {
    selectTrack(String(id));
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
            <LeftFxPanel selectedTrackId={selectedTrackId ? Number(selectedTrackId.toString().replace('track-','')) || 0 : 0} />
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
          tracks={tracks as any[]} // Type casting to satisfy mismatch if any clips are missing props
          selectedTrackId={selectedTrackId}
          onSelectTrack={handleSelectTrack}
          onToggleMute={handleToggleMute}
          onToggleSolo={handleToggleSolo}
          onToggleArm={handleToggleArm}
        />

        {/* Timeline */}
        <Timeline
          tracks={tracks as any[]}
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
              tracks={tracks as any[]}
              onVolumeChange={handleVolumeChange}
              onPanChange={handlePanChange}
              onToggleMute={handleToggleMute}
              onToggleSolo={handleToggleSolo}
              onAddTrack={() => {
                  addTrack({ 
                      name: "New Track", 
                      color: "#555", 
                      volume: 0, 
                      pan: 0, 
                      muted: false, 
                      solo: false, 
                      armed: false, 
                      sourceType: 'file',
                      type: 'audio',
                      clips: []
                   });
                   saveToServer();
              }}
              onRemoveTrack={(id) => {
                  removeTrack(String(id));
                  saveToServer();
              }}
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
