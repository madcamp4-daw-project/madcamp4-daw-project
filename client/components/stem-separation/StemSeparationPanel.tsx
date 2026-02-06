"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Play, Pause, Plus, Layers, Download, Volume2 } from "lucide-react";
import { StemDropZone } from "./StemDropZone";
import { StemExtractionDialog } from "./StemExtractionDialog";
import type { StemJobStatus } from "@/lib/api/stemSeparationClient";
import { getStemDownloadUrl } from "@/lib/api/stemSeparationClient";
import { useStemSeparationStore, type StemData } from "@/lib/stores/useStemSeparationStore";

// 스템 색상 정의
const stemColors: Record<string, string> = {
  drums: "#9B59B6",
  bass: "#E74C3C",
  vocals: "#2ECC71",
  other: "#F39C12",
};

// Simple waveform component using canvas
function WaveformCanvas({ audioUrl, color, isMuted }: { audioUrl?: string; color: string; isMuted: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  useEffect(() => {
    if (!audioUrl) return;

    const audioContext = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    
    fetch(audioUrl)
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        const rawData = audioBuffer.getChannelData(0);
        const samples = 200;
        const blockSize = Math.floor(rawData.length / samples);
        const filteredData: number[] = [];
        
        for (let i = 0; i < samples; i++) {
          let sum = 0;
          for (let j = 0; j < blockSize; j++) {
            sum += Math.abs(rawData[i * blockSize + j]);
          }
          filteredData.push(sum / blockSize);
        }
        
        // Normalize
        const maxVal = Math.max(...filteredData);
        const normalized = filteredData.map(v => v / maxVal);
        setWaveformData(normalized);
      })
      .catch(err => {
        console.error("Waveform load error:", err);
        // Fallback to random waveform
        const fallback = Array.from({ length: 200 }, () => Math.random() * 0.8 + 0.2);
        setWaveformData(fallback);
      });

    return () => {
      audioContext.close();
    };
  }, [audioUrl]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    ctx.clearRect(0, 0, width, height);
    
    // Background
    ctx.fillStyle = "#2a2a2a";
    ctx.fillRect(0, 0, width, height);

    // Waveform color
    const waveColor = isMuted ? "#666" : color;
    ctx.fillStyle = waveColor;

    // Draw bars (mirror effect)
    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = centerY - barHeight / 2;
      ctx.fillRect(x, y, barWidth - 0.5, barHeight);
    });

    // Center line
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [waveformData, color, isMuted]);

  return (
    <canvas
      ref={canvasRef}
      width={400}
      height={50}
      className="w-full h-[50px] rounded"
    />
  );
}

