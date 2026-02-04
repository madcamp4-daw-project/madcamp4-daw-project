"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Play,
  Pause,
  Square,
  SkipBack,
  SkipForward,
  Circle,
  Repeat,
  ChevronDown,
  Settings,
  Save,
  FolderOpen,
  Undo,
  Redo,
  Scissors,
  Copy,
  Trash2,
  MousePointer2,
  Move,
  Pencil,
  Eraser,
  Music2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

interface ToolbarProps {
  isPlaying: boolean;
  isRecording: boolean;
  bpm: number;
  currentTime: string;
  onPlay: () => void;
  onStop: () => void;
  onRecord: () => void;
  onBpmChange: (bpm: number) => void;
}

export function Toolbar({
  isPlaying,
  isRecording,
  bpm,
  currentTime,
  onPlay,
  onStop,
  onRecord,
  onBpmChange,
}: ToolbarProps) {
  const [selectedTool, setSelectedTool] = useState("smart");

  const tools = [
    { id: "smart", icon: MousePointer2, label: "Smart Tool" },
    { id: "select", icon: MousePointer2, label: "Select" },
    { id: "move", icon: Move, label: "Move" },
    { id: "edit", icon: Pencil, label: "Edit" },
    { id: "draw", icon: Pencil, label: "Draw" },
    { id: "erase", icon: Eraser, label: "Erase" },
  ];

  return (
    <div className="h-12 bg-[#1e1e1e] border-b border-border flex items-center px-2 gap-1">
      {/* Logo */}
      <div className="flex items-center gap-2 px-3 border-r border-border mr-2">
        <div className="w-6 h-6 rounded bg-primary flex items-center justify-center">
          <Music2 className="w-4 h-4 text-primary-foreground" />
        </div>
        <span className="text-sm font-bold text-foreground hidden sm:inline">
          SONAR
        </span>
      </div>

      {/* File Menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8"
          >
            File <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border">
          <DropdownMenuItem>
            <FolderOpen className="mr-2 h-4 w-4" /> Open Project
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Save className="mr-2 h-4 w-4" /> Save
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Export Audio</DropdownMenuItem>
          <DropdownMenuItem>Export MIDI</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8"
          >
            Edit <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border">
          <DropdownMenuItem>
            <Undo className="mr-2 h-4 w-4" /> Undo
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Redo className="mr-2 h-4 w-4" /> Redo
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <Scissors className="mr-2 h-4 w-4" /> Cut
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Copy className="mr-2 h-4 w-4" /> Copy
          </DropdownMenuItem>
          <DropdownMenuItem>
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground h-8"
          >
            View <ChevronDown className="ml-1 h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="bg-card border-border">
          <DropdownMenuItem>Track View</DropdownMenuItem>
          <DropdownMenuItem>Console View</DropdownMenuItem>
          <DropdownMenuItem>Piano Roll</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem>Zoom In</DropdownMenuItem>
          <DropdownMenuItem>Zoom Out</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <div className="border-l border-border h-6 mx-2" />

      {/* Tools */}
      <div className="flex items-center gap-0.5 bg-secondary/50 rounded p-0.5">
        {tools.slice(0, 4).map((tool) => (
          <Button
            key={tool.id}
            variant="ghost"
            size="sm"
            className={`h-7 w-7 p-0 ${
              selectedTool === tool.id
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => setSelectedTool(tool.id)}
            title={tool.label}
          >
            <tool.icon className="h-4 w-4" />
          </Button>
        ))}
      </div>

      <div className="border-l border-border h-6 mx-2" />

      {/* Transport Controls */}
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onStop}
        >
          <SkipBack className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
          onClick={onStop}
        >
          <Square className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${
            isPlaying
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={onPlay}
        >
          {isPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className={`h-8 w-8 p-0 ${
            isRecording
              ? "bg-red-500 text-white"
              : "text-muted-foreground hover:text-foreground"
          }`}
          onClick={onRecord}
        >
          <Circle className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
        >
          <Repeat className="h-4 w-4" />
        </Button>
      </div>

      <div className="border-l border-border h-6 mx-2" />

      {/* Time Display */}
      <div className="bg-[#0d0d0d] rounded px-3 py-1 font-mono text-lg text-foreground min-w-[140px] text-center border border-border">
        {currentTime}
      </div>

      <div className="border-l border-border h-6 mx-2" />

      {/* BPM */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">BPM</span>
        <input
          type="number"
          value={bpm}
          onChange={(e) => onBpmChange(Number(e.target.value))}
          className="w-16 bg-[#0d0d0d] border border-border rounded px-2 py-1 text-sm text-foreground text-center font-mono"
          min={20}
          max={300}
        />
      </div>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings */}
      <Button
        variant="ghost"
        size="sm"
        className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      >
        <Settings className="h-4 w-4" />
      </Button>
    </div>
  );
}

// 기본 내보내기와 이름 있는 내보내기를 모두 제공해서
// 번들러가 어떤 형태의 export 를 요구하더라도 안전하게 동작하도록 한다.
export default Toolbar;
