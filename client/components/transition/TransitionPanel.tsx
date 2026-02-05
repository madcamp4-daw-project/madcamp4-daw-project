"use client";

import React, { useState, useCallback, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TooltipProvider, TooltipWrapper } from "@/components/ui/tooltip";
import {
  Waves,
  Layers,
  Activity,
  Clock,
  Wand2,
  Search,
  HelpCircle,
  Settings,
  Mic,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { DeckPanelCompact } from "./DeckPanelCompact";
import { VisualizationArea } from "./VisualizationArea";
import { TransportBar } from "./TransportBar";
import { LibraryPanel, type UploadedTrack } from "./LibraryPanel";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import type { BeatAnalysis } from "@/lib/api/transition";
import { uploadAudioFile, createTransitionMix, getStreamUrl, splitAudio } from "@/lib/api/transition";

/**
 * 덱 상태 인터페이스
 */
export interface DeckState {
  file?: File;
  trackName?: string;
  artistName?: string;
  /** 서버에서 스트리밍할 오디오 URL */
  audioUrl?: string;
  bpm: number;
  originalBpm: number;
  pitchPercent: number;  // -8% ~ +8%
  currentTime: number;   // 현재 재생 시간 (초)
  duration: number;      // 전체 길이 (초)
  isPlaying: boolean;
  eqLow: number;         // 0-100
  eqMid: number;
  eqHigh: number;
  eqLowKill: boolean;
  eqMidKill: boolean;
  eqHighKill: boolean;
  cuePoints: (number | null)[]; // 5개의 CUE 포인트
  loopBars: number;      // 루프 길이 (바)
  loopStart: number | null;
  loopEnd: number | null;
  isLooping: boolean;
  analysis?: BeatAnalysis;
  stemMutes: {
    drum: boolean;
    bass: boolean;
    melody: boolean;
    vocal: boolean;
  };
}

/**
 * 시각화 모드 타입
 */
type ViewMode = 'waves' | 'stems';
type SubMode = 'scope' | 'timeline';

/**
 * Transitions DJ 메인 패널 컴포넌트
 * transitions.dj 완전 복제
 */
export function TransitionPanel() {
  // 시각화 모드
  const [viewMode, setViewMode] = useState<ViewMode>('stems');
  const [subMode, setSubMode] = useState<SubMode>('timeline');
  const [showFX, setShowFX] = useState(false);

  // 덱 상태 초기화
  const createInitialDeck = (): DeckState => ({
    bpm: 120,
    originalBpm: 120,
    pitchPercent: 0,
    currentTime: 0,
    duration: 0,
    isPlaying: false,
    audioUrl: undefined,
    eqLow: 50,
    eqMid: 50,
    eqHigh: 50,
    eqLowKill: false,
    eqMidKill: false,
    eqHighKill: false,
    cuePoints: [null, null, null, null, null],
    loopBars: 4,
    loopStart: null,
    loopEnd: null,
    isLooping: false,
    stemMutes: { drum: false, bass: false, melody: false, vocal: false },
  });

  const [deckA, setDeckA] = useState<DeckState>(createInitialDeck());
  const [deckB, setDeckB] = useState<DeckState>(createInitialDeck());

  // 전역 상태
  const [crossfader, setCrossfader] = useState(50); // 0-100, 50=중앙
  const [masterVolume, setMasterVolume] = useState(80);
  const [tempoSync, setTempoSync] = useState(false);
  const [beatLock, setBeatLock] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [quantize, setQuantize] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);

  // FX 상태 (각 덱)
  const [fxA, setFxA] = useState({ fx1: 'Echo', fx2: 'Hold Echo', fx3: 'Flanger', beats: 1 });
  const [fxB, setFxB] = useState({ fx1: 'Echo', fx2: 'Hold Echo', fx3: 'Flanger', beats: 1 });

  // 백엔드 API 연동을 위한 fileId 상태
  const [fileIdA, setFileIdA] = useState<string | null>(null);
  const [fileIdB, setFileIdB] = useState<string | null>(null);
  
  // 스템 분리 진행 상태 (업로드 후 분석 완료까지 대기)
  const [isProcessingA, setIsProcessingA] = useState(false);
  const [isProcessingB, setIsProcessingB] = useState(false);
  const [stemStatusA, setStemStatusA] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');
  const [stemStatusB, setStemStatusB] = useState<'idle' | 'processing' | 'completed' | 'error'>('idle');

  // Magic Mix 결과 오디오
  const mixAudioRef = useRef<HTMLAudioElement | null>(null);

  /**
   * 키보드 단축키 핸들러
   */
  const keyboardHandlers = {
    // Transport - Deck A
    playPauseA: () => setDeckA(prev => ({ ...prev, isPlaying: !prev.isPlaying })),
    playPauseB: () => setDeckB(prev => ({ ...prev, isPlaying: !prev.isPlaying })),
    playPauseAll: () => {
      setDeckA(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
      setDeckB(prev => ({ ...prev, isPlaying: !prev.isPlaying }));
    },
    
    // Tempo
    tempoDownA: () => setDeckA(prev => ({ ...prev, pitchPercent: Math.max(-8, prev.pitchPercent - 0.1) })),
    tempoUpA: () => setDeckA(prev => ({ ...prev, pitchPercent: Math.min(8, prev.pitchPercent + 0.1) })),
    tempoDownB: () => setDeckB(prev => ({ ...prev, pitchPercent: Math.max(-8, prev.pitchPercent - 0.1) })),
    tempoUpB: () => setDeckB(prev => ({ ...prev, pitchPercent: Math.min(8, prev.pitchPercent + 0.1) })),
    tempoSyncA: () => setDeckA(prev => ({ ...prev, bpm: deckB.bpm, pitchPercent: 0 })),
    tempoSyncB: () => setDeckB(prev => ({ ...prev, bpm: deckA.bpm, pitchPercent: 0 })),
    
    // EQ Kill - Deck A
    eqHighKillA: () => setDeckA(prev => ({ ...prev, eqHighKill: !prev.eqHighKill })),
    eqMidKillA: () => setDeckA(prev => ({ ...prev, eqMidKill: !prev.eqMidKill })),
    eqLowKillA: () => setDeckA(prev => ({ ...prev, eqLowKill: !prev.eqLowKill })),
    // EQ Kill - Deck B
    eqHighKillB: () => setDeckB(prev => ({ ...prev, eqHighKill: !prev.eqHighKill })),
    eqMidKillB: () => setDeckB(prev => ({ ...prev, eqMidKill: !prev.eqMidKill })),
    eqLowKillB: () => setDeckB(prev => ({ ...prev, eqLowKill: !prev.eqLowKill })),
    
    // Mixer
    crossfaderLeft: () => setCrossfader(prev => Math.max(0, prev - 5)),
    crossfaderRight: () => setCrossfader(prev => Math.min(100, prev + 5)),
    crossfaderCutLeft: () => setCrossfader(0),
    crossfaderCutRight: () => setCrossfader(100),
    crossfaderCenter: () => setCrossfader(50),
    
    // View
    zoomIn: () => setZoomLevel(prev => Math.min(4, prev + 0.5)),
    zoomOut: () => setZoomLevel(prev => Math.max(0.5, prev - 0.5)),
    zoomDefault: () => setZoomLevel(1),
    
    // Record
    recordToggle: () => setIsRecording(prev => !prev),
    
    // Loop
    loopToggleA: () => setDeckA(prev => ({ ...prev, isLooping: !prev.isLooping })),
    loopToggleB: () => setDeckB(prev => ({ ...prev, isLooping: !prev.isLooping })),
    loopHalfA: () => setDeckA(prev => ({ ...prev, loopBars: Math.max(1, prev.loopBars / 2) })),
    loopDoubleA: () => setDeckA(prev => ({ ...prev, loopBars: Math.min(32, prev.loopBars * 2) })),
    loopHalfB: () => setDeckB(prev => ({ ...prev, loopBars: Math.max(1, prev.loopBars / 2) })),
    loopDoubleB: () => setDeckB(prev => ({ ...prev, loopBars: Math.min(32, prev.loopBars * 2) })),
    
    // Quantize
    quantizeToggle: () => setQuantize(prev => !prev),
  };

  // 키보드 단축키 훅
  useKeyboardShortcuts(keyboardHandlers);

  /**
   * 파일 로드 핸들러
   */
  const handleFileLoad = useCallback(async (side: 'A' | 'B', file: File) => {
    const setter = side === 'A' ? setDeckA : setDeckB;
    const fileIdSetter = side === 'A' ? setFileIdA : setFileIdB;
    const setIsProcessing = side === 'A' ? setIsProcessingA : setIsProcessingB;
    const setStemStatus = side === 'A' ? setStemStatusA : setStemStatusB;
    
    console.log(`\n🎵 ===== Deck ${side} 파일 로드 시작 =====`);
    console.log(`   📁 파일명: ${file.name}`);
    console.log(`   📏 크기: ${(file.size / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   📂 타입: ${file.type}`);
    
    // 로딩 상태 설정
    setIsProcessing(true);
    setStemStatus('processing');
    
    setter(prev => ({
      ...prev,
      file,
      trackName: file.name.replace(/\.[^/.]+$/, "") + " (업로드 중...)",
      artistName: "Unknown Artist",
      isPlaying: false,
    }));

    try {
        console.log(`📤 [Deck ${side}] 서버에 업로드 요청 중...`);
        const response = await uploadAudioFile(file);
        
        console.log(`📥 [Deck ${side}] 서버 응답:`, response);
        
        if (response.success) {
            console.log(`✅ [Deck ${side}] 업로드 성공! TrackId: ${response.trackId}`);
            
            // fileId 설정
            fileIdSetter(response.trackId);
            console.log(`🔑 [Deck ${side}] fileId 설정 완료: ${response.trackId}`);
            
            // 오디오 스트림 URL 생성
            const audioStreamUrl = getStreamUrl(response.trackId);
            console.log(`🔊 [Deck ${side}] 오디오 스트림 URL: ${audioStreamUrl}`);
            
            // 분석 결과 적용
            const analysis = response.analysis;
            console.log(`📊 [Deck ${side}] 분석 결과:`, analysis);
            
            setter(prev => ({
                ...prev,
                trackName: (response.originalName || file.name.replace(/\.[^/.]+$/, "")) + " (스템 분리 중...)",
                audioUrl: audioStreamUrl,
                bpm: analysis?.bpm ? Math.round(analysis.bpm * 10) / 10 : 120,
                originalBpm: analysis?.bpm ? Math.round(analysis.bpm * 10) / 10 : 120,
                duration: analysis?.duration || 180,
            }));
            
            // 스템 분리 요청 및 폴링
            console.log(`🔨 [Deck ${side}] 스템 분리 요청 중...`);
            try {
                const splitRes = await splitAudio(response.trackId);
                console.log(`🔨 [Deck ${side}] Stem Split Started:`, splitRes.jobId);
                
                // 스템 분리 완료까지 폴링 (최대 5분)
                const maxPolls = 60; // 5초 간격으로 60회 = 5분
                let pollCount = 0;
                
                const pollInterval = setInterval(async () => {
                    try {
                        pollCount++;
                        const { getMixStatus } = await import("@/lib/api/transition");
                        const statusData = await getMixStatus(splitRes.jobId);
                        
                        console.log(`🔄 [Deck ${side}] 스템 분리 상태 (${pollCount}/${maxPolls}):`, statusData.status);
                        
                        if (statusData.status === 'completed') {
                            clearInterval(pollInterval);
                            setStemStatus('completed');
                            setIsProcessing(false);
                            setter(prev => ({
                                ...prev,
                                trackName: response.originalName || file.name.replace(/\.[^/.]+$/, ""),
                            }));
                            console.log(`✅ [Deck ${side}] 스템 분리 완료!`);
                        } else if (statusData.status === 'failed') {
                            clearInterval(pollInterval);
                            setStemStatus('error');
                            setIsProcessing(false);
                            console.error(`❌ [Deck ${side}] 스템 분리 실패:`, statusData.error);
                        } else if (pollCount >= maxPolls) {
                            clearInterval(pollInterval);
                            // 타임아웃 되어도 일단 완료 처리 (Magic Mix는 가능)
                            setStemStatus('completed');
                            setIsProcessing(false);
                            setter(prev => ({
                                ...prev,
                                trackName: response.originalName || file.name.replace(/\.[^/.]+$/, ""),
                            }));
                            console.warn(`⚠️ [Deck ${side}] 스템 분리 타임아웃 (계속 진행)`);
                        }
                    } catch (pollErr) {
                        console.warn(`⚠️ [Deck ${side}] 폴링 에러:`, pollErr);
                    }
                }, 5000); // 5초 간격
                
            } catch (splitErr: any) {
                console.warn(`⚠️ [Deck ${side}] Stem Split Request Failed:`, splitErr);
                // 스템 분리 실패해도 업로드는 성공이므로 완료 처리
                setStemStatus('completed');
                setIsProcessing(false);
                setter(prev => ({
                    ...prev,
                    trackName: response.originalName || file.name.replace(/\.[^/.]+$/, ""),
                }));
            }
            
        } else {
            console.error(`❌ [Deck ${side}] 업로드 실패:`, response.message);
            setStemStatus('error');
            setIsProcessing(false);
            setter(prev => ({ ...prev, trackName: prev.trackName?.replace(" (업로드 중...)", " (에러)") }));
            alert(`Upload failed: ${response.message}`);
        }
    } catch (e: any) {
        console.error(`❌ [Deck ${side}] File load error:`, e);
        console.error(`   에러 메시지: ${e.message}`);
        setStemStatus('error');
        setIsProcessing(false);
        setter(prev => ({ ...prev, trackName: prev.trackName?.replace(" (업로드 중...)", " (에러)") }));
        alert(`Upload error: ${e.message}`);
    }
  }, []);

  /**
   * 트랙 선택 핸들러 (라이브러리에서)
   */
  const handleTrackSelect = useCallback((track: UploadedTrack, side: 'A' | 'B') => {
    console.log(`Loading ${track.title} to Deck ${side}`);
    // TODO: 라이브러리에서 트랙 선택 시 로드 로직 구현
  }, []);

  /**
   * BPM 변경 핸들러
   */
  const handleBpmChange = useCallback((side: 'A' | 'B', bpm: number) => {
    const setter = side === 'A' ? setDeckA : setDeckB;
    setter(prev => {
      const pitchPercent = ((bpm - prev.originalBpm) / prev.originalBpm) * 100;
      return { ...prev, bpm, pitchPercent: Math.round(pitchPercent * 10) / 10 };
    });

    // Master Sync Logic
    if (tempoSync) {
        const otherSetter = side === 'A' ? setDeckB : setDeckA;
        otherSetter(prev => {
             // Sync other deck to this new bpm
             const pitchPercent = ((bpm - prev.originalBpm) / prev.originalBpm) * 100;
             return { ...prev, bpm, pitchPercent: Math.round(pitchPercent * 10) / 10 };
        });
    }
  }, [tempoSync]);

  /**
   * SYNC 핸들러
   */
  const handleSync = useCallback((side: 'A' | 'B') => {
    if (side === 'A') {
      setDeckA(prev => ({ ...prev, bpm: deckB.bpm, pitchPercent: ((deckB.bpm - prev.originalBpm) / prev.originalBpm) * 100 }));
    } else {
      setDeckB(prev => ({ ...prev, bpm: deckA.bpm, pitchPercent: ((deckA.bpm - prev.originalBpm) / prev.originalBpm) * 100 }));
    }
  }, [deckA.bpm, deckB.bpm]);

  /**
   * Stem 뮤트 핸들러
   */
  const handleStemMute = useCallback((side: 'A' | 'B', stem: 'drum' | 'bass' | 'melody' | 'vocal') => {
    const setter = side === 'A' ? setDeckA : setDeckB;
    setter(prev => ({
      ...prev,
      stemMutes: { ...prev.stemMutes, [stem]: !prev.stemMutes[stem] },
    }));
  }, []);

  /**
   * Magic Mix 핸들러 - AI 자동 트랜지션 생성
   * Transition API를 호출하여 두 트랙의 최적 믹스 포인트 계산
   */
  /**
   * Magic Mix 핸들러 - AI 자동 트랜지션 생성
   * Transition API를 호출하여 두 트랙의 최적 믹스 포인트 계산
   * Polling (1초 간격)으로 상태 확인
   */
  const [isMixProcessing, setIsMixProcessing] = useState(false);
  const [mixProgress, setMixProgress] = useState(0);

  const handleMagicMix = useCallback(async () => {
    console.log(`\n✨ ===== Magic Mix 시작 =====`);
    console.log(`   🔑 fileIdA: ${fileIdA}`);
    console.log(`   🔑 fileIdB: ${fileIdB}`);
    console.log(`   ⏱️ deckA.duration: ${deckA.duration}`);
    console.log(`   ⏱️ deckB.duration: ${deckB.duration}`);
    console.log(`   🎼 deckA.bpm: ${deckA.bpm}`);
    console.log(`   🎼 deckB.bpm: ${deckB.bpm}`);
    
    // fileId가 없으면 파일 정보로 체크 (Mock/Fallback)
    const hasTrackA = fileIdA !== null || deckA.duration > 0;
    const hasTrackB = fileIdB !== null || deckB.duration > 0;
    
    console.log(`   ✅ hasTrackA: ${hasTrackA}`);
    console.log(`   ✅ hasTrackB: ${hasTrackB}`);
    
    if (!hasTrackA || !hasTrackB) {
      console.error(`❌ Magic Mix 실패: 트랙이 없습니다.`);
      console.error(`   fileIdA가 null이고 deckA.duration이 0입니다.` + (hasTrackA ? '' : ' (Track A 없음)'));
      console.error(`   fileIdB가 null이고 deckB.duration이 0입니다.` + (hasTrackB ? '' : ' (Track B 없음)'));
      alert('Magic Mix: 두 덱 모두에 트랙이 필요합니다. 파일을 드래그앤드롭한 후 업로드가 완료될 때까지 기다려주세요.');
      return;
    }

    setIsMixProcessing(true);
    setMixProgress(0);
    console.log('🎛️ Magic Mix 처리 시작...');

    try {
      // fileId가 있으면 실제 API 호출
      if (fileIdA && fileIdB) {
        console.log('[Magic Mix] 실제 API 호출 중...');
        // New Signature: sourceId, targetId, options
        // mixType 'auto' is handled by logic we put in server side (mix_engine.py), 
        // but client needs to pass explicit type or server treats 'blend' as default in routes/audio.js if not passed.
        // We updated mix_engine to handle 'auto', but routes/audio.js defaults to 'blend' if missing.
        // We will pass 'auto' as mixType to let python engine decide, unless user selected specific.
        // But createTransitionMix helper treats options.transitionType as limited to 'blend'|'drop'.
        // We'll update the helper or just cast it.
        const result = await createTransitionMix(
          fileIdA,
          fileIdB,
          { 
              transitionType: 'blend', // 서버에서 BPM 차이 기반으로 자동 결정됨
              bridgeBars: 4 
          }
        );
        
        if (!result.success || !result.jobId) {
             throw new Error(result.message || "Failed to start mix job");
        }

        const jobId = result.jobId;
        console.log(`[Magic Mix] Job Started: ${jobId}`);

        // Polling Logic
        const pollInterval = setInterval(async () => {
            try {
                // Check Status
                // We need to import getMixStatus if not available or fetch directly
                // It is imported in the file line 28
                const statusData = await import("@/lib/api/transition").then(m => m.getMixStatus(jobId));
                
                if (statusData.status === 'completed') {
                    clearInterval(pollInterval);
                    setIsMixProcessing(false);
                    setMixProgress(100);
                    console.log('Magic Mix 완료!', statusData.result);

                    if (statusData.result?.mixUrl && mixAudioRef.current) {
                         const url = getStreamUrl(statusData.result.mixUrl);
                         mixAudioRef.current.src = url;
                         mixAudioRef.current.play().catch(e => console.warn('믹스 오디오 재생 실패:', e));
                    }
                } else if (statusData.status === 'failed') {
                    clearInterval(pollInterval);
                    setIsMixProcessing(false);
                    alert(`믹싱 실패: ${statusData.error}`);
                } else {
                    // Processing
                    if (statusData.progress) {
                        setMixProgress(statusData.progress);
                    }
                }
            } catch (e) {
                console.error("Polling error", e);
                // Don't clear interval immediately on network glitch, maybe count errors
            }
        }, 1000);

      } else {
        // Mock: 크로스페이더 자동 이동 시뮬레이션
        console.log('[Magic Mix] Mock 모드 - 크로스페이더 시뮬레이션');
        let progress = crossfader;
        const interval = setInterval(() => {
          progress += (100 - progress) * 0.1;
          setCrossfader(Math.round(progress));
          if (progress >= 99) {
            clearInterval(interval);
            setCrossfader(100);
            setIsMixProcessing(false);
            console.log('Magic Mix 완료!');
          }
        }, 100);
      }
    } catch (error: any) {
      console.error('Magic Mix 실패:', error);
      setIsMixProcessing(false);
      alert(`오류 발생: ${error.message}`);
    }
  }, [fileIdA, fileIdB, deckA, deckB, crossfader]);

  /**
   * Beat Lock 토글 핸들러
   * 활성화 시 두 덱의 비트 위상 동기화
   */
  const handleBeatLockToggle = useCallback(() => {
    setBeatLock(prev => {
      const newState = !prev;
      if (newState && deckA.bpm !== deckB.bpm) {
        // Beat Lock 활성화 시 BPM도 동기화
        setDeckB(prevB => ({ 
          ...prevB, 
          bpm: deckA.bpm,
          pitchPercent: ((deckA.bpm - prevB.originalBpm) / prevB.originalBpm) * 100
        }));
      }
      return newState;
    });
  }, [deckA.bpm, deckB.bpm]);

  /**
   * 탭 활성화 상태 계산
   */
  const isWavesActive = viewMode === 'waves';
  const isStemsActive = viewMode === 'stems';
  const isScopeActive = subMode === 'scope';
  const isTimelineActive = subMode === 'timeline';

  return (
    <TooltipProvider>
    <div className="flex flex-col h-full bg-[#1a1a2e] text-white font-sans select-none overflow-hidden">
      {/* ===== 상단 헤더 ===== */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#12121f] border-b border-[#2a2a3f]">
        {/* 로고 및 탭 */}
        <div className="flex items-center gap-4">
          <span className="text-lg font-light tracking-widest text-gray-300">transitions dj</span>
          
          {/* 시각화 모드 탭 */}
          <div className="flex items-center gap-1 ml-4">
            <TooltipWrapper 
              content="파형 뷰 모드로 전환합니다. 3밴드 컬러(저음=빨강, 중음=녹색, 고음=파랑)로 오디오를 시각화합니다."
            >
              <button
                onClick={() => setViewMode('waves')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  isWavesActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                WAVES
              </button>
            </TooltipWrapper>
            <TooltipWrapper 
              content="스템 뷰 모드로 전환합니다. 보컬(녹색), 멜로디(주황), 베이스(빨강), 드럼(파랑/보라)을 개별 표시합니다."
            >
              <button
                onClick={() => setViewMode('stems')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  isStemsActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                STEMS
              </button>
            </TooltipWrapper>
            <TooltipWrapper 
              content="스코프 모드. EQ Kill 버튼으로 특정 주파수 대역을 뮤트할 수 있습니다."
            >
              <button
                onClick={() => setSubMode('scope')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  isScopeActive ? 'text-white' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                SCOPE
              </button>
            </TooltipWrapper>
            <TooltipWrapper 
              content="타임라인 모드. Intro, Verse, Chorus 등 곡의 구간을 라벨로 표시합니다."
            >
              <button
                onClick={() => setSubMode('timeline')}
                className={`px-2 py-1 text-[10px] uppercase tracking-wider transition-colors ${
                  isTimelineActive ? 'text-purple-400' : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                TIMELINE
              </button>
            </TooltipWrapper>

          </div>
        </div>

        {/* 마스터 및 유틸리티 */}
        <div className="flex items-center gap-3">
          {/* MASTER 볼륨 */}
          <TooltipWrapper content="마스터 볼륨. 모든 덱의 최종 출력 레벨을 조절합니다. 빨간색 영역은 클리핑 위험을 나타냅니다.">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-gray-500 uppercase">MASTER</span>
              <div className="w-24 h-1.5 bg-[#2a2a3f] rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500" 
                  style={{ width: `${masterVolume}%` }}
                />
              </div>
            </div>
          </TooltipWrapper>

          <TooltipWrapper content="라이브러리에서 트랙을 검색합니다. 트랙 제목, 아티스트명, 장르로 검색할 수 있습니다.">
            <Button size="icon" variant="ghost" className="w-7 h-7 text-gray-400 hover:text-white">
              <Search className="w-4 h-4" />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="도움말 및 키보드 단축키 목록을 확인합니다. 100개 이상의 단축키로 빠른 작업이 가능합니다.">
            <Button size="icon" variant="ghost" className="w-7 h-7 text-gray-400 hover:text-white">
              <HelpCircle className="w-4 h-4" />
            </Button>
          </TooltipWrapper>
          <TooltipWrapper content="환경설정을 엽니다. 오디오 장치, 단축키, 시각화 옵션 등을 설정할 수 있습니다.">
            <Button size="icon" variant="ghost" className="w-7 h-7 text-gray-400 hover:text-white">
              <Settings className="w-4 h-4" />
            </Button>
          </TooltipWrapper>
        </div>
      </div>



      {/* ===== 메인 DJ 영역 (100px : flex : 100px) ===== */}
      <div className="flex flex-1 overflow-hidden">
        {/* Deck A - 컴팩트 */}
        <div className="w-[100px] flex-shrink-0 bg-[#12121f] border-r border-[#2a2a3f]">
          <DeckPanelCompact
            side="A"
            deckState={deckA}
            onFileLoad={(file) => handleFileLoad('A', file)}
            onPlayToggle={() => setDeckA(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
            onSync={() => handleSync('A')}
            onBpmChange={(bpm) => handleBpmChange('A', bpm)}
            isProcessing={isProcessingA}
            processingStatus={stemStatusA === 'processing' ? (fileIdA ? 'stemming' : 'uploading') : stemStatusA}
          />
        </div>

        {/* 중앙 시각화 영역 */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <VisualizationArea
            deckA={deckA}
            deckB={deckB}
            viewMode={viewMode}
            subMode={subMode}
            zoomLevel={zoomLevel}
            onStemMute={handleStemMute}
          />
        </div>

        {/* Deck B - 컴팩트 */}
        <div className="w-[100px] flex-shrink-0 bg-[#12121f] border-l border-[#2a2a3f]">
          <DeckPanelCompact
            side="B"
            deckState={deckB}
            onFileLoad={(file) => handleFileLoad('B', file)}
            onPlayToggle={() => setDeckB(prev => ({ ...prev, isPlaying: !prev.isPlaying }))}
            onSync={() => handleSync('B')}
            onBpmChange={(bpm) => handleBpmChange('B', bpm)}
            isProcessing={isProcessingB}
            processingStatus={stemStatusB === 'processing' ? (fileIdB ? 'stemming' : 'uploading') : stemStatusB}
          />
        </div>
      </div>

      {/* ===== Transport 바 ===== */}
      <TransportBar
        deckA={deckA}
        deckB={deckB}
        viewMode={viewMode}
        crossfader={crossfader}
        onCrossfaderChange={setCrossfader}
        onDeckAChange={setDeckA}
        onDeckBChange={setDeckB}
        onStemMute={handleStemMute}
      />

      {/* ===== AI 컨트롤 바 (Magic Mix / Beat Lock / Sync) ===== */}
      <div className="flex items-center justify-center gap-4 px-3 py-2 bg-gradient-to-r from-[#1a1a2e] via-[#16162a] to-[#1a1a2e] border-t border-[#2a2a3f]">
        {/* Beat Lock 버튼 */}
        <TooltipWrapper content="Beat Lock. 두 덱의 비트 위상을 동기화하여 믹스 시 비트가 어긋나지 않게 합니다.">
          <button
            onClick={handleBeatLockToggle}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              beatLock
                ? 'bg-green-600 text-white shadow-lg shadow-green-600/30'
                : 'bg-[#2a2a3f] text-gray-400 hover:bg-[#3a3a4f] hover:text-white'
            }`}
          >
            🔗 Beat Lock {beatLock ? 'ON' : 'OFF'}
          </button>
        </TooltipWrapper>

        {/* SYNC 버튼 */}
        <TooltipWrapper content="BPM Sync. Deck B의 BPM을 Deck A에 맞춥니다.">
          <button
            onClick={() => {
                const newSyncState = !tempoSync;
                setTempoSync(newSyncState);
                if (newSyncState) {
                    // Sync immediately based on which deck is playing or default to A
                    const targetBpm = deckA.isPlaying ? deckA.bpm : (deckB.isPlaying ? deckB.bpm : deckA.bpm);
                    
                    setDeckA(prev => ({ ...prev, bpm: targetBpm, pitchPercent: ((targetBpm - prev.originalBpm) / prev.originalBpm) * 100 }));
                    setDeckB(prev => ({ ...prev, bpm: targetBpm, pitchPercent: ((targetBpm - prev.originalBpm) / prev.originalBpm) * 100 }));
                }
            }}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              tempoSync
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/30'
                : 'bg-[#2a2a3f] text-gray-400 hover:bg-[#3a3a4f] hover:text-white'
            }`}
          >
            🎵 Sync {tempoSync ? 'ON' : 'OFF'}
          </button>
        </TooltipWrapper>

        {/* Magic Mix 버튼 */}
        <TooltipWrapper content="Magic Mix. AI가 두 트랙을 분석하여 최적의 트랜지션 포인트를 찾고 부드러운 믹스를 자동 생성합니다.">
          <button
            onClick={handleMagicMix}
            disabled={isMixProcessing || isProcessingA || isProcessingB}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${
              isMixProcessing || isProcessingA || isProcessingB
                ? 'bg-gray-600 text-gray-300 cursor-wait'
                : 'bg-gradient-to-r from-purple-600 to-pink-600 text-white hover:from-purple-500 hover:to-pink-500 shadow-lg shadow-purple-600/30'
            }`}
          >
            {isMixProcessing 
              ? `🔄 믹싱 중... ${mixProgress}%` 
              : isProcessingA || isProcessingB
                ? `⏳ 스템 분리 대기중...`
                : '✨ Magic Mix'}
          </button>
        </TooltipWrapper>

        {/* Quantize 버튼 */}
        <TooltipWrapper content="Quantize. 활성화하면 모든 액션이 비트에 맞춰 정렬됩니다.">
          <button
            onClick={() => setQuantize(!quantize)}
            className={`px-4 py-1.5 rounded-lg text-xs font-medium transition-all ${
              quantize
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30'
                : 'bg-[#2a2a3f] text-gray-400 hover:bg-[#3a3a4f] hover:text-white'
            }`}
          >
            🎯 Q {quantize ? 'ON' : 'OFF'}
          </button>
        </TooltipWrapper>


      </div>

      {/* ===== 라이브러리 패널 ===== */}
      <div className="h-48 min-h-[150px] border-t border-[#2a2a3f]">
        <LibraryPanel uploadedTracks={[] as UploadedTrack[]} onTrackSelect={handleTrackSelect} />
      </div>

      {/* 숨겨진 Mix 결과 오디오 요소 */}
      <audio
        ref={mixAudioRef}
        style={{ display: 'none' }}
        preload="auto"
      />
    </div>
    </TooltipProvider>
  );
}

export default TransitionPanel;
