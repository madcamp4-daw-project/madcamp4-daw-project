"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Folder,
  FolderOpen,
  FileAudio,
  FileMusic,
  ChevronRight,
  ChevronDown,
  Filter,
  MoreHorizontal,
} from "lucide-react";

interface BrowserFolder {
  id: string;
  name: string;
  isOpen: boolean;
  items: BrowserItem[];
}

interface BrowserItem {
  id: string;
  name: string;
  type: "audio" | "midi" | "preset";
}

const mockFolders: BrowserFolder[] = [
  {
    id: "1",
    name: "Cakewalk",
    isOpen: true,
    items: [
      { id: "1-1", name: "ProChannel Presets", type: "preset" },
      { id: "1-2", name: "FX Chain Presets", type: "preset" },
    ],
  },
  {
    id: "2",
    name: "iZotope, Inc.",
    isOpen: false,
    items: [
      { id: "2-1", name: "Ozone Presets", type: "preset" },
      { id: "2-2", name: "RX Presets", type: "preset" },
    ],
  },
  {
    id: "3",
    name: "Line 6",
    isOpen: false,
    items: [{ id: "3-1", name: "Helix Presets", type: "preset" }],
  },
  {
    id: "4",
    name: "MeldaProductions",
    isOpen: false,
    items: [
      { id: "4-1", name: "EQ Presets", type: "preset" },
      { id: "4-2", name: "Dynamics Presets", type: "preset" },
    ],
  },
  {
    id: "5",
    name: "Native Instruments",
    isOpen: false,
    items: [
      { id: "5-1", name: "Kontakt Libraries", type: "audio" },
      { id: "5-2", name: "Massive Presets", type: "preset" },
    ],
  },
  {
    id: "6",
    name: "Normad Factory",
    isOpen: false,
    items: [{ id: "6-1", name: "Vintage Presets", type: "preset" }],
  },
  {
    id: "7",
    name: "Overloud",
    isOpen: true,
    items: [{ id: "7-1", name: "TH-U Presets", type: "preset" }],
  },
];

interface BrowserPanelProps {
  activeTab: "files" | "fx";
}

export function BrowserPanel({ activeTab }: BrowserPanelProps) {
  const [folders, setFolders] = useState(mockFolders);
  const [searchQuery, setSearchQuery] = useState("");

  const toggleFolder = (id: string) => {
    setFolders(
      folders.map((folder) =>
        folder.id === id ? { ...folder, isOpen: !folder.isOpen } : folder
      )
    );
  };

  const filteredFolders = folders.filter(
    (folder) =>
      folder.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      folder.items.some((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase())
      )
  );

  return (
    <div className="w-64 bg-[#1a1a1a] border-l border-border flex flex-col">
      {/* Header */}
      <div className="h-8 bg-primary flex items-center justify-between px-3">
        <span className="text-sm font-medium text-primary-foreground">
          Audio Fx
        </span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 w-5 p-0 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary/80"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </div>

      {/* Search */}
      <div className="p-2 border-b border-border">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-8 pl-8 bg-secondary border-border text-sm"
          />
        </div>
      </div>

      {/* Folder Tree */}
      <div className="flex-1 overflow-y-auto p-1">
        {filteredFolders.map((folder) => (
          <div key={folder.id}>
            {/* Folder Header */}
            <button
              className="w-full flex items-center gap-1 px-2 py-1.5 hover:bg-secondary/50 rounded text-left"
              onClick={() => toggleFolder(folder.id)}
              type="button"
            >
              {folder.isOpen ? (
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-3 w-3 text-muted-foreground" />
              )}
              {folder.isOpen ? (
                <FolderOpen className="h-4 w-4 text-primary" />
              ) : (
                <Folder className="h-4 w-4 text-muted-foreground" />
              )}
              <span className="text-sm text-foreground truncate">
                {folder.name}
              </span>
            </button>

            {/* Folder Items */}
            {folder.isOpen && (
              <div className="ml-4 pl-2 border-l border-border">
                {folder.items.map((item) => (
                  <button
                    key={item.id}
                    className="w-full flex items-center gap-2 px-2 py-1 hover:bg-secondary/50 rounded text-left"
                    draggable
                    type="button"
                  >
                    {item.type === "audio" ? (
                      <FileAudio className="h-3 w-3 text-blue-400" />
                    ) : item.type === "midi" ? (
                      <FileMusic className="h-3 w-3 text-green-400" />
                    ) : (
                      <div className="h-3 w-3 rounded bg-primary/30 flex items-center justify-center">
                        <span className="text-[8px] text-primary">P</span>
                      </div>
                    )}
                    <span className="text-xs text-muted-foreground truncate">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="h-8 bg-secondary/50 border-t border-border flex items-center justify-between px-3">
        <span className="text-[10px] text-muted-foreground">140 Plug-ins</span>
        <Button
          variant="ghost"
          size="sm"
          className="h-5 px-1 text-[10px] text-muted-foreground"
        >
          <Filter className="h-3 w-3 mr-1" />
          Filter
        </Button>
      </div>
    </div>
  );
}
