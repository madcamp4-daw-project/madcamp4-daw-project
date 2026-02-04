import React from 'react';
import { CustomTooltip } from "@/components/ui/tooltip-custom";
import { ToolType, Channel } from '@/lib/types/music';
import { ChordType, CHORD_INTERVALS } from '@/lib/constants/chords';
import { 
    Play, Square, Pencil, Paintbrush, Trash2, MousePointer2, Scissors, VolumeX, Stamp, 
    Music, Menu, Settings2, Magnet, Grid3X3, Wand2, BookOpen, Download, RotateCcw,
    Layers, Shuffle // Phase 4: Stem/Transition 아이콘 추가
} from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ToolbarProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  channels: Channel[];
  activeChannelId: string;
  setActiveChannelId: (id: string) => void;
  onPlay: () => void;
  onStop: () => void;
  onToggleEffects?: () => void;
  isEffectsOpen?: boolean;
  onInstrumentChange?: (type: string) => void;
  selectedChordType?: ChordType;
  onSelectChordType?: (type: ChordType) => void;
  onOpenRiffMachine?: () => void;
  onToggleLoop?: () => void;
  isLooping?: boolean;
  onOpenWiki?: () => void;
  onExportMidi?: () => void;
  onResetProject?: () => void;
  // Phase 4: Stem/Transition 연동
  onOpenStems?: () => void;
  onOpenTransition?: () => void;
  // Phase 5 Snap
  snapGrid?: number;
  onSnapGridChange?: (val: number) => void;
}

