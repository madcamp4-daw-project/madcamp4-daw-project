"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  ChevronDown,
  Plus,
  Settings,
  Power,
  MoreHorizontal,
} from "lucide-react";

interface LeftFxPanelProps {
  selectedTrackId: number | null;
}

const EQ_BANDS = [
  { name: "Low", freq: "80Hz", color: "#22c55e" },
  { name: "LoMid", freq: "500Hz", color: "#eab308" },
  { name: "HiMid", freq: "2.5k", color: "#f97316" },
  { name: "High", freq: "10k", color: "#ef4444" },
];

export function LeftFxPanel({ selectedTrackId }: LeftFxPanelProps) {
  const [eqEnabled, setEqEnabled] = useState(true);
  const [eqValues, setEqValues] = useState({
    low: 0,
    lomid: 0,
    himid: 0,
    high: 0,
  });
  const [hpf, setHpf] = useState(20);
  const [lpf, setLpf] = useState(20000);

  return (
    <div className="w-52 bg-[#1a1a1a] border-r border-border flex flex-col">
      {/* Header */}
      <div className="h-8 bg-[#252525] border-b border-border flex items-center justify-between px-2">
        <div className="flex items-center gap-1">
          <span className="text-xs font-medium text-muted-foreground">| Fx</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-5 w-5 p-0 text-muted-foreground hover:text-foreground"
          >
            <Settings className="h-3 w-3" />
          </Button>
        </div>
      </div>

      {selectedTrackId ? (
        <div className="flex-1 overflow-y-auto">
          {/* EQ Section */}
          <div className="border-b border-border">
            {/* EQ Header */}
            <div className="h-7 bg-secondary/50 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-5 w-5 p-0 ${
                    eqEnabled ? "text-primary" : "text-muted-foreground"
                  }`}
                  onClick={() => setEqEnabled(!eqEnabled)}
                >
                  <Power className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium text-foreground">EQ</span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>

            {/* EQ Visualizer */}
            <div className="h-24 bg-[#0d0d0d] mx-2 mt-2 rounded relative overflow-hidden">
              {/* Grid */}
              <div
                className="absolute inset-0"
                style={{
                  backgroundImage:
                    "linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
                  backgroundSize: "20% 25%",
                }}
              />
              {/* EQ Curve */}
              <svg className="absolute inset-0 w-full h-full">
                <path
                  d={`M 0,${50 - eqValues.low}
                      Q 25,${50 - eqValues.lomid} 50,${50 - eqValues.himid}
                      Q 75,${50 - eqValues.high} 100,50`}
                  fill="none"
                  stroke="#f97316"
                  strokeWidth="2"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
              {/* Band indicators */}
              {EQ_BANDS.map((band, i) => (
                <div
                  key={band.name}
                  className="absolute bottom-1 text-[8px] text-muted-foreground"
                  style={{ left: `${i * 25 + 5}%` }}
                >
                  {band.freq}
                </div>
              ))}
            </div>

            {/* EQ Knobs */}
            <div className="grid grid-cols-4 gap-1 p-2">
              {EQ_BANDS.map((band) => (
                <div key={band.name} className="text-center">
                  <div
                    className="w-8 h-8 mx-auto rounded-full border-2 flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
                    style={{ borderColor: band.color }}
                  >
                    <span className="text-[10px] text-foreground font-mono">
                      {eqValues[band.name.toLowerCase() as keyof typeof eqValues]}
                    </span>
                  </div>
                  <span className="text-[9px] text-muted-foreground mt-1 block">
                    {band.name}
                  </span>
                </div>
              ))}
            </div>

            {/* HP/LP Filters */}
            <div className="px-2 pb-2 space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-6">HP</span>
                <Slider
                  value={[hpf]}
                  onValueChange={([v]) => setHpf(v)}
                  min={20}
                  max={500}
                  step={1}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground font-mono w-10">
                  {hpf}Hz
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground w-6">LP</span>
                <Slider
                  value={[lpf]}
                  onValueChange={([v]) => setLpf(v)}
                  min={1000}
                  max={20000}
                  step={100}
                  className="flex-1"
                />
                <span className="text-[10px] text-muted-foreground font-mono w-10">
                  {(lpf / 1000).toFixed(1)}k
                </span>
              </div>
            </div>
          </div>

          {/* ProChannel Module */}
          <div className="border-b border-border">
            <div className="h-7 bg-secondary/50 flex items-center justify-between px-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 w-5 p-0 text-primary"
                >
                  <Power className="h-3 w-3" />
                </Button>
                <span className="text-xs font-medium text-foreground">
                  ProChannel
                </span>
              </div>
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            </div>

            <div className="p-2 space-y-2">
              {/* Compressor */}
              <div className="bg-secondary/30 rounded p-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-foreground">Compressor</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-primary"
                  >
                    <Power className="h-2.5 w-2.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {["Thresh", "Ratio", "Gain"].map((param) => (
                    <div key={param} className="text-center">
                      <div className="w-6 h-6 mx-auto rounded-full bg-secondary border border-border flex items-center justify-center">
                        <span className="text-[8px] text-muted-foreground">0</span>
                      </div>
                      <span className="text-[8px] text-muted-foreground">
                        {param}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tape Emulation */}
              <div className="bg-secondary/30 rounded p-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-foreground">
                    Tape Saturation
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 text-muted-foreground"
                  >
                    <Power className="h-2.5 w-2.5" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Add FX Button */}
          <div className="p-2">
            <Button
              variant="outline"
              size="sm"
              className="w-full border-dashed border-border text-muted-foreground text-xs bg-transparent"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add FX
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex items-center justify-center p-4">
          <p className="text-sm text-muted-foreground text-center">
            Select a track to view FX controls
          </p>
        </div>
      )}
    </div>
  );
}
