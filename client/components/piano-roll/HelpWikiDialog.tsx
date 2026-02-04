"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Book, MousePointer2, Music, Pencil, Settings2, ChevronRight, ChevronLeft, Keyboard, Palette, Wand2 } from 'lucide-react';
import { Button } from "@/components/ui/button";

interface HelpWikiDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

// 가이드 카드 데이터 타입
interface GuideCard {
  id: string;
  title: string;
  icon: React.ReactNode;
  color: string;
  items: { key: string; desc: string }[];
}

// 기본 조작 가이드 데이터
const GUIDE_DATA: GuideCard[] = [
  {
    id: "mouse",
    title: "마우스 조작",
    icon: <MousePointer2 className="w-5 h-5" />,
    color: "orange",
    items: [
      { key: "좌클릭", desc: "노트 생성/선택 (Draw 모드)" },
      { key: "우클릭", desc: "노트 삭제" },
      { key: "드래그", desc: "노트 이동/길이 조절" },
      { key: "더블클릭", desc: "노트 속성 편집" },
    ]
  },
  {
    id: "scroll",
    title: "스크롤 & 줌",
    icon: <Settings2 className="w-5 h-5" />,
    color: "blue",
    items: [
      { key: "휠 스크롤", desc: "수직 스크롤 (건반 이동)" },
      { key: "Shift + 휠", desc: "수평 스크롤 (시간 이동)" },
      { key: "Ctrl + 휠", desc: "줌 인/아웃 (확대/축소)" },
      { key: "Spacebar", desc: "재생 / 정지" },
    ]
  },
  {
    id: "shortcuts",
    title: "단축키",
    icon: <Keyboard className="w-5 h-5" />,
    color: "green",
    items: [
      { key: "P", desc: "Draw Tool (연필)" },
      { key: "B", desc: "Paint Tool (붓)" },
      { key: "D", desc: "Delete Tool (지우개)" },
      { key: "E", desc: "Select Tool (선택)" },
      { key: "C", desc: "Slice Tool (자르기)" },
      { key: "T", desc: "Mute Tool (뮤트)" },
    ]
  },
];

// 도구 설명 데이터
const TOOL_DATA: GuideCard[] = [
  {
    id: "draw",
    title: "Draw (연필)",
    icon: <Pencil className="w-5 h-5" />,
    color: "orange",
    items: [
      { key: "기능", desc: "가장 기본적인 도구입니다" },
      { key: "사용법", desc: "클릭하여 노트를 찍고, 드래그하여 길이를 조절합니다" },
      { key: "팁", desc: "Shift를 누르면 수평 정렬됩니다" },
    ]
  },
  {
    id: "paint",
    title: "Paint (붓)",
    icon: <Palette className="w-5 h-5" />,
    color: "purple",
    items: [
      { key: "기능", desc: "연속으로 노트를 그립니다" },
      { key: "사용법", desc: "클릭하고 드래그하면 연속 노트 생성" },
      { key: "팁", desc: "하이햇이나 반복 패턴에 유용" },
    ]
  },
  {
    id: "stamp",
    title: "Stamp (스탬프)",
    icon: <Music className="w-5 h-5" />,
    color: "blue",
    items: [
      { key: "기능", desc: "복잡한 코드를 한 번에 찍습니다" },
      { key: "사용법", desc: "툴바에서 코드 선택 후 그리드 클릭" },
      { key: "팁", desc: "Cmaj7, Dm7 등 다양한 코드 지원" },
    ]
  },
  {
    id: "riff",
    title: "Riff Machine",
    icon: <Wand2 className="w-5 h-5" />,
    color: "green",
    items: [
      { key: "기능", desc: "자동으로 멜로디/아르페지오 생성" },
      { key: "사용법", desc: "'Tools' → 'Riff' 버튼 클릭" },
      { key: "팁", desc: "스케일과 옥타브 범위 설정 가능" },
    ]
  },
  {
    id: "slide",
    title: "Slide (슬라이드)",
    icon: <Settings2 className="w-5 h-5" />,
    color: "red",
    items: [
      { key: "기능", desc: "피치 벤드 효과를 생성합니다" },
      { key: "사용법", desc: "좌측 패널에서 Slide 토글 활성화 후 노트 생성" },
      { key: "특징", desc: "소리를 내지 않고 같은 색상 노트의 피치를 이동" },
      { key: "팁", desc: "겹쳐 있는 동안 피치가 서서히 변합니다" },
    ]
  },
];