export default function Toolbar({ 
    activeTool, setActiveTool, channels, activeChannelId, setActiveChannelId,
    onPlay, onStop, onToggleEffects, isEffectsOpen, onInstrumentChange,
    selectedChordType, onSelectChordType, onOpenRiffMachine, onToggleLoop, isLooping,
    onOpenWiki, onExportMidi, onResetProject,
    // Phase 4: Stem/Transition 연동
    onOpenStems, onOpenTransition,
    // Phase 5 Snap
    snapGrid = 0.0625, onSnapGridChange
}: ToolbarProps) {
  
  const tools: { id: ToolType; icon: React.ElementType; label: string; desc: string; key: string }[] = [
    { id: 'draw', icon: Pencil, label: '그리기', desc: '노트를 그립니다. 클릭하여 단일 노트, 드래그하여 긴 노트를 생성합니다.', key: 'P' },
    { id: 'paint', icon: Paintbrush, label: '페인트', desc: '클릭하고 드래그하여 여러 노트를 연속으로 그립니다.', key: 'B' },
    { id: 'delete', icon: Trash2, label: '삭제 (D)', desc: '클릭하거나 드래그하여 노트를 삭제합니다.', key: 'D' },
    { id: 'select', icon: MousePointer2, label: '선택 (E)', desc: '박스 선택으로 여러 노트를 선택합니다.', key: 'E' },
    { id: 'slice', icon: Scissors, label: '자르기 (C)', desc: '클릭하고 드래그하여 노트를 분할합니다.', key: 'C' },
    { id: 'mute', icon: VolumeX, label: '뮤트 (T)', desc: '클릭하여 노트를 뮤트/뮤트 해제합니다.', key: 'T' },
    { id: 'stamp', icon: Stamp, label: '스탬프', desc: '한 번의 클릭으로 복잡한 코드를 배치합니다.', key: 'S' },
  ];
  
  const chordTypes = Object.keys(CHORD_INTERVALS) as ChordType[];

  return (
    <div className="h-14 bg-[#282b30] border-b border-[#1c1e22] flex items-center px-4 justify-between shrink-0 select-none shadow-md z-20">
        <div className="flex items-center space-x-4">
            {/* Main Menu (File/Edit etc replacement) */}
            <div className="flex items-center space-x-1 border-r border-zinc-700 pr-4 my-1">
                 <CustomTooltip title="메뉴" description="메인 애플리케이션 메뉴를 엽니다.">
                    <button className="text-zinc-400 hover:text-white p-1 rounded hover:bg-zinc-700">
                        <Menu className="w-5 h-5" />
                    </button>
                 </CustomTooltip>
                 
                 <CustomTooltip title="프로젝트 초기화" description="모든 노트를 삭제하고 설정을 초기화합니다.">
                    <button onClick={onResetProject} className="text-zinc-400 hover:text-red-400 p-1 rounded hover:bg-zinc-700">
                        <RotateCcw className="w-5 h-5" />
                    </button>
                 </CustomTooltip>

                 <CustomTooltip title="MIDI 내보내기" description="현재 프로젝트를 MIDI 파일로 다운로드합니다.">
                    <button onClick={onExportMidi} className="text-zinc-400 hover:text-blue-400 p-1 rounded hover:bg-zinc-700">
                        <Download className="w-5 h-5" />
                    </button>
                 </CustomTooltip>
            </div>

            {/* Transport */}
            <div className="flex items-center space-x-1 border-r border-zinc-700 pr-4 my-1 bg-[#1e2125] p-1 rounded-full px-3 shadow-inner">
                 <CustomTooltip title="재생" description="현재 위치에서 재생을 시작합니다." shortcut="Space">
                    <button onClick={onPlay} className="text-zinc-400 hover:text-green-400 transition-colors p-1">
                        <Play className="w-5 h-5 fill-current" />
                    </button>
                 </CustomTooltip>
                 
                 <CustomTooltip title="정지" description="재생을 정지하고 시작 위치로 돌아갑니다." shortcut="Space">
                    <button onClick={onStop} className="text-zinc-400 hover:text-red-400 transition-colors p-1">
                        <Square className="w-5 h-5 fill-current" />
                    </button>
                 </CustomTooltip>

                 {onToggleLoop && (
                    <CustomTooltip title="루프 모드" description="패턴을 반복 재생합니다." shortcut="L">
                        <button 
                            onClick={onToggleLoop} 
                            className={`transition-colors p-1 ${isLooping ? 'text-orange-400' : 'text-zinc-500 hover:text-zinc-300'}`} 
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                        </button>
                    </CustomTooltip>
                )}
            </div>

            {/* Snap Grid Selector */}
            <div className="flex items-center space-x-1 border-r border-zinc-700 pr-4 my-1">
                 <div className="flex items-center space-x-1 bg-[#1e2125] p-1 rounded-md shadow-inner">
                     <Magnet className={`w-4 h-4 ml-1 ${snapGrid > 0 ? 'text-orange-400' : 'text-zinc-500'}`} />
                     <Select 
                        value={snapGrid.toString()} 
                        onValueChange={(val) => onSnapGridChange && onSnapGridChange(parseFloat(val))}
                     >
                        <SelectTrigger className="h-6 w-[70px] bg-transparent border-none text-xs text-zinc-300 focus:ring-0 p-1">
                            <SelectValue placeholder="Snap" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#282b30] border-zinc-700 text-zinc-300">
                             <SelectItem value="1">Bar</SelectItem>
                             <SelectItem value="0.5">1/2</SelectItem>
                             <SelectItem value="0.25">1/4</SelectItem>
                             <SelectItem value="0.125">1/8</SelectItem>
                             <SelectItem value="0.0625">1/16</SelectItem>
                             <SelectItem value="0.03125">1/32</SelectItem>
                             <SelectItem value="0.015625">1/64</SelectItem>
                             <SelectItem value="0">None</SelectItem>
                        </SelectContent>
                     </Select>
                 </div>
            </div>

            {/* Tools */}
            <div className="flex items-center space-x-0.5 bg-[#1e2125] p-1 rounded-md shadow-inner">
                {tools.map(tool => (
                    <CustomTooltip key={tool.id} title={tool.label} description={tool.desc} shortcut={tool.key}>
                        <button 
                            onClick={() => setActiveTool(tool.id)}
                            className={`p-1.5 rounded-sm transition-all ${activeTool === tool.id ? 'bg-orange-500/20 text-orange-400 shadow-sm' : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700'}`}
                        >
                            <tool.icon className="w-4 h-4" />
                        </button>
                    </CustomTooltip>
                ))}
            </div>

            {/* Riff & Stamp */}
            <div className="flex items-center space-x-2 border-l border-zinc-700 pl-4">
                 {/* ... (Stamp Logic similar wrapping) ... */}
                 {activeTool === 'stamp' && (
                     <div className="flex items-center space-x-2 animate-in fade-in slide-in-from-left-2 duration-200">
                        <span className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">Stamp:</span>
                        <Select value={selectedChordType} onValueChange={(val) => onSelectChordType && onSelectChordType(val as ChordType)}>
                            <SelectTrigger className="h-7 w-[120px] bg-[#1e2125] border-zinc-700 text-xs text-zinc-300">
                                <SelectValue placeholder="Chord" />
                            </SelectTrigger>
                            <SelectContent className="bg-[#282b30] border-zinc-700 text-zinc-300 max-h-[300px]">
                                {chordTypes.map(c => <SelectItem key={c} value={c} className="text-xs hover:bg-zinc-700 focus:bg-zinc-700 cursor-pointer">{c}</SelectItem>)}
                            </SelectContent>
                        </Select>
                     </div>
                )}
                
                <CustomTooltip title="리프 머신" description="멜로디/아르페지오를 자동 생성합니다.">
                    <button 
                        onClick={() => onOpenRiffMachine && onOpenRiffMachine()}
                        className="flex items-center space-x-1.5 px-2 py-1 rounde text-xs font-medium text-zinc-400 hover:text-orange-400 hover:bg-zinc-700/50 transition-colors border border-transparent hover:border-zinc-700"
                    >
                        <Wand2 className="w-4 h-4" />
                        <span>Riff</span>
                    </button>
                </CustomTooltip>
                
                {/* Phase 4: Stem Separation 버튼 */}
                <CustomTooltip title="Stem Separation" description="오디오 파일을 Drums/Bass/Vocals/Instruments로 분리합니다." shortcut="Ctrl+Shift+S">
                    <button 
                        onClick={() => onOpenStems ? onOpenStems() : (window.location.href = '/stems')}
                        className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-400 hover:text-purple-400 hover:bg-purple-600/20 transition-colors border border-transparent hover:border-purple-600/40"
                    >
                        <Layers className="w-4 h-4" />
                        <span>Stems</span>
                    </button>
                </CustomTooltip>
                
                {/* Phase 4: Transition DJ 버튼 */}
                <CustomTooltip title="Transition DJ" description="AI 기반 자연스러운 트랜지션 믹싱을 생성합니다." shortcut="Ctrl+Shift+T">
                    <button 
                        onClick={() => onOpenTransition ? onOpenTransition() : (window.location.href = '/transition')}
                        className="flex items-center space-x-1.5 px-2 py-1 rounded text-xs font-medium text-zinc-400 hover:text-orange-400 hover:bg-orange-600/20 transition-colors border border-transparent hover:border-orange-600/40"
                    >
                        <Shuffle className="w-4 h-4" />
                        <span>Transition</span>
                    </button>
                </CustomTooltip>
            </div>
        </div>

        {/* Right Side */}
        <div className="flex items-center space-x-3">
             <div className="flex items-center bg-[#1e2125] rounded-md border border-[#1c1e22] p-0.5">
                <CustomTooltip title="도움말 / 가이드" description="사용자 매뉴얼을 엽니다.">
                    <button onClick={onOpenWiki} className="px-2 py-1 text-zinc-400 hover:text-orange-400 border-r border-zinc-700 transition-colors">
                        <BookOpen className="w-4 h-4" />
                    </button>
                </CustomTooltip>

                <span className="px-2 text-[10px] text-zinc-600 font-bold uppercase tracking-wider">Target</span>
                
                {/* Channel Selector with Tooltip? Use title for native tooltip or wrapper */}
                 <select 
                    className="bg-transparent text-zinc-300 text-xs outline-none h-7 px-2 border-r border-zinc-700 cursor-pointer hover:text-white"
                    value={activeChannelId}
                    onChange={(e) => setActiveChannelId(e.target.value)}
                    title="Target Channel"
                >
                    {channels.map(ch => (
                        <option key={ch.id} value={ch.id} className="bg-[#2f343b]">{ch.name}</option>
                    ))}
                </select>

                <select 
                     className="bg-transparent text-orange-400 text-xs outline-none font-semibold h-7 px-2 cursor-pointer hover:text-orange-300 w-24 text-right"
                     value={channels.find(c => c.id === activeChannelId)?.instrument.type || 'Synth'}
                     onChange={(e) => onInstrumentChange && onInstrumentChange(e.target.value)}
                     title="Instrument"
                >
                    <option value="Synth" className="bg-[#2f343b]">Synth</option>
                    <option value="FMSynth" className="bg-[#2f343b]">FMSynth</option>
                    {/* ... other options same as before ... */}
                    <option value="AMSynth" className="bg-[#2f343b]">AMSynth</option>
                    <option value="MembraneSynth" className="bg-[#2f343b]">Membrane</option>
                    <option value="MetalSynth" className="bg-[#2f343b]">Metal</option>
                    <option value="MonoSynth" className="bg-[#2f343b]">Mono</option>
                    <option value="DuoSynth" className="bg-[#2f343b]">Duo</option>
                    <option value="PluckSynth" className="bg-[#2f343b]">Pluck</option>
                    <option value="NoiseSynth" className="bg-[#2f343b]">Noise</option>
                    <option value="Sampler" className="bg-[#2f343b]">Sampler</option>
                </select>
            </div>

            <CustomTooltip title="이펙트 랙" description="오디오 이펙트 패널을 엽니다." shortcut="F9">
                <button 
                    className={`h-8 px-3 rounded text-xs font-bold flex items-center space-x-1 transition-all ${isEffectsOpen ? 'bg-orange-600/90 text-white shadow-orange-900/20 shadow-lg' : 'bg-[#23262b] text-zinc-400 border border-zinc-700 hover:border-zinc-500 hover:text-zinc-200'}`}
                    onClick={onToggleEffects}
                >
                    <Settings2 className="w-3.5 h-3.5 mr-1" />
                    <span>FX</span>
                </button>
            </CustomTooltip>
        </div>
    </div>
  );
}
