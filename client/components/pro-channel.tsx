"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { TooltipProvider, TooltipWrapper } from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Power, ChevronDown, ChevronUp, GripVertical } from "lucide-react";
import { getProChannelEngine } from "@/lib/audio/ProChannelEngine";
import useMixerStore from "@/lib/stores/useMixerStore";

interface ModuleProps {
  title: string;
  enabled: boolean;
  onToggle: () => void;
  children: React.ReactNode;
  color?: string;
}

function Module({ title, enabled, onToggle, children, color = "#f97316" }: ModuleProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <div className={`bg-[#1e1e1e] rounded border ${enabled ? "border-border" : "border-transparent"}`}>
      <div
        className="flex items-center justify-between px-3 py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center gap-2">
          <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
          <div
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: enabled ? color : "#666" }}
          />
          <span className={`text-xs font-medium ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            <Power className={`h-3 w-3 ${enabled ? "text-primary" : "text-muted-foreground"}`} />
          </Button>
          {isExpanded ? (
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </div>
      {isExpanded && enabled && (
        <div className="px-3 pb-3 border-t border-border pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * EQ 모듈 - 전역 스토어 연동
 */
function EQModule() {
  const eqState = useMixerStore(state => state.proChannel?.eq);
  const setProChannelState = useMixerStore(state => state.setProChannelState);
  const saveToServer = useMixerStore(state => state.saveToServer);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Fallback defaults if store is not yet hydated perfectly
  const bands = eqState?.bands || [];
  const enabled = eqState?.enabled ?? true;

  const updateState = (updates: any) => {
      setProChannelState('eq', { ...eqState, ...updates });
      saveToServer();
  };

  const updateBand = (index: number, updates: any) => {
     const newBands = bands.map((b, i) => i === index ? { ...b, ...updates } : b);
     updateState({ bands: newBands });
  };

  // ProChannelEngine에 EQ 설정 동기화
  useEffect(() => {
    if (!bands.length) return;
    try {
      const engine = getProChannelEngine();
      engine.setEQ({
        low: bands[0].gain,   // 80Hz lowshelf
        mid: bands[2].gain,   // 1kHz peaking
        high: bands[4].gain,  // 12kHz highshelf
      });
    } catch (e) {
      console.warn('EQ 엔진 연결 실패:', e);
    }
  }, [bands]);

  // 모듈 바이패스 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('eq', !enabled);
    } catch (e) {
      console.warn('EQ 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;

    // Clear
    ctx.fillStyle = "#252525";
    ctx.fillRect(0, 0, width, height);

    // Grid
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      const y = (height / 4) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Frequency markers
    const freqs = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
    ctx.fillStyle = "#666";
    ctx.font = "9px sans-serif";
    freqs.forEach((f) => {
      const x = (Math.log10(f / 20) / Math.log10(20000 / 20)) * width;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      ctx.fillText(f >= 1000 ? `${f / 1000}k` : `${f}`, x + 2, height - 4);
    });

    if (!eqState) return;

    // Draw EQ curve
    ctx.strokeStyle = "#f97316";
    ctx.lineWidth = 2;
    ctx.beginPath();

    for (let x = 0; x < width; x++) {
      const freq = 20 * Math.pow(20000 / 20, x / width);
      let totalGain = 0;

      bands.forEach((band) => {
        if (!band.enabled) return;
        const diff = Math.log2(freq / band.frequency);
        let gain = 0;

        switch (band.type) {
          case "lowshelf":
            gain = band.gain * (1 - 1 / (1 + Math.exp(-diff * 4)));
            break;
          case "highshelf":
            gain = band.gain * (1 / (1 + Math.exp(-diff * 4)));
            break;
          case "peaking":
            gain = band.gain * Math.exp(-Math.pow(diff * band.q, 2));
            break;
          default:
            break;
        }
        totalGain += gain;
      });

      const y = height / 2 - (totalGain / 24) * height;
      if (x === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.stroke();

    // Draw band handles
    bands.forEach((band, i) => {
      const x = (Math.log10(band.frequency / 20) / Math.log10(20000 / 20)) * width;
      const y = height / 2 - (band.gain / 24) * height;

      ctx.fillStyle = band.enabled ? "#f97316" : "#666";
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = "#fff";
      ctx.font = "bold 8px sans-serif";
      ctx.fillText(`${i + 1}`, x - 3, y + 3);
    });
  }, [bands, eqState]);

  if (!eqState) return <div>Loading EQ...</div>;

  return (
    <Module title="QuadCurve EQ" enabled={enabled} onToggle={() => updateState({ enabled: !enabled })} color="#f97316">
      <canvas ref={canvasRef} width={300} height={120} className="rounded mb-3" />
      <div className="space-y-2">
        {bands.map((band, i) => (
          <div key={i} className="flex items-center gap-2">
            <Button
              variant={band.enabled ? "default" : "ghost"}
              size="sm"
              className="h-6 w-6 p-0 text-xs"
              onClick={() => updateBand(i, { enabled: !band.enabled })}
            >
              {i + 1}
            </Button>
            <span className="text-[10px] text-muted-foreground w-12">
              {band.frequency >= 1000 ? `${band.frequency / 1000}kHz` : `${band.frequency}Hz`}
            </span>
            <Slider
              value={[band.gain]}
              onValueChange={([v]) => updateBand(i, { gain: v })}
              min={-12}
              max={12}
              step={0.5}
              className="flex-1"
            />
            <span className="text-[10px] text-foreground w-10 text-right">
              {band.gain > 0 ? "+" : ""}{band.gain.toFixed(1)}dB
            </span>
          </div>
        ))}
      </div>
    </Module>
  );
}

/**
 * 컴프레서 모듈
 */
function CompressorModule() {
  const comp = useMixerStore(state => state.proChannel?.compressor);
  const setProChannelState = useMixerStore(state => state.setProChannelState);
  const saveToServer = useMixerStore(state => state.saveToServer);
  const [gainReduction, setGainReduction] = useState(-6);

  const updateState = (updates: any) => {
      setProChannelState('compressor', { ...comp, ...updates });
      saveToServer();
  };

  const { enabled, threshold, ratio, attack, release, makeup } = comp || {};

  useEffect(() => {
    if (!comp) return;
    try {
      const engine = getProChannelEngine();
      engine.setCompressor({
        threshold,
        ratio,
        attack: attack / 1000,
        release: release / 1000,
      });
    } catch (e) {
      console.warn('Compressor 엔진 연결 실패:', e);
    }
  }, [threshold, ratio, attack, release, comp]);

  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('compressor', !enabled);
    } catch (e) {
      console.warn('Compressor 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  useEffect(() => {
    const interval = setInterval(() => setGainReduction(-Math.random() * 12), 100);
    return () => clearInterval(interval);
  }, []);

  if (!comp) return <div>Loading Compressor...</div>;

  return (
    <Module title="PC76 Compressor" enabled={enabled} onToggle={() => updateState({ enabled: !enabled })} color="#3b82f6">
      <div className="mb-3">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1">
          <span>GR</span>
          <span>{gainReduction.toFixed(1)} dB</span>
        </div>
        <div className="h-2 bg-[#252525] rounded overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500 transition-all"
            style={{ width: `${Math.min(100, Math.abs(gainReduction) * 8)}%` }}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <TooltipWrapper content="컴프레서가 작동하기 시작하는 레벨입니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Threshold</span>
            <span className="text-foreground">{threshold}dB</span>
          </div>
          <Slider value={[threshold]} onValueChange={([v]) => updateState({ threshold: v })} min={-60} max={0} step={1} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="압축 비율입니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Ratio</span>
            <span className="text-foreground">{ratio}:1</span>
          </div>
          <Slider value={[ratio]} onValueChange={([v]) => updateState({ ratio: v })} min={1} max={20} step={0.5} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="Attack time">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Attack</span>
            <span className="text-foreground">{attack}ms</span>
          </div>
          <Slider value={[attack]} onValueChange={([v]) => updateState({ attack: v })} min={0.1} max={100} step={0.1} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="Release time">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Release</span>
            <span className="text-foreground">{release}ms</span>
          </div>
          <Slider value={[release]} onValueChange={([v]) => updateState({ release: v })} min={10} max={1000} step={10} />
        </div>
        </TooltipWrapper>
      </div>

      <TooltipWrapper content="Makeup Gain">
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Makeup Gain</span>
          <span className="text-foreground">{makeup > 0 ? "+" : ""}{makeup}dB</span>
        </div>
        <Slider value={[makeup]} onValueChange={([v]) => updateState({ makeup: v })} min={0} max={24} step={0.5} />
      </div>
      </TooltipWrapper>
    </Module>
  );
}

/**
 * 테이프 새츄레이션 모듈
 */
function TapeSaturationModule() {
  const tape = useMixerStore(state => state.proChannel?.tape);
  const setProChannelState = useMixerStore(state => state.setProChannelState);
  const saveToServer = useMixerStore(state => state.saveToServer);

  const updateState = (updates: any) => {
      setProChannelState('tape', { ...tape, ...updates });
      saveToServer();
  };

  const { enabled, drive, warmth, speed } = tape || {};

  useEffect(() => {
    if (!tape) return;
    try {
      const engine = getProChannelEngine();
      engine.setSaturation(drive, 'tape');
    } catch (e) {
      console.warn('Tape Saturation 엔진 연결 실패:', e);
    }
  }, [drive, tape]);

  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('saturation', !enabled);
    } catch (e) {
      console.warn('Tape Saturation 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  if (!tape) return <div>Loading Tape...</div>;

  return (
    <Module title="Tape Emulator" enabled={enabled} onToggle={() => updateState({ enabled: !enabled })} color="#eab308">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Speed</span>
        <Select value={speed} onValueChange={(v) => updateState({ speed: v })}>
          <SelectTrigger className="h-6 text-xs flex-1 bg-[#252525] border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7.5">7.5 ips</SelectItem>
            <SelectItem value="15">15 ips</SelectItem>
            <SelectItem value="30">30 ips</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <TooltipWrapper content="Drive">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider value={[drive]} onValueChange={([v]) => updateState({ drive: v })} min={0} max={100} step={1} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="Warmth">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Warmth</span>
            <span className="text-foreground">{warmth}%</span>
          </div>
          <Slider value={[warmth]} onValueChange={([v]) => updateState({ warmth: v })} min={0} max={100} step={1} />
        </div>
        </TooltipWrapper>
      </div>
    </Module>
  );
}

/**
 * 콘솔 새츄레이션 모듈
 */
function ConsoleSaturationModule() {
  const consoleState = useMixerStore(state => state.proChannel?.console);
  const setProChannelState = useMixerStore(state => state.setProChannelState);
  const saveToServer = useMixerStore(state => state.saveToServer);

  const updateState = (updates: any) => {
      setProChannelState('console', { ...consoleState, ...updates });
      saveToServer();
  };

  const { enabled, input, drive, type } = consoleState || {};

  useEffect(() => {
    if (!consoleState) return;
    try {
      const engine = getProChannelEngine();
      engine.setSaturation(drive, 'console');
    } catch (e) {
      console.warn('Console Saturation 엔진 연결 실패:', e);
    }
  }, [drive, consoleState]);

  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('saturation', !enabled);
    } catch (e) {
      console.warn('Console Saturation 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  if (!consoleState) return <div>Loading Console...</div>;

  return (
    <Module title="Console Emulator" enabled={enabled} onToggle={() => updateState({ enabled: !enabled })} color="#22c55e">
      <TooltipWrapper content="Console Types">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Type</span>
        <Select value={type} onValueChange={(v) => updateState({ type: v })}>
          <SelectTrigger className="h-6 text-xs flex-1 bg-[#252525] border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ssl">SSL 4000</SelectItem>
            <SelectItem value="neve">Neve 1073</SelectItem>
            <SelectItem value="api">API 550</SelectItem>
          </SelectContent>
        </Select>
      </div>
      </TooltipWrapper>

      <div className="space-y-3">
        <TooltipWrapper content="Input Level">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Input</span>
            <span className="text-foreground">{input > 0 ? "+" : ""}{input}dB</span>
          </div>
          <Slider value={[input]} onValueChange={([v]) => updateState({ input: v })} min={-12} max={12} step={0.5} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="Drive">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider value={[drive]} onValueChange={([v]) => updateState({ drive: v })} min={0} max={100} step={1} />
        </div>
        </TooltipWrapper>
      </div>
    </Module>
  );
}

/**
 * 튜브 모듈
 */
function TubeModule() {
  const tube = useMixerStore(state => state.proChannel?.tube);
  const setProChannelState = useMixerStore(state => state.setProChannelState);
  const saveToServer = useMixerStore(state => state.saveToServer);

  const updateState = (updates: any) => {
      setProChannelState('tube', { ...tube, ...updates });
      saveToServer();
  };

  const { enabled, drive, lowCut } = tube || {};

  useEffect(() => {
    if (!tube) return;
    try {
      const engine = getProChannelEngine();
      engine.setTube(drive);
    } catch (e) {
      console.warn('Tube 엔진 연결 실패:', e);
    }
  }, [drive, tube]);

  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('tube', !enabled);
    } catch (e) {
      console.warn('Tube 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  if (!tube) return <div>Loading Tube...</div>;

  return (
    <Module title="Tube Saturation" enabled={enabled} onToggle={() => updateState({ enabled: !enabled })} color="#a855f7">
      <div className="space-y-3">
        <TooltipWrapper content="Drive">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider value={[drive]} onValueChange={([v]) => updateState({ drive: v })} min={0} max={100} step={1} />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="Low Cut">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Low Cut</span>
          <Switch checked={lowCut} onCheckedChange={(v) => updateState({ lowCut: v })} />
        </div>
        </TooltipWrapper>
      </div>
    </Module>
  );
}

export function ProChannel() {
  return (
    <TooltipProvider>
      <div className="bg-[#1a1a1a] border border-border rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-primary" />
            <span className="text-sm font-medium text-foreground">ProChannel</span>
          </div>
          <span className="text-xs text-muted-foreground">Modular Channel Strip</span>
        </div>

        <div className="space-y-2">
          <EQModule />
          <CompressorModule />
          <TapeSaturationModule />
          <ConsoleSaturationModule />
          <TubeModule />
        </div>
      </div>
    </TooltipProvider>
  );
}