export function StemSeparationPanel(): React.ReactElement {
  // Zustand 스토어에서 상태 가져오기 (탭 전환 시에도 유지됨)
  const {
    originalFile,
    originalFileName,
    stems,
    isPlayingAll,
    isDialogOpen,
    setOriginalFile,
    setStems,
    setIsPlayingAll,
    setIsDialogOpen,
    togglePlayAll,
    toggleStemSolo,
    toggleStemMute,
    toggleStemPlay,
    setStemVolume,
    resetAll,
  } = useStemSeparationStore();

  const audioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  // 파일 선택 핸들러
  const handleFileSelect = useCallback((file: File): void => {
    setOriginalFile(file);
    setIsDialogOpen(true);
  }, [setOriginalFile, setIsDialogOpen]);

  const handleExtractComplete = useCallback(
    (extractedStems: NonNullable<NonNullable<StemJobStatus["result"]>["stems"]>): void => {
      if (!extractedStems || !originalFile) return;

      const baseName = originalFile.name.replace(/\.[^.]+$/, "");
      const newStems: StemData[] = [];

      // Demucs returns: drums, bass, vocals, other
      if (extractedStems.drums) {
        newStems.push({ id: "drums", name: `${baseName}_Drums`, color: stemColors.drums, audioUrl: getStemDownloadUrl(extractedStems.drums), volume: 1, isSolo: false, isMuted: false, isPlaying: false, waveformData: [] });
      }
      if (extractedStems.bass) {
        newStems.push({ id: "bass", name: `${baseName}_Bass`, color: stemColors.bass, audioUrl: getStemDownloadUrl(extractedStems.bass), volume: 1, isSolo: false, isMuted: false, isPlaying: false, waveformData: [] });
      }
      if (extractedStems.vocals) {
        newStems.push({ id: "vocals", name: `${baseName}_Vocals`, color: stemColors.vocals, audioUrl: getStemDownloadUrl(extractedStems.vocals), volume: 1, isSolo: false, isMuted: false, isPlaying: false, waveformData: [] });
      }
      // 'other' from demucs (or 'instruments' for backward compatibility)
      if (extractedStems.other) {
        newStems.push({ id: "other", name: `${baseName}_Other`, color: stemColors.other, audioUrl: getStemDownloadUrl(extractedStems.other), volume: 1, isSolo: false, isMuted: false, isPlaying: false, waveformData: [] });
      } else if (extractedStems.instruments) {
        newStems.push({ id: "other", name: `${baseName}_Other`, color: stemColors.other, audioUrl: getStemDownloadUrl(extractedStems.instruments), volume: 1, isSolo: false, isMuted: false, isPlaying: false, waveformData: [] });
      }

      setStems(newStems);
      setIsDialogOpen(false);
    },
    [originalFile]
  );

  // Initialize audio elements when stems change
  useEffect(() => {
    stems.forEach((stem: StemData) => {
      if (stem.audioUrl && !audioRefs.current.has(stem.id)) {
        const audio = new Audio(stem.audioUrl);
        audioRefs.current.set(stem.id, audio);
      }
    });

    return () => {
      audioRefs.current.forEach((audio: HTMLAudioElement) => audio.pause());
    };
  }, [stems]);

  // Update audio playback based on state
  useEffect(() => {
    const hasSolo = stems.some((s: StemData) => s.isSolo);

    stems.forEach((stem: StemData) => {
      const audio = audioRefs.current.get(stem.id);
      if (audio) {
        const shouldMute = stem.isMuted || (hasSolo && !stem.isSolo);
        audio.volume = shouldMute ? 0 : stem.volume;

        if (stem.isPlaying) {
          audio.play().catch(() => {});
        } else {
          audio.pause();
        }
      }
    });
  }, [stems]);

  // 전체 재생 토글 핸들러
  const handlePlayAllToggle = useCallback((): void => {
    const newState = !isPlayingAll;
    
    // Reset all tracks to beginning when playing
    if (newState) {
      audioRefs.current.forEach((audio: HTMLAudioElement) => {
        audio.currentTime = 0;
      });
    }
    
    // 스토어의 togglePlayAll 액션 사용
    togglePlayAll();
  }, [isPlayingAll, togglePlayAll]);

  // Solo 토글 핸들러 - 스토어 액션 사용
  const handleSoloToggle = useCallback((id: string): void => {
    toggleStemSolo(id);
  }, [toggleStemSolo]);

  // Mute 토글 핸들러 - 스토어 액션 사용
  const handleMuteToggle = useCallback((id: string): void => {
    toggleStemMute(id);
  }, [toggleStemMute]);

  // Play 토글 핸들러 - 스토어 액션 사용
  const handlePlayToggle = useCallback((id: string): void => {
    toggleStemPlay(id);
  }, [toggleStemPlay]);

  // 볼륨 변경 핸들러 - 스토어 액션 사용
  const handleVolumeChange = useCallback((id: string, volume: number): void => {
    setStemVolume(id, volume);
  }, [setStemVolume]);

  // 내보내기 핸들러
  const handleExport = useCallback((stem: StemData): void => {
    if (!stem.audioUrl) return;
    const link = document.createElement("a");
    link.href = stem.audioUrl;
    link.download = `${stem.name}.wav`;
    link.click();
  }, []);

  // 새 추출 핸들러 - 스토어의 resetAll 사용
  const handleNewExtraction = useCallback((): void => {
    audioRefs.current.forEach((audio: HTMLAudioElement) => audio.pause());
    audioRefs.current.clear();
    resetAll();
  }, [resetAll]);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Stem Separation</h2>
        </div>
        {stems.length > 0 && (
          <Button size="sm" variant="outline" onClick={handleNewExtraction} className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700">
            <Plus className="w-4 h-4 mr-1" />
            새 파일
          </Button>
        )}
      </div>

      {/* Content */}
      {stems.length === 0 ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <StemDropZone onFileSelect={handleFileSelect} />
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col space-y-3 overflow-y-auto">
          {/* File Info */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#252525] rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">원본:</span>
              <span className="text-white font-medium">{originalFile?.name}</span>
            </div>
            <Button size="sm" variant="ghost" onClick={handleNewExtraction} className="text-gray-400 hover:text-white">
              변경
            </Button>
          </div>

          {/* Stem Tracks */}
          <div className="space-y-2">
            {stems.map((stem: StemData) => (
              <div
                key={stem.id}
                className="flex items-center gap-3 p-3 rounded-lg bg-[#252525] border-l-4"
                style={{ borderLeftColor: stem.color }}
              >
                {/* Track Info + S/M buttons */}
                <div className="flex flex-col min-w-[140px]">
                  <span className="text-sm font-medium text-white truncate">{stem.name}</span>
                  <div className="flex gap-1 mt-1">
                    <Button
                      size="sm"
                      onClick={() => handleSoloToggle(stem.id)}
                      className={`h-6 w-6 p-0 text-xs ${stem.isSolo ? "bg-yellow-500 hover:bg-yellow-600 text-black" : "bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-700"}`}
                    >
                      S
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => handleMuteToggle(stem.id)}
                      className={`h-6 w-6 p-0 text-xs ${stem.isMuted ? "bg-red-500 hover:bg-red-600 text-white" : "bg-transparent border border-gray-600 text-gray-400 hover:bg-gray-700"}`}
                    >
                      M
                    </Button>
                  </div>
                </div>

                {/* Play Button */}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handlePlayToggle(stem.id)}
                  className="h-8 w-8 p-0"
                >
                  {stem.isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                {/* Real Waveform */}
                <div className="flex-1">
                  <WaveformCanvas
                    audioUrl={stem.audioUrl}
                    color={stem.color}
                    isMuted={stem.isMuted}
                  />
                </div>

                {/* Volume */}
                <div className="flex items-center gap-2 min-w-[120px]">
                  <Volume2 className="h-4 w-4 text-gray-400" />
                  <Slider
                    value={[stem.volume * 100]}
                    onValueChange={(val: number[]) => handleVolumeChange(stem.id, val[0] / 100)}
                    max={100}
                    step={1}
                    className="w-16"
                  />
                  <span className="text-xs text-gray-400 w-10 text-right">{Math.round(stem.volume * 100)}%</span>
                </div>

                {/* Export */}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExport(stem)}
                  className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Export
                </Button>
              </div>
            ))}
          </div>

          {/* Play All Button */}
          <div className="pt-2">
            <Button
              onClick={handlePlayAllToggle}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
            >
              {isPlayingAll ? <Pause className="w-5 h-5 mr-2" /> : <Play className="w-5 h-5 mr-2" />}
              Play All
            </Button>
          </div>
        </div>
      )}

      {/* Extraction Dialog */}
      <StemExtractionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onExtract={handleExtractComplete}
        fileName={originalFile?.name}
        audioFile={originalFile || undefined}
      />
    </div>
  );
}

export default StemSeparationPanel;