export default function HelpWikiDialog({ isOpen, onClose }: HelpWikiDialogProps) {
  const [selectedCard, setSelectedCard] = useState<GuideCard | null>(null);

  // 색상 맵핑
  const getColorClasses = (color: string) => {
    const colors: Record<string, { bg: string; border: string; text: string }> = {
      orange: { bg: "bg-orange-500/20", border: "border-orange-500", text: "text-orange-400" },
      blue: { bg: "bg-blue-500/20", border: "border-blue-500", text: "text-blue-400" },
      green: { bg: "bg-green-500/20", border: "border-green-500", text: "text-green-400" },
      purple: { bg: "bg-purple-500/20", border: "border-purple-500", text: "text-purple-400" },
      red: { bg: "bg-red-500/20", border: "border-red-500", text: "text-red-400" },
    };
    return colors[color] || colors.orange;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-5xl h-[85vh] bg-zinc-900 border-zinc-700 text-zinc-300 p-0 overflow-hidden flex flex-col">
        <DialogHeader className="p-6 border-b border-zinc-800 bg-zinc-900 shrink-0">
          <div className="flex items-center gap-2">
            <Book className="w-6 h-6 text-orange-500" />
            <DialogTitle className="text-xl font-bold text-white">Piano Roll 사용 가이드</DialogTitle>
          </div>
          <DialogDescription className="text-zinc-500">
            FL Studio 스타일의 웹 시퀀서를 마스터하기 위한 상세 매뉴얼입니다. 카드를 클릭하여 자세히 보세요.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* 기본 조작 섹션 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <MousePointer2 className="w-5 h-5 text-orange-400" />
              기본 조작
            </h2>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-4 pb-4">
                {GUIDE_DATA.map((card) => {
                  const colors = getColorClasses(card.color);
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                      className={`
                        flex-shrink-0 w-[280px] p-4 rounded-xl border-2 cursor-pointer
                        transition-all duration-200 hover:scale-105 hover:shadow-lg
                        ${selectedCard?.id === card.id 
                          ? `${colors.bg} ${colors.border} shadow-lg` 
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <span className={colors.text}>{card.icon}</span>
                        </div>
                        <h3 className="font-bold text-white">{card.title}</h3>
                        <ChevronRight className={`w-4 h-4 ml-auto text-zinc-500 transition-transform ${selectedCard?.id === card.id ? "rotate-90" : ""}`} />
                      </div>
                      
                      <div className="space-y-2">
                        {card.items.slice(0, selectedCard?.id === card.id ? undefined : 2).map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`font-mono px-1.5 py-0.5 rounded ${colors.bg} ${colors.text} text-xs shrink-0`}>
                              {item.key}
                            </span>
                            <span className="text-zinc-400 whitespace-normal">{item.desc}</span>
                          </div>
                        ))}
                        {selectedCard?.id !== card.id && card.items.length > 2 && (
                          <p className="text-xs text-zinc-500 mt-2">+ {card.items.length - 2}개 더...</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>

          {/* 도구 설명 섹션 */}
          <section>
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-purple-400" />
              도구 설명
            </h2>
            <ScrollArea className="w-full whitespace-nowrap">
              <div className="flex gap-4 pb-4">
                {TOOL_DATA.map((card) => {
                  const colors = getColorClasses(card.color);
                  return (
                    <div
                      key={card.id}
                      onClick={() => setSelectedCard(selectedCard?.id === card.id ? null : card)}
                      className={`
                        flex-shrink-0 w-[300px] p-4 rounded-xl border-2 cursor-pointer
                        transition-all duration-200 hover:scale-105 hover:shadow-lg
                        ${selectedCard?.id === card.id 
                          ? `${colors.bg} ${colors.border} shadow-lg` 
                          : "bg-zinc-800/50 border-zinc-700 hover:border-zinc-600"
                        }
                      `}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${colors.bg}`}>
                          <span className={colors.text}>{card.icon}</span>
                        </div>
                        <h3 className="font-bold text-white">{card.title}</h3>
                        <ChevronRight className={`w-4 h-4 ml-auto text-zinc-500 transition-transform ${selectedCard?.id === card.id ? "rotate-90" : ""}`} />
                      </div>
                      
                      <div className="space-y-2">
                        {card.items.map((item, idx) => (
                          <div key={idx} className="flex items-start gap-2 text-sm">
                            <span className={`font-mono px-1.5 py-0.5 rounded bg-zinc-700 text-zinc-300 text-xs shrink-0`}>
                              {item.key}
                            </span>
                            <span className="text-zinc-400 whitespace-normal">{item.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
              <ScrollBar orientation="horizontal" />
            </ScrollArea>
          </section>

          {/* 고급 기능 안내 */}
          <section className="bg-zinc-800/30 rounded-xl p-6 border border-zinc-700">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Settings2 className="w-5 h-5 text-blue-400" />
              고급 기능 요약
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-zinc-800 rounded-lg border-l-4 border-orange-500">
                <h4 className="font-bold text-orange-400 mb-2">슬라이드 노트</h4>
                <p className="text-sm text-zinc-400">좌측 패널에서 Slide 토글 → 같은 색상 노트의 피치를 부드럽게 이동</p>
              </div>
              <div className="p-4 bg-zinc-800 rounded-lg border-l-4 border-blue-500">
                <h4 className="font-bold text-blue-400 mb-2">포르타멘토</h4>
                <p className="text-sm text-zinc-400">연속 음을 칠 때 이전 노트에서 부드럽게 글라이드</p>
              </div>
              <div className="p-4 bg-zinc-800 rounded-lg border-l-4 border-green-500">
                <h4 className="font-bold text-green-400 mb-2">컬러 그룹</h4>
                <p className="text-sm text-zinc-400">16개 MIDI 채널 색상 지원 → 화음 중 특정 음만 피치 벤드 가능</p>
              </div>
            </div>
          </section>

          {/* 악기 & 이펙트 */}
          <section className="bg-zinc-800/30 rounded-xl p-6 border border-zinc-700">
            <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Music className="w-5 h-5 text-green-400" />
              악기 및 이펙트
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { name: "Synth", desc: "기본 파형 신디사이저" },
                { name: "FMSynth", desc: "금속적/복잡한 소리" },
                { name: "MembraneSynth", desc: "드럼/타악기" },
                { name: "Sampler", desc: "실제 악기 샘플" },
              ].map((inst) => (
                <div key={inst.name} className="p-3 bg-zinc-800 rounded-lg">
                  <span className="font-bold text-orange-400 block">{inst.name}</span>
                  <span className="text-xs text-zinc-500">{inst.desc}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-zinc-500 mt-4">
              💡 <strong>Tip:</strong> Toolbar의 <strong>FX</strong> 버튼으로 Chorus, Delay, Phaser 등 이펙트를 연결하세요.
            </p>
          </section>

        </div>

        {/* 하단 닫기 버튼 */}
        <div className="p-4 border-t border-zinc-800 flex justify-end">
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
