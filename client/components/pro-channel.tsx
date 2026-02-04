"use client";

import React from "react"

import { useState, useRef, useEffect, useCallback } from "react";
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
import { getProChannelEngine, ProChannelEngine } from "@/lib/audio/ProChannelEngine";

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

interface EQBand {
  frequency: number;
  gain: number;
  q: number;
  type: "lowshelf" | "highshelf" | "peaking" | "lowpass" | "highpass";
  enabled: boolean;
}

/**
 * EQ 모듈 - ProChannelEngine과 실시간 연동
 * Low/Mid/High 밴드의 게인을 조절하여 주파수 특성을 변경
 */
function EQModule() {
  const [enabled, setEnabled] = useState(true);
  const [bands, setBands] = useState<EQBand[]>([
    { frequency: 80, gain: 0, q: 1, type: "lowshelf", enabled: true },
    { frequency: 250, gain: 0, q: 1.4, type: "peaking", enabled: true },
    { frequency: 1000, gain: 0, q: 1.4, type: "peaking", enabled: true },
    { frequency: 4000, gain: 0, q: 1.4, type: "peaking", enabled: true },
    { frequency: 12000, gain: 0, q: 1, type: "highshelf", enabled: true },
  ]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // ProChannelEngine에 EQ 설정 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      // 5밴드 EQ를 3밴드(low/mid/high)로 매핑
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
  }, [bands]);

  const updateBand = (index: number, updates: Partial<EQBand>) => {
    setBands(bands.map((b, i) => (i === index ? { ...b, ...updates } : b)));
  };

  return (
    <Module title="QuadCurve EQ" enabled={enabled} onToggle={() => setEnabled(!enabled)} color="#f97316">
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
 * 컴프레서 모듈 - ProChannelEngine과 실시간 연동
 * Threshold/Ratio/Attack/Release 파라미터로 다이나믹 레인지 제어
 */
function CompressorModule() {
  const [enabled, setEnabled] = useState(true);
  const [threshold, setThreshold] = useState(-20);
  const [ratio, setRatio] = useState(4);
  const [attack, setAttack] = useState(10);
  const [release, setRelease] = useState(100);
  const [makeup, setMakeup] = useState(0);
  const [gainReduction, setGainReduction] = useState(-6);

  // ProChannelEngine에 컴프레서 설정 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.setCompressor({
        threshold: threshold,
        ratio: ratio,
        attack: attack / 1000,  // ms → s 변환
        release: release / 1000, // ms → s 변환
      });
    } catch (e) {
      console.warn('Compressor 엔진 연결 실패:', e);
    }
  }, [threshold, ratio, attack, release]);

  // 모듈 바이패스 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('compressor', !enabled);
    } catch (e) {
      console.warn('Compressor 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  // Simulate gain reduction meter
  useEffect(() => {
    const interval = setInterval(() => {
      setGainReduction(-Math.random() * 12);
    }, 100);
    return () => clearInterval(interval);
  }, []);

  return (
    <Module title="PC76 Compressor" enabled={enabled} onToggle={() => setEnabled(!enabled)} color="#3b82f6">
      {/* Gain Reduction Meter */}
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
        <TooltipWrapper content="컴프레서가 작동하기 시작하는 레벨입니다. 신호가 이 레벨을 초과하면 압축이 적용됩니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Threshold</span>
            <span className="text-foreground">{threshold}dB</span>
          </div>
          <Slider
            value={[threshold]}
            onValueChange={([v]) => setThreshold(v)}
            min={-60}
            max={0}
            step={1}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="압축 비율입니다. 4:1 = 입력이 4dB 증가할 때 출력은 1dB만 증가합니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Ratio</span>
            <span className="text-foreground">{ratio}:1</span>
          </div>
          <Slider
            value={[ratio]}
            onValueChange={([v]) => setRatio(v)}
            min={1}
            max={20}
            step={0.5}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="컴프레서가 반응하는 속도입니다. 짧으면 빠른 트랜지언트를 잡고, 길면 펀치감을 유지합니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Attack</span>
            <span className="text-foreground">{attack}ms</span>
          </div>
          <Slider
            value={[attack]}
            onValueChange={([v]) => setAttack(v)}
            min={0.1}
            max={100}
            step={0.1}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="압축이 해제되는 속도입니다. 너무 짧으면 펌핑 현상이 발생할 수 있습니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Release</span>
            <span className="text-foreground">{release}ms</span>
          </div>
          <Slider
            value={[release]}
            onValueChange={([v]) => setRelease(v)}
            min={10}
            max={1000}
            step={10}
          />
        </div>
        </TooltipWrapper>
      </div>

      <TooltipWrapper content="압축으로 줄어든 음량을 보상합니다. 압축 후 전체 레벨을 올리는 데 사용합니다.">
      <div className="mt-3 space-y-1">
        <div className="flex justify-between text-[10px]">
          <span className="text-muted-foreground">Makeup Gain</span>
          <span className="text-foreground">{makeup > 0 ? "+" : ""}{makeup}dB</span>
        </div>
        <Slider
          value={[makeup]}
          onValueChange={([v]) => setMakeup(v)}
          min={0}
          max={24}
          step={0.5}
        />
      </div>
      </TooltipWrapper>
    </Module>
  );
}

/**
 * 테이프 새츄레이션 모듈 - ProChannelEngine과 실시간 연동
 * 따뜻한 아날로그 테이프 특성 시뮬레이션
 */
function TapeSaturationModule() {
  const [enabled, setEnabled] = useState(true);
  const [drive, setDrive] = useState(30);
  const [warmth, setWarmth] = useState(50);
  const [tapeSpeed, setTapeSpeed] = useState("15");

  // ProChannelEngine에 테이프 새츄레이션 설정 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.setSaturation(drive, 'tape');
    } catch (e) {
      console.warn('Tape Saturation 엔진 연결 실패:', e);
    }
  }, [drive]);

  // 모듈 바이패스 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('saturation', !enabled);
    } catch (e) {
      console.warn('Tape Saturation 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  return (
    <Module title="Tape Emulator" enabled={enabled} onToggle={() => setEnabled(!enabled)} color="#eab308">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Speed</span>
        <Select value={tapeSpeed} onValueChange={setTapeSpeed}>
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
        <TooltipWrapper content="테이프 새췤레이션 양입니다. 높을수록 따뜻하고 아날로그적인 왔곡이 추가됩니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider
            value={[drive]}
            onValueChange={([v]) => setDrive(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="테이프의 고역 롤오프와 저역 부스트 정도입니다. 빈티지한 톤을 만듭니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Warmth</span>
            <span className="text-foreground">{warmth}%</span>
          </div>
          <Slider
            value={[warmth]}
            onValueChange={([v]) => setWarmth(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
        </TooltipWrapper>
      </div>
    </Module>
  );
}

/**
 * 콘솔 새츄레이션 모듈 - ProChannelEngine과 실시간 연동
 * SSL/Neve/API 콘솔 특성 시뮬레이션
 */
function ConsoleSaturationModule() {
  const [enabled, setEnabled] = useState(true);
  const [input, setInput] = useState(0);
  const [drive, setDrive] = useState(40);
  const [type, setType] = useState("ssl");

  // ProChannelEngine에 콘솔 새츄레이션 설정 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.setSaturation(drive, 'console');
    } catch (e) {
      console.warn('Console Saturation 엔진 연결 실패:', e);
    }
  }, [drive]);

  // 모듈 바이패스 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('saturation', !enabled);
    } catch (e) {
      console.warn('Console Saturation 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  return (
    <Module title="Console Emulator" enabled={enabled} onToggle={() => setEnabled(!enabled)} color="#22c55e">
      <TooltipWrapper content="에뮬레이션할 콘솔 유형입니다. SSL=펀치, Neve=따뜻함, API=색감.">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-[10px] text-muted-foreground">Type</span>
        <Select value={type} onValueChange={setType}>
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
        <TooltipWrapper content="콘솔에 입력되는 신호 레벨입니다. 높일수록 더 많은 새췤레이션이 적용됩니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Input</span>
            <span className="text-foreground">{input > 0 ? "+" : ""}{input}dB</span>
          </div>
          <Slider
            value={[input]}
            onValueChange={([v]) => setInput(v)}
            min={-12}
            max={12}
            step={0.5}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="콘솔 새췤레이션 양입니다. 높을수록 더 품부한 사운드가 됩니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider
            value={[drive]}
            onValueChange={([v]) => setDrive(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
        </TooltipWrapper>
      </div>
    </Module>
  );
}

/**
 * 튜브 모듈 - ProChannelEngine과 실시간 연동
 * 진공관 특성의 따뜻한 왜곡 시뮬레이션
 */
function TubeModule() {
  const [enabled, setEnabled] = useState(false);
  const [drive, setDrive] = useState(25);
  const [lowCut, setLowCut] = useState(false);

  // ProChannelEngine에 튜브 설정 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.setTube(drive);
    } catch (e) {
      console.warn('Tube 엔진 연결 실패:', e);
    }
  }, [drive]);

  // 모듈 바이패스 동기화
  useEffect(() => {
    try {
      const engine = getProChannelEngine();
      engine.bypass('tube', !enabled);
    } catch (e) {
      console.warn('Tube 바이패스 설정 실패:', e);
    }
  }, [enabled]);

  return (
    <Module title="Tube Saturation" enabled={enabled} onToggle={() => setEnabled(!enabled)} color="#a855f7">
      <div className="space-y-3">
        <TooltipWrapper content="진공관 드라이브 양입니다. 높을수록 풍부한 하모닉스와 따뜻한 왜곡이 추가됩니다.">
        <div className="space-y-1">
          <div className="flex justify-between text-[10px]">
            <span className="text-muted-foreground">Drive</span>
            <span className="text-foreground">{drive}%</span>
          </div>
          <Slider
            value={[drive]}
            onValueChange={([v]) => setDrive(v)}
            min={0}
            max={100}
            step={1}
          />
        </div>
        </TooltipWrapper>
        <TooltipWrapper content="저음역을 차단합니다. 튜브 왜곡이 저음을 흐리게 만들 때 유용합니다.">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Low Cut</span>
          <Switch checked={lowCut} onCheckedChange={setLowCut} />
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
