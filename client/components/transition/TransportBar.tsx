"use client";

import React from "react";
import type { DeckState } from "./TransitionPanel";
import { TooltipWrapper } from "@/components/ui/tooltip";

interface TransportBarProps {
  deckA: DeckState;
  deckB: DeckState;
  viewMode: "waves" | "stems";
  crossfader: number; // 0-100
  onCrossfaderChange: (value: number) => void;
  onDeckAChange: React.Dispatch<React.SetStateAction<DeckState>>;
  onDeckBChange: React.Dispatch<React.SetStateAction<DeckState>>;
  onStemMute: (side: "A" | "B", stem: "drum" | "bass" | "melody" | "vocal") => void;
}

/**
 * Transport 바 컴포넌트
 * CUE 버튼, LOOP 컨트롤, EQ Kill, 크로스페이더
 */
export function TransportBar({
  deckA,
  deckB,
  viewMode,
  crossfader,
  onCrossfaderChange,
  onDeckAChange,
  onDeckBChange,
  onStemMute,
}: TransportBarProps) {
  /**
   * CUE 버튼 스타일
   */
  const getCueButtonStyle = (active: boolean) =>
    `w-6 h-6 rounded flex items-center justify-center text-[10px] font-medium transition-all ${
      active
        ? "bg-orange-500 text-white"
        : "bg-[#2a2a3f] text-gray-400 hover:bg-[#3a3a4f]"
    }`;

  /**
   * EQ Kill 버튼
   */
  const EQKillButton = ({
    label,
    active,
    color,
    onClick,
    tooltip,
    shortcut,
  }: {
    label: string;
    active: boolean;
    color: string;
    onClick: () => void;
    tooltip: string;
    shortcut?: string;
  }) => (
    <TooltipWrapper content={tooltip} shortcut={shortcut}>
      <button
        onClick={onClick}
        className={`px-2 py-1 rounded text-[9px] uppercase tracking-wider transition-all ${
          active ? `bg-${color}-500 text-white` : "bg-[#2a2a3f] text-gray-400 hover:bg-[#3a3a4f]"
        }`}
        style={active ? { backgroundColor: color } : {}}
      >
        {label}
      </button>
    </TooltipWrapper>
  );

  /**
   * EQ 노브 렌더링
   */
  const EQKnob = ({
    value,
    onChange,
    label,
    color = "#8b5cf6",
    tooltip,
  }: {
    value: number;
    onChange: (v: number) => void;
    label: string;
    color?: string;
    tooltip: string;
  }) => {
    const rotation = ((value - 50) / 50) * 135; // -135도 ~ +135도

    return (
      <TooltipWrapper content={tooltip}>
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="w-7 h-7 rounded-full border-2 bg-[#1a1a2e] relative cursor-pointer"
            style={{ borderColor: color }}
            onClick={() => onChange(50)} // 클릭시 중앙으로 리셋
          >
            <div
              className="absolute w-0.5 h-2.5 bg-white left-1/2 -translate-x-1/2 rounded-full origin-bottom"
              style={{
                transform: `translateX(-50%) rotate(${rotation}deg)`,
                bottom: "50%",
              }}
            />
          </div>
          <span className="text-[8px] text-gray-500 uppercase">{label}</span>
        </div>
      </TooltipWrapper>
    );
  };

  return (
    <div className="flex items-center justify-between px-3 py-2 bg-[#16162a] border-t border-[#2a2a3f]">
      {/* Deck A 컨트롤 */}
      <div className="flex items-center gap-3">
        {/* 재생/정지 버튼 */}
        <div className="flex items-center gap-1">
          <TooltipWrapper content="Deck A 정지. 재생을 멈추고 현재 위치에서 대기합니다." shortcut="Shift+Q">
            <button
              onClick={() => onDeckAChange(prev => ({ ...prev, isPlaying: false }))}
              className="w-6 h-6 bg-[#2a2a3f] rounded flex items-center justify-center hover:bg-[#3a3a4f]"
            >
              <span className="w-2 h-2 bg-white" />
            </button>
          </TooltipWrapper>
          <TooltipWrapper content="Deck A 재생/일시정지. 트랙을 재생하거나 일시정지합니다." shortcut="Q">
            <button
              onClick={() => onDeckAChange(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
              className="w-6 h-6 bg-[#2a2a3f] rounded flex items-center justify-center hover:bg-[#3a3a4f]"
            >
              {deckA.isPlaying ? (
                <span className="w-2.5 h-2.5 border-l-4 border-l-white border-y-[5px] border-y-transparent" />
              ) : (
                <span className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent" />
              )}
            </button>
          </TooltipWrapper>
        </div>

        {/* CUE 버튼 (1-4) */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-gray-500 mr-1">CUE</span>
          {[1, 2, 3, 4].map((num) => (
            <TooltipWrapper 
              key={num}
              content={`Hot Cue ${num}. 클릭하여 해당 위치로 즉시 이동합니다. Shift+클릭으로 현재 위치에 새 Cue를 설정합니다.`}
              shortcut={String(num)}
            >
              <button
                onClick={() => {
                  onDeckAChange((prev) => {
                    const newCues = [...prev.cuePoints];
                    newCues[num - 1] = prev.currentTime;
                    return { ...prev, cuePoints: newCues };
                  });
                }}
                className={getCueButtonStyle(deckA.cuePoints[num - 1] !== null)}
              >
                {num}
              </button>
            </TooltipWrapper>
          ))}
        </div>

        {/* LOOP */}
        <TooltipWrapper 
          content={`현재 루프 길이: ${deckA.loopBars}바. 클릭하여 루프를 켜고/끕니다. 활성화되면 해당 구간이 반복됩니다.`}
          shortcut="R"
        >
          <div className="flex items-center gap-1 cursor-pointer">
            <span className="text-[9px] text-gray-500">LOOP</span>
            <span className="bg-[#2a2a3f] px-1.5 py-0.5 rounded text-[10px] text-white">
              {deckA.loopBars}
            </span>
          </div>
        </TooltipWrapper>

        {/* EQ Kill 버튼 */}
        <div className="flex items-center gap-1 ml-2">
          {viewMode === "waves" ? (
            <>
              <EQKillButton
                label="LOW"
                active={deckA.eqLowKill}
                color="#f43f5e"
                onClick={() => onDeckAChange(prev => ({ ...prev, eqLowKill: !prev.eqLowKill }))}
                tooltip="저음역(Bass)을 뮤트합니다. 다시 클릭하면 복원됩니다. 베이스라인을 제거하여 믹스 충돌을 방지합니다."
                shortcut="Ctrl+C"
              />
              <EQKillButton
                label="MID"
                active={deckA.eqMidKill}
                color="#22c55e"
                onClick={() => onDeckAChange(prev => ({ ...prev, eqMidKill: !prev.eqMidKill }))}
                tooltip="중음역(Mid)을 뮤트합니다. 보컬과 주요 멜로디가 이 대역에 있습니다. EQ 스웹 효과에 유용합니다."
                shortcut="Ctrl+D"
              />
              <EQKillButton
                label="HIGH"
                active={deckA.eqHighKill}
                color="#3b82f6"
                onClick={() => onDeckAChange(prev => ({ ...prev, eqHighKill: !prev.eqHighKill }))}
                tooltip="고음역(High)을 뮤트합니다. 하이햇, 심벌 등이 제거됩니다."
                shortcut="Ctrl+E"
              />
            </>
          ) : (
            <>
              <EQKillButton
                label="DRUM"
                active={deckA.stemMutes.drum}
                color="#9B59B6"
                onClick={() => onStemMute("A", "drum")}
                tooltip="드럼 스템을 뮤트합니다. 킥과 스네어/하이햇이 함께 뮤트됩니다. 아카펠라 믹스에 유용합니다."
              />
              <EQKillButton
                label="BASS"
                active={deckA.stemMutes.bass}
                color="#FF0000"
                onClick={() => onStemMute("A", "bass")}
                tooltip="베이스 스템을 뮤트합니다. 저음역 악기만 선택적으로 제거하여 베이스라인 충돌을 방지합니다."
              />
              <EQKillButton
                label="MEL"
                active={deckA.stemMutes.melody}
                color="#FFA500"
                onClick={() => onStemMute("A", "melody")}
                tooltip="멜로디 스템을 뮤트합니다. 신디사이저, 기타, 피아노 등의 악기가 제거됩니다."
              />
              <EQKillButton
                label="VOC"
                active={deckA.stemMutes.vocal}
                color="#00FF00"
                onClick={() => onStemMute("A", "vocal")}
                tooltip="보컬 스템을 뮤트합니다. 인스트루멘탈 믹스를 만들거나 다른 곡의 보컬과 매시업할 수 있습니다."
              />
            </>
          )}
        </div>

        {/* EQ 노브 */}
        <div className="flex items-center gap-1 ml-2">
          <EQKnob
            value={deckA.eqLow}
            onChange={(v) => onDeckAChange(prev => ({ ...prev, eqLow: v }))}
            label=""
            color="#f43f5e"
            tooltip="저음역 EQ 노브. 0-100 범위로 저음의 세기를 조절합니다. 클릭하면 중앙(50)으로 리셋됩니다."
          />
          <EQKnob
            value={deckA.eqMid}
            onChange={(v) => onDeckAChange(prev => ({ ...prev, eqMid: v }))}
            label=""
            color="#22c55e"
            tooltip="중음역 EQ 노브. 0-100 범위로 중음의 세기를 조절합니다. 보컬과 멜로디에 영향을 줍니다."
          />
          <EQKnob
            value={deckA.eqHigh}
            onChange={(v) => onDeckAChange(prev => ({ ...prev, eqHigh: v }))}
            label=""
            color="#3b82f6"
            tooltip="고음역 EQ 노브. 0-100 범위로 고음의 세기를 조절합니다. 하이햇과 심벌에 영향을 줍니다."
          />
        </div>
      </div>

      {/* 크로스페이더 (중앙) */}
      <TooltipWrapper content="크로스페이더. 두 덱 간 음량 밸런스를 조절합니다. 왼쪽=Deck A, 오른쪽=Deck B. 드래그하여 부드러운 트랜지션을 만드세요." shortcut="G/H">
        <div className="flex-1 max-w-md mx-4">
          <div className="relative h-6 bg-[#1a1a2e] rounded-full overflow-hidden">
            {/* 트랙 */}
            <div className="absolute inset-0 flex items-center">
              <div className="w-full h-1 bg-[#2a2a3f] rounded-full relative">
                {/* 핸들 */}
                <div
                  className="absolute w-10 h-5 bg-gradient-to-b from-gray-200 to-gray-400 rounded-full -top-2 cursor-pointer shadow-lg"
                  style={{
                    left: `calc(${crossfader}% - 20px)`,
                    transition: "left 50ms",
                  }}
                />
              </div>
            </div>
            {/* 입력 */}
            <input
              type="range"
              min={0}
              max={100}
              value={crossfader}
              onChange={(e) => onCrossfaderChange(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
          </div>
        </div>
      </TooltipWrapper>

      {/* Deck B 컨트롤 */}
      <div className="flex items-center gap-3">
        {/* EQ 노브 */}
        <div className="flex items-center gap-1 mr-2">
          <EQKnob
            value={deckB.eqLow}
            onChange={(v) => onDeckBChange(prev => ({ ...prev, eqLow: v }))}
            label=""
            color="#f43f5e"
            tooltip="Deck B 저음역 EQ 노브. 0-100 범위로 저음의 세기를 조절합니다."
          />
          <EQKnob
            value={deckB.eqMid}
            onChange={(v) => onDeckBChange(prev => ({ ...prev, eqMid: v }))}
            label=""
            color="#22c55e"
            tooltip="Deck B 중음역 EQ 노브. 보컬과 멜로디에 영향을 줍니다."
          />
          <EQKnob
            value={deckB.eqHigh}
            onChange={(v) => onDeckBChange(prev => ({ ...prev, eqHigh: v }))}
            label=""
            color="#3b82f6"
            tooltip="Deck B 고음역 EQ 노브. 하이햇과 심벌에 영향을 줍니다."
          />
        </div>

        {/* EQ Kill 버튼 */}
        <div className="flex items-center gap-1 mr-2">
          {viewMode === "waves" ? (
            <>
              <EQKillButton
                label="LOW"
                active={deckB.eqLowKill}
                color="#f43f5e"
                onClick={() => onDeckBChange(prev => ({ ...prev, eqLowKill: !prev.eqLowKill }))}
                tooltip="Deck B 저음역(Bass)을 뮤트합니다."
                shortcut="Ctrl+."
              />
              <EQKillButton
                label="MID"
                active={deckB.eqMidKill}
                color="#22c55e"
                onClick={() => onDeckBChange(prev => ({ ...prev, eqMidKill: !prev.eqMidKill }))}
                tooltip="Deck B 중음역(Mid)을 뮤트합니다."
                shortcut="Ctrl+L"
              />
              <EQKillButton
                label="HIGH"
                active={deckB.eqHighKill}
                color="#3b82f6"
                onClick={() => onDeckBChange(prev => ({ ...prev, eqHighKill: !prev.eqHighKill }))}
                tooltip="Deck B 고음역(High)을 뮤트합니다."
                shortcut="Ctrl+O"
              />
            </>
          ) : (
            <>
              <EQKillButton
                label="DRUM"
                active={deckB.stemMutes.drum}
                color="#9B59B6"
                onClick={() => onStemMute("B", "drum")}
                tooltip="Deck B 드럼 스템을 뮤트합니다."
              />
              <EQKillButton
                label="BASS"
                active={deckB.stemMutes.bass}
                color="#FF0000"
                onClick={() => onStemMute("B", "bass")}
                tooltip="Deck B 베이스 스템을 뮤트합니다."
              />
              <EQKillButton
                label="MEL"
                active={deckB.stemMutes.melody}
                color="#FFA500"
                onClick={() => onStemMute("B", "melody")}
                tooltip="Deck B 멜로디 스템을 뮤트합니다."
              />
              <EQKillButton
                label="VOC"
                active={deckB.stemMutes.vocal}
                color="#00FF00"
                onClick={() => onStemMute("B", "vocal")}
                tooltip="Deck B 보컬 스템을 뮤트합니다."
              />
            </>
          )}
        </div>

        {/* LOOP */}
        <TooltipWrapper 
          content={`Deck B 루프 길이: ${deckB.loopBars}바. 클릭하여 루프를 켜고/끕니다.`}
          shortcut="U"
        >
          <div className="flex items-center gap-1 cursor-pointer">
            <span className="text-[9px] text-gray-500">LOOP</span>
            <span className="bg-[#2a2a3f] px-1.5 py-0.5 rounded text-[10px] text-white">
              {deckB.loopBars}
            </span>
          </div>
        </TooltipWrapper>

        {/* CUE 버튼 (6-9) */}
        <div className="flex items-center gap-0.5">
          <span className="text-[9px] text-gray-500 mr-1">CUE</span>
          {[1, 2, 3, 4].map((num) => (
            <TooltipWrapper 
              key={num}
              content={`Hot Cue ${num + 5}. Deck B의 Cue 포인트입니다. 클릭하여 즉시 이동합니다.`}
              shortcut={String(num + 5)}
            >
              <button
                onClick={() => {
                  onDeckBChange((prev) => {
                    const newCues = [...prev.cuePoints];
                    newCues[num - 1] = prev.currentTime;
                    return { ...prev, cuePoints: newCues };
                  });
                }}
                className={getCueButtonStyle(deckB.cuePoints[num - 1] !== null)}
              >
                {num + 5}
              </button>
            </TooltipWrapper>
          ))}
        </div>

        {/* 재생/정지 버튼 */}
        <div className="flex items-center gap-1">
          <TooltipWrapper content="Deck B 재생/일시정지. 트랙을 재생하거나 일시정지합니다." shortcut="P">
            <button
              onClick={() => onDeckBChange(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
              className="w-6 h-6 bg-[#2a2a3f] rounded flex items-center justify-center hover:bg-[#3a3a4f]"
            >
              {deckB.isPlaying ? (
                <span className="w-2.5 h-2.5 border-l-4 border-l-white border-y-[5px] border-y-transparent" />
              ) : (
                <span className="w-0 h-0 border-l-[8px] border-l-white border-y-[5px] border-y-transparent" />
              )}
            </button>
          </TooltipWrapper>
          <TooltipWrapper content="Deck B 정지. 재생을 멈추고 현재 위치에서 대기합니다." shortcut="Shift+P">
            <button
              onClick={() => onDeckBChange(prev => ({ ...prev, isPlaying: false }))}
              className="w-6 h-6 bg-[#2a2a3f] rounded flex items-center justify-center hover:bg-[#3a3a4f]"
            >
              <span className="w-2 h-2 bg-white" />
            </button>
          </TooltipWrapper>
        </div>
      </div>
    </div>
  );
}

export default TransportBar;
