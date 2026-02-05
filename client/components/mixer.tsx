"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { TooltipProvider, TooltipWrapper } from "@/components/ui/tooltip";
import type { Track } from "./track-list";
import { MixerEngine } from "@/lib/audio/MixerEngine";
import { Plus, X } from "lucide-react";
import useMixerStore from "@/lib/stores/useMixerStore";

interface MixerProps {
  tracks: Track[];
  onVolumeChange: (id: string | number, volume: number) => void;
  onPanChange: (id: string | number, pan: number) => void;
  onToggleMute: (id: string | number) => void;
  onToggleSolo: (id: string | number) => void;
  onAddTrack?: () => void;
  onRemoveTrack?: (id: string | number) => void;
}

/**
 * 믹서 컴포넌트 (MixerEngine 통합)
 * Tone.js 기반 실시간 오디오 믹싱
 */
export function Mixer({
  tracks,
  onVolumeChange,
  onPanChange,
  onToggleMute,
  onToggleSolo,
  onAddTrack,
  onRemoveTrack,
}: MixerProps) {
  const [selectedChannel, setSelectedChannel] = useState<string | number | null>(null);
  const [meterLevels, setMeterLevels] = useState<Record<string | number, number>>({});
  const engineRef = useRef<MixerEngine | null>(null);
  const animationRef = useRef<number>(0);

  // MixerEngine 초기화
  useEffect(() => {
    engineRef.current = new MixerEngine();
    return () => {
      engineRef.current?.dispose();
    };
  }, []);

  // 미터 레벨 업데이트 루프
  useEffect(() => {
    const updateMeters = () => {
      if (engineRef.current) {
        const levels: Record<string | number, number> = {};
        tracks.forEach((track) => {
          // 엔진에서 실제 레벨 가져오기 (트랙 ID → 엔진 트랙 매핑)
          const level = engineRef.current!.getMeterLevel(`track-${track.id}`);
          // 스테레오 레벨이면 평균값 사용
          if (level === null || level === undefined) {
            levels[track.id] = 0;
          } else if (typeof level === "number") {
            levels[track.id] = level;
          } else {
            // { left: number; right: number } 타입
            levels[track.id] = (level.left + level.right) / 2;
          }
        });
        setMeterLevels(levels);
      }
      animationRef.current = requestAnimationFrame(updateMeters);
    };
    animationRef.current = requestAnimationFrame(updateMeters);
    return () => cancelAnimationFrame(animationRef.current);
  }, [tracks]);

  // 볼륨 변경 핸들러 (엔진 연동)
  const handleVolumeChange = useCallback(
    (trackId: string | number, volume: number) => {
      engineRef.current?.setVolume(`track-${trackId}`, volume);
      onVolumeChange(trackId, volume);
    },
    [onVolumeChange]
  );

  // Pan 변경 핸들러 (엔진 연동)
  const handlePanChange = useCallback(
    (trackId: string | number, pan: number) => {
      engineRef.current?.setPan(`track-${trackId}`, pan);
      onPanChange(trackId, pan);
    },
    [onPanChange]
  );

  // Mute 토글 핸들러 (엔진 연동)
  const handleToggleMute = useCallback(
    (trackId: string | number) => {
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        engineRef.current?.setMute(`track-${trackId}`, !track.muted);
      }
      onToggleMute(trackId);
    },
    [tracks, onToggleMute]
  );

  // Solo 토글 핸들러 (엔진 연동)
  const handleToggleSolo = useCallback(
    (trackId: string | number) => {
      const track = tracks.find((t) => t.id === trackId);
      if (track) {
        engineRef.current?.setSolo(`track-${trackId}`, !track.solo);
      }
      onToggleSolo(trackId);
    },
    [tracks, onToggleSolo]
  );

  // 미터 레벨 가져오기
  const getMeterLevel = (trackId: string | number) => {
    return meterLevels[trackId] ?? 0;
  };

  return (
    <TooltipProvider>
    <div className="h-48 bg-[#1a1a1a] border-t border-border flex">
      {/* Channel Strips */}
      <div className="flex overflow-x-auto">
        {tracks.map((track) => {
          const meterLevel = getMeterLevel(track.id);
          const isSelected = selectedChannel === track.id;

          return (
            <div
              key={track.id}
              className={`w-24 flex-shrink-0 border-r border-border flex flex-col cursor-pointer ${
                isSelected ? "bg-secondary/50" : ""
              }`}
              onClick={() => setSelectedChannel(track.id)}
            >
              {/* FX / Sends */}
              <div className="h-8 border-b border-border flex items-center justify-between px-2">
                <span className="text-[10px] text-primary">Post</span>
                <TooltipWrapper content="이 트랙에 적용할 이펙트를 설정합니다. 볼륨 후 적용(Post) 모드로 동작합니다.">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-[10px] px-1 text-muted-foreground"
                >
                  FX
                </Button>
                </TooltipWrapper>
              </div>

              {/* Meter and Fader */}
              <div className="flex-1 flex items-center justify-center gap-2 px-2 py-2">
                {/* Meter */}
                <div className="w-3 h-full bg-[#0d0d0d] rounded relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-75"
                    style={{
                      height: `${meterLevel * 100}%`,
                      background:
                        meterLevel > 0.9
                          ? "linear-gradient(to top, #22c55e, #eab308, #ef4444)"
                          : meterLevel > 0.7
                            ? "linear-gradient(to top, #22c55e, #eab308)"
                            : "#22c55e",
                    }}
                  />
                  {/* Peak indicator */}
                  <div
                    className="absolute left-0 right-0 h-0.5 bg-red-500"
                    style={{ bottom: `${Math.min(95, meterLevel * 100 + 5)}%` }}
                  />
                </div>

                {/* Fader */}
                <div className="w-6 h-full relative">
                  <input
                    type="range"
                    min={-60}
                    max={6}
                    step={0.1}
                    value={track.volume}
                    onChange={(e) =>
                      onVolumeChange(track.id, Number(e.target.value))
                    }
                    className="absolute inset-0 w-full h-full appearance-none cursor-pointer"
                    style={{
                      writingMode: "vertical-lr",
                      direction: "rtl",
                      background: "transparent",
                    }}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="absolute inset-x-0 inset-y-2 bg-secondary rounded pointer-events-none">
                    <div
                      className="absolute bottom-0 left-0 right-0 bg-primary rounded-b"
                      style={{
                        height: `${((track.volume + 60) / 66) * 100}%`,
                      }}
                    />
                  </div>
                </div>

                {/* Second Meter */}
                <div className="w-3 h-full bg-[#0d0d0d] rounded relative overflow-hidden">
                  <div
                    className="absolute bottom-0 left-0 right-0 transition-all duration-75"
                    style={{
                      height: `${meterLevel * 0.9 * 100}%`,
                      background:
                        meterLevel > 0.8
                          ? "linear-gradient(to top, #22c55e, #eab308, #ef4444)"
                          : meterLevel > 0.6
                            ? "linear-gradient(to top, #22c55e, #eab308)"
                            : "#22c55e",
                    }}
                  />
                </div>
              </div>

              {/* Volume readout */}
              <div className="text-[10px] text-center text-muted-foreground font-mono py-1 border-t border-border">
                {track.volume.toFixed(1)} dB
              </div>

              {/* Controls */}
              <div className="flex items-center justify-center gap-1 py-1 border-t border-border">
                <TooltipWrapper content="Mute. 이 트랙을 뮤트합니다. 다시 클릭하면 소리가 복원됩니다.">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-5 w-5 p-0 text-[10px] ${
                    track.muted ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleMute(track.id);
                  }}
                >
                  M
                </Button>
                </TooltipWrapper>
                <TooltipWrapper content="Solo. 이 트랙만 들립니다. 다른 트랙은 자동으로 뮤트됩니다.">
                <Button
                  variant="ghost"
                  size="sm"
                  className={`h-5 w-5 p-0 text-[10px] ${
                    track.solo ? "bg-yellow-500 text-black" : "text-muted-foreground"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSolo(track.id);
                  }}
                >
                  S
                </Button>
                </TooltipWrapper>
              </div>

              {/* Channel Name */}
              <div
                className="h-6 flex items-center justify-between text-[10px] font-medium text-foreground truncate px-1"
                style={{ backgroundColor: `${track.color}33` }}
              >
                <span className="truncate flex-1">{track.name}</span>
                {/* 트랙 삭제 버튼 */}
                {onRemoveTrack && (
                  <TooltipWrapper content="이 트랙을 삭제합니다.">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemoveTrack(track.id);
                      }}
                      className="ml-1 p-0.5 rounded hover:bg-red-500/30 text-muted-foreground hover:text-red-400 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </TooltipWrapper>
                )}
              </div>
            </div>
          );
        })}

        {/* 트랙 추가 버튼 */}
        {onAddTrack && (
          <div className="w-16 flex-shrink-0 flex flex-col items-center justify-center border-r border-border">
            <TooltipWrapper content="새 트랙을 추가합니다.">
              <button
                onClick={onAddTrack}
                className="w-10 h-10 rounded-lg bg-[#252525] hover:bg-primary/20 border border-dashed border-border hover:border-primary transition-all flex items-center justify-center text-muted-foreground hover:text-primary"
              >
                <Plus className="w-5 h-5" />
              </button>
            </TooltipWrapper>
            <span className="text-[9px] text-muted-foreground mt-1">Add</span>
          </div>
        )}

        {/* Master Channel */}
        <div className="w-28 flex-shrink-0 bg-[#252525] flex flex-col">
          <div className="h-8 border-b border-border flex items-center justify-center">
            <span className="text-[10px] font-medium text-foreground">
              MASTER
            </span>
          </div>
          <div className="flex-1 flex items-center justify-center gap-2 px-3 py-2">
            <div className="w-4 h-full bg-[#0d0d0d] rounded relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500"
                style={{ height: "60%" }}
              />
            </div>
            <div className="w-8 h-full bg-secondary rounded relative">
              <div
                className="absolute bottom-0 left-0 right-0 bg-primary rounded-b"
                style={{ height: "70%" }}
              />
            </div>
            <div className="w-4 h-full bg-[#0d0d0d] rounded relative overflow-hidden">
              <div
                className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-green-500 via-yellow-500 to-red-500"
                style={{ height: "58%" }}
              />
            </div>
          </div>
          <div className="text-[10px] text-center text-muted-foreground font-mono py-1 border-t border-border">
            0.0 dB
          </div>
          <div className="flex items-center justify-center gap-1 py-1 border-t border-border">
            <Button
              variant="ghost"
              size="sm"
              className="h-5 w-5 p-0 text-[10px] text-muted-foreground"
            >
              M
            </Button>
          </div>
          <div className="h-6 flex items-center justify-center text-[10px] font-medium text-primary bg-primary/20">
            Master
          </div>
        </div>
      </div>
    </div>
    </TooltipProvider>
  );
}
