"use client";

import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TooltipWrapper, TooltipProvider } from "@/components/ui/tooltip";
import { Volume2, VolumeX, Download, Play, Pause } from "lucide-react";

/**
 * 개별 스템 트랙 Props
 */
interface StemTrackProps {
  name: string;           // 스템 이름 (예: "Drums", "Bass")
  color: string;          // 트랙 색상
  audioUrl?: string;      // 오디오 파일 URL
  audioBuffer?: AudioBuffer; // 오디오 버퍼 (직접 전달 시)
  isSolo: boolean;        // Solo 활성화 상태
  isMuted: boolean;       // Mute 활성화 상태
  volume: number;         // 볼륨 (0-1)
  onVolumeChange: (volume: number) => void;
  onSoloToggle: () => void;
  onMuteToggle: () => void;
  onExport: () => void;
  isPlaying: boolean;     // 재생 중 여부
  onPlayToggle: () => void;
}

/**
 * 스템 타입에 따른 한국어 설명
 */
const stemDescriptions: Record<string, { name: string; description: string }> = {
  drums: {
    name: "드럼",
    description: "킥, 스네어, 하이햇, 탐 등 모든 퍼커션 요소"
  },
  bass: {
    name: "베이스",
    description: "베이스 기타, 신스 베이스 등 저음역 요소"
  },
  vocals: {
    name: "보컬",
    description: "메인 보컬, 코러스, 랩 등 목소리 요소"
  },
  instruments: {
    name: "악기",
    description: "기타, 피아노, 신스, 스트링 등 멜로디 악기"
  }
};

/**
 * 개별 스템 트랙 컴포넌트
 * 웨이브폼 시각화, 볼륨 조절, Solo/Mute, Export 기능 제공
 */
export function StemTrack({
  name,
  color,
  audioUrl,
  audioBuffer,
  isSolo,
  isMuted,
  volume,
  onVolumeChange,
  onSoloToggle,
  onMuteToggle,
  onExport,
  isPlaying,
  onPlayToggle,
}: StemTrackProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [waveformData, setWaveformData] = useState<number[]>([]);

  // 스템 ID 추출 (예: "Track_Drums" -> "drums")
  const stemId = name.toLowerCase().includes("drums") ? "drums" :
                 name.toLowerCase().includes("bass") ? "bass" :
                 name.toLowerCase().includes("vocal") ? "vocals" :
                 name.toLowerCase().includes("instrument") ? "instruments" : "instruments";
  
  const stemInfo = stemDescriptions[stemId] || { name: "트랙", description: "" };

  /**
   * 웨이브폼 데이터 생성 (Mock 또는 실제 AudioBuffer에서 추출)
   */
  useEffect(() => {
    // 실제 AudioBuffer가 있으면 사용, 없으면 Mock 데이터 생성
    if (audioBuffer) {
      const channelData = audioBuffer.getChannelData(0);
      const points = 200;
      const blockSize = Math.floor(channelData.length / points);
      const data: number[] = [];
      
      for (let i = 0; i < points; i++) {
        let sum = 0;
        for (let j = 0; j < blockSize; j++) {
          sum += Math.abs(channelData[i * blockSize + j]);
        }
        data.push(sum / blockSize);
      }
      setWaveformData(data);
    } else {
      // Mock 웨이브폼 데이터 생성
      const generateMockWaveform = () => {
        const points = 200;
        const data: number[] = [];
        
        // 스템 타입에 따라 다른 패턴 생성
        for (let i = 0; i < points; i++) {
          let value: number;
          
          if (stemId === "drums") {
            // 드럼: 날카로운 피크와 급격한 감쇠
            value = Math.abs(Math.sin(i * 0.15)) * 0.7 + Math.random() * 0.3;
            if (i % 20 < 3) value *= 1.5; // 킥 강조
          } else if (stemId === "bass") {
            // 베이스: 부드러운 저주파 패턴
            value = Math.abs(Math.sin(i * 0.05)) * 0.6 + Math.random() * 0.2;
          } else if (stemId === "vocals") {
            // 보컬: 불규칙한 인간 음성 패턴
            const phrase = Math.sin(i * 0.03) * 0.4;
            const vibrato = Math.sin(i * 0.5) * 0.1;
            value = Math.abs(phrase + vibrato) + Math.random() * 0.15;
          } else {
            // 악기: 멜로디컬한 패턴
            const melody = Math.sin(i * 0.08) * 0.4;
            const harmony = Math.sin(i * 0.12) * 0.2;
            value = Math.abs(melody + harmony) + Math.random() * 0.2;
          }
          
          data.push(Math.min(value, 1));
        }
        return data;
      };
      
      setWaveformData(generateMockWaveform());
    }
  }, [audioUrl, audioBuffer, stemId]);

  /**
   * 웨이브폼 캔버스 렌더링
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || waveformData.length === 0) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const barWidth = width / waveformData.length;
    const centerY = height / 2;

    // 캔버스 클리어
    ctx.clearRect(0, 0, width, height);

    // 배경 그라데이션
    const bgGradient = ctx.createLinearGradient(0, 0, width, 0);
    bgGradient.addColorStop(0, "#1a1a1a");
    bgGradient.addColorStop(1, "#252525");
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);

    // 웨이브폼 색상 (Mute 시 회색)
    const waveColor = isMuted ? "#666" : color;
    
    // 웨이브폼 그라데이션
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, waveColor);
    gradient.addColorStop(0.5, waveColor + "CC");
    gradient.addColorStop(1, waveColor);

    ctx.fillStyle = gradient;

    // 웨이브폼 그리기 (미러링 효과)
    waveformData.forEach((value, index) => {
      const barHeight = value * height * 0.8;
      const x = index * barWidth;
      const y = centerY - barHeight / 2;

      ctx.fillRect(x, y, barWidth - 0.5, barHeight);
    });

    // 중앙 라인
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [waveformData, color, isMuted]);

  return (
    <TooltipProvider>
      <div
        className="flex items-center gap-3 p-3 rounded-lg bg-[#1e1e1e] border border-[#3a3a3a] transition-all hover:bg-[#252525]"
        style={{ borderLeftColor: color, borderLeftWidth: 4 }}
      >
        {/* 트랙 정보 */}
        <div className="flex flex-col min-w-[100px]">
          <span className="text-sm font-medium text-white">{name}</span>
          <span className="text-xs text-gray-500">{stemInfo.name}</span>
          <div className="flex gap-1 mt-1">
            {/* Solo 버튼 */}
            <TooltipWrapper
              content={`솔로 모드 ${isSolo ? '해제' : '활성화'}\n\n이 트랙만 들립니다.\n다른 모든 트랙은 자동으로 음소거됩니다.\n\n${stemInfo.description}`}
            >
              <Button
                size="sm"
                variant={isSolo ? "default" : "outline"}
                onClick={onSoloToggle}
                className={`h-6 w-6 p-0 text-xs ${
                  isSolo
                    ? "bg-yellow-500 hover:bg-yellow-600 text-black"
                    : "bg-transparent border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                S
              </Button>
            </TooltipWrapper>
            
            {/* Mute 버튼 */}
            <TooltipWrapper
              content={`음소거 ${isMuted ? '해제' : '활성화'}\n\n이 트랙의 소리를 끕니다.\n다른 트랙에는 영향을 주지 않습니다.`}
            >
              <Button
                size="sm"
                variant={isMuted ? "default" : "outline"}
                onClick={onMuteToggle}
                className={`h-6 w-6 p-0 text-xs ${
                  isMuted
                    ? "bg-red-500 hover:bg-red-600 text-white"
                    : "bg-transparent border-gray-600 text-gray-400 hover:bg-gray-700"
                }`}
              >
                M
              </Button>
            </TooltipWrapper>
          </div>
        </div>

        {/* 재생/일시정지 버튼 */}
        <TooltipWrapper
          content={`${isPlaying ? '일시정지' : '재생'}\n\n이 스템만 개별적으로 재생합니다.\n볼륨과 Mute/Solo 설정이 적용됩니다.`}
          shortcut="Space"
        >
          <Button
            size="sm"
            variant="ghost"
            onClick={onPlayToggle}
            className="h-8 w-8 p-0 text-gray-300 hover:text-white hover:bg-gray-700"
          >
            {isPlaying ? (
              <Pause className="h-4 w-4" />
            ) : (
              <Play className="h-4 w-4" />
            )}
          </Button>
        </TooltipWrapper>

        {/* 웨이브폼 캔버스 */}
        <div className="flex-1 bg-[#2a2a2a] rounded overflow-hidden">
          <canvas
            ref={canvasRef}
            width={400}
            height={50}
            className="w-full h-[50px]"
          />
        </div>

        {/* 볼륨 슬라이더 */}
        <div className="flex items-center gap-2 min-w-[140px]">
          <TooltipWrapper
            content={volume > 0 ? "볼륨 켜짐\n\n클릭하여 음소거" : "볼륨 꺼짐\n\n클릭하여 음소거 해제"}
          >
            <button onClick={onMuteToggle} className="p-1 hover:bg-gray-700 rounded">
              {volume > 0 && !isMuted ? (
                <Volume2 className="h-4 w-4 text-gray-400" />
              ) : (
                <VolumeX className="h-4 w-4 text-gray-400" />
              )}
            </button>
          </TooltipWrapper>
          
          <TooltipWrapper
            content={`볼륨: ${Math.round(volume * 100)}%\n\n드래그하여 볼륨을 조절합니다.\n0%: 무음, 100%: 최대 볼륨`}
          >
            <div className="w-20">
              <Slider
                value={[volume * 100]}
                onValueChange={(values) => onVolumeChange(values[0] / 100)}
                max={100}
                step={1}
              />
            </div>
          </TooltipWrapper>
          
          <span className="text-xs text-gray-400 w-10 text-right">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Export 버튼 */}
        <TooltipWrapper
          content={`${stemInfo.name} 스템 내보내기\n\n이 스템을 별도의 WAV 파일로 저장합니다.\n현재 볼륨 설정은 적용되지 않습니다.`}
        >
          <Button
            size="sm"
            variant="outline"
            onClick={onExport}
            className="h-8 bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </TooltipWrapper>
      </div>
    </TooltipProvider>
  );
}

export default StemTrack;

