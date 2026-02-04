"use client";

import React, { useState, useCallback, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Play, Pause, Download, Plus, Layers } from "lucide-react";
import { StemDropZone } from "./StemDropZone";
import { StemTrack } from "./StemTrack";
import { StemExtractionDialog } from "./StemExtractionDialog";
import type { StemJobStatus } from "@/lib/api/stemSeparationClient";
import { getStemDownloadUrl } from "@/lib/api/stemSeparationClient";

/**
 * 개별 스템 트랙 데이터
 */
interface StemData {
  id: string;
  name: string;      // 예: "Drums", "Bass", "Vocals", "Instruments"
  color: string;     // 트랙 색상
  audioUrl?: string; // 오디오 URL
  volume: number;    // 0-1
  isSolo: boolean;
  isMuted: boolean;
  isPlaying: boolean;
}

/**
 * Stem Separation 메인 패널 컴포넌트
 * FL Studio 스타일의 4트랙 스템 분리 및 관리 UI
 */
export function StemSeparationPanel() {
  // 원본 파일 상태
  const [originalFile, setOriginalFile] = useState<File | null>(null);

  // 원본 오디오 URL 상태 (A/B 테스트용)
  const [originalAudioUrl, setOriginalAudioUrl] = useState<string | null>(null);

  // 다이얼로그 상태
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // 분리된 스템 상태
  const [stems, setStems] = useState<StemData[]>([]);

  // 전체 재생 상태
  const [isPlayingAll, setIsPlayingAll] = useState(false);

  // A/B 비교 상태 (원본 vs 분리)
  const [isABMode, setIsABMode] = useState(false);
  const [showOriginal, setShowOriginal] = useState(true);

  // 오디오 컨텍스트 참조
  const audioContextRef = useRef<AudioContext | null>(null);

  // 원본 오디오 요소 참조 (A/B 테스트용)
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);

  // 스템 오디오 요소들 참조
  const stemsAudioRefs = useRef<Map<string, HTMLAudioElement>>(new Map());

  /**
   * 스템 색상 정의 (FL Studio / Transitions DJ 스타일)
   * - Drums: Purple (#9B59B6) - 킥, 스네어, 하이햇 등 드럼 사운드
   * - Bass: Red (#E74C3C) - 베이스 라인, 저음역대
   * - Instruments: Orange (#F39C12) - 기타, 피아노, 신스 등 멜로디 악기
   * - Vocals: Green (#2ECC71) - 보컬, 목소리
   */
  const stemColors: Record<string, string> = {
    drums: "#9B59B6",       // 보라 (Purple) - Drums
    bass: "#E74C3C",        // 빨강 (Red) - Bass
    vocals: "#2ECC71",      // 녹색 (Green) - Vocals
    instruments: "#F39C12", // 주황 (Orange) - Instruments
  };

  /**
   * 파일 선택 핸들러
   * 원본 오디오 URL 생성하여 A/B 테스트 준비
   */
  const handleFileSelect = useCallback((file: File) => {
    // 기존 원본 URL 해제
    if (originalAudioUrl) {
      URL.revokeObjectURL(originalAudioUrl);
    }
    
    // 새 원본 오디오 URL 생성
    const url = URL.createObjectURL(file);
    setOriginalAudioUrl(url);
    setOriginalFile(file);
    setIsDialogOpen(true);
  }, [originalAudioUrl]);

  /**
   * 스템 추출 완료 핸들러
   */
  const handleExtractComplete = useCallback(
    (extractedStems: NonNullable<NonNullable<StemJobStatus["result"]>["stems"]>) => {
      if (!extractedStems || !originalFile) return;

      const newStems: StemData[] = [];
      const baseName = originalFile.name.replace(/\.[^.]+$/, "");

      if (extractedStems.drums) {
        newStems.push({
          id: "drums",
          name: `${baseName}_Drums`,
          color: stemColors.drums,
          audioUrl: getStemDownloadUrl(extractedStems.drums),
          volume: 1,
          isSolo: false,
          isMuted: false,
          isPlaying: false,
        });
      }

      if (extractedStems.bass) {
        newStems.push({
          id: "bass",
          name: `${baseName}_Bass`,
          color: stemColors.bass,
          audioUrl: getStemDownloadUrl(extractedStems.bass),
          volume: 1,
          isSolo: false,
          isMuted: false,
          isPlaying: false,
        });
      }

      if (extractedStems.instruments) {
        newStems.push({
          id: "instruments",
          name: `${baseName}_Instruments`,
          color: stemColors.instruments,
          audioUrl: getStemDownloadUrl(extractedStems.instruments),
          volume: 1,
          isSolo: false,
          isMuted: false,
          isPlaying: false,
        });
      }

      if (extractedStems.vocals) {
        newStems.push({
          id: "vocals",
          name: `${baseName}_Vocals`,
          color: stemColors.vocals,
          audioUrl: getStemDownloadUrl(extractedStems.vocals),
          volume: 1,
          isSolo: false,
          isMuted: false,
          isPlaying: false,
        });
      }

      setStems(newStems);
    },
    [originalFile, stemColors]
  );

  /**
   * 스템 변경 시 Audio 요소 생성 및 연결
   */
  useEffect(() => {
    // 기존 Audio 요소들 정리
    stemsAudioRefs.current.forEach(audio => {
      audio.pause();
      audio.src = '';
    });
    stemsAudioRefs.current.clear();

    // 새 스템에 대한 Audio 요소 생성
    stems.forEach(stem => {
      if (stem.audioUrl) {
        const audio = new Audio(stem.audioUrl);
        audio.volume = stem.volume;
        stemsAudioRefs.current.set(stem.id, audio);
      }
    });

    return () => {
      // cleanup 시 모든 Audio 정리
      stemsAudioRefs.current.forEach(audio => {
        audio.pause();
        audio.src = '';
      });
    };
  }, [stems]);

  /**
   * 컴포넌트 언마운트 시 원본 오디오 URL 정리
   */
  useEffect(() => {
    return () => {
      if (originalAudioUrl) {
        URL.revokeObjectURL(originalAudioUrl);
      }
    };
  }, [originalAudioUrl]);

  /**
   * 볼륨 변경 핸들러
   */
  const handleVolumeChange = useCallback((stemId: string, volume: number) => {
    setStems((prev) =>
      prev.map((stem) =>
        stem.id === stemId ? { ...stem, volume } : stem
      )
    );
  }, []);

  /**
   * Solo 토글 핸들러
   */
  const handleSoloToggle = useCallback((stemId: string) => {
    setStems((prev) =>
      prev.map((stem) =>
        stem.id === stemId ? { ...stem, isSolo: !stem.isSolo } : stem
      )
    );
  }, []);

  /**
   * Mute 토글 핸들러
   */
  const handleMuteToggle = useCallback((stemId: string) => {
    setStems((prev) =>
      prev.map((stem) =>
        stem.id === stemId ? { ...stem, isMuted: !stem.isMuted } : stem
      )
    );
  }, []);

  /**
   * 개별 재생 토글 핸들러
   */
  const handlePlayToggle = useCallback((stemId: string) => {
    setStems((prev) =>
      prev.map((stem) =>
        stem.id === stemId ? { ...stem, isPlaying: !stem.isPlaying } : stem
      )
    );
  }, []);

  /**
   * 전체 재생 토글 핸들러
   */
  const handlePlayAllToggle = useCallback(() => {
    const newPlayingState = !isPlayingAll;
    setIsPlayingAll(newPlayingState);
    setStems((prev) =>
      prev.map((stem) => ({ ...stem, isPlaying: newPlayingState }))
    );
  }, [isPlayingAll]);

  /**
   * 개별 스템 Export 핸들러
   */
  const handleExport = useCallback((stemId: string) => {
    const stem = stems.find((s) => s.id === stemId);
    if (!stem?.audioUrl) return;

    // 실제 구현에서는 audioUrl에서 다운로드
    console.log(`Exporting ${stem.name}...`);
    
    // Mock: 다운로드 링크 생성
    const link = document.createElement("a");
    link.href = stem.audioUrl;
    link.download = `${stem.name}.wav`;
    link.click();
  }, [stems]);

  /**
   * 믹스 Export 핸들러
   */
  const handleExportMix = useCallback(() => {
    console.log("Exporting mix with current levels...");
    // 실제 구현에서는 현재 볼륨 레벨로 믹스다운
  }, []);

  /**
   * Mixer에 추가 핸들러
   * 분리된 스템들을 Mixer 트랙으로 전달
   */
  const handleAddToMixer = useCallback(() => {
    console.log("Adding stems to mixer...");
    
    // 커스텀 이벤트로 스템 데이터 전달
    const stemData = stems.map(stem => ({
      id: stem.id,
      name: stem.name,
      color: stem.color,
      audioUrl: stem.audioUrl,
      volume: stem.volume,
    }));
    
    window.dispatchEvent(new CustomEvent('add-stems-to-mixer', { 
      detail: { stems: stemData } 
    }));
    
    // Mixer 페이지로 이동 (옵션)
    // window.location.href = '/';
    console.log(`${stems.length}개의 스템이 Mixer에 추가되었습니다.`);
  }, [stems]);

  /**
   * Piano Roll에 추가 핸들러
   * 분리된 스템을 Piano Roll로 전달하여 편집
   */
  const handleSendToPianoRoll = useCallback(() => {
    console.log("Sending stems to piano roll...");
    
    // 스템 데이터를 세션 스토리지에 저장
    const stemData = stems.map(stem => ({
      id: stem.id,
      name: stem.name,
      color: stem.color,
      audioUrl: stem.audioUrl,
    }));
    
    sessionStorage.setItem('stemDataForPianoRoll', JSON.stringify(stemData));
    
    // Piano Roll 페이지로 이동
    window.location.href = '/synth';
  }, [stems]);

  /**
   * A/B 비교 토글 핸들러
   * 원본/분리 오디오 전환 및 실제 재생
   */
  const handleABToggle = useCallback(() => {
    if (!isABMode) {
      // A/B 모드 진입
      setIsABMode(true);
      setShowOriginal(true);
      
      // 원본 오디오 재생 시작
      if (originalAudioUrl && originalAudioRef.current) {
        // 스템 오디오 모두 정지
        stemsAudioRefs.current.forEach(audio => {
          audio.pause();
          audio.currentTime = 0;
        });
        originalAudioRef.current.play().catch(e => console.warn('원본 오디오 재생 실패:', e));
      }
    } else {
      // A/B 전환
      const newShowOriginal = !showOriginal;
      setShowOriginal(newShowOriginal);
      
      if (newShowOriginal) {
        // 원본 재생, 스템 정지
        stemsAudioRefs.current.forEach(audio => {
          audio.pause();
        });
        if (originalAudioRef.current) {
          originalAudioRef.current.play().catch(e => console.warn('원본 오디오 재생 실패:', e));
        }
      } else {
        // 스템 재생, 원본 정지
        if (originalAudioRef.current) {
          originalAudioRef.current.pause();
        }
        stemsAudioRefs.current.forEach(audio => {
          audio.play().catch(e => console.warn('스템 오디오 재생 실패:', e));
        });
      }
    }
  }, [isABMode, showOriginal, originalAudioUrl]);

  /**
   * A/B 모드 해제
   * 모든 오디오 정지
   */
  const handleExitABMode = useCallback(() => {
    setIsABMode(false);
    setShowOriginal(true);
    
    // 모든 오디오 정지
    if (originalAudioRef.current) {
      originalAudioRef.current.pause();
      originalAudioRef.current.currentTime = 0;
    }
    stemsAudioRefs.current.forEach(audio => {
      audio.pause();
      audio.currentTime = 0;
    });
  }, []);

  /**
   * 새 파일 분리 핸들러
   */
  const handleNewExtraction = useCallback(() => {
    setOriginalFile(null);
    setStems([]);
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1a1a1a] text-white p-4 space-y-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-blue-500" />
          <h2 className="text-lg font-semibold">Stem Separation</h2>
        </div>
        {stems.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            onClick={handleNewExtraction}
            className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
          >
            <Plus className="w-4 h-4 mr-1" />
            새 파일
          </Button>
        )}
      </div>

      {/* 메인 컨텐츠 */}
      {stems.length === 0 ? (
        // 파일 업로드 영역
        <div className="flex-1 flex items-center justify-center">
          <div className="w-full max-w-xl">
            <StemDropZone onFileSelect={handleFileSelect} />
          </div>
        </div>
      ) : (
        // 분리된 스템 표시
        <div className="flex-1 flex flex-col space-y-4 overflow-y-auto">
          {/* 원본 파일 정보 */}
          <div className="flex items-center justify-between px-3 py-2 bg-[#252525] rounded-lg">
            <div className="flex items-center gap-2">
              <span className="text-gray-400 text-sm">원본:</span>
              <span className="text-white font-medium">{originalFile?.name}</span>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleNewExtraction}
              className="text-gray-400 hover:text-white"
            >
              변경
            </Button>
          </div>

          {/* 스템 트랙 목록 */}
          <div className="space-y-2">
            {stems.map((stem) => (
              <StemTrack
                key={stem.id}
                name={stem.name}
                color={stem.color}
                audioUrl={stem.audioUrl}
                volume={stem.volume}
                isSolo={stem.isSolo}
                isMuted={stem.isMuted}
                isPlaying={stem.isPlaying}
                onVolumeChange={(vol) => handleVolumeChange(stem.id, vol)}
                onSoloToggle={() => handleSoloToggle(stem.id)}
                onMuteToggle={() => handleMuteToggle(stem.id)}
                onPlayToggle={() => handlePlayToggle(stem.id)}
                onExport={() => handleExport(stem.id)}
              />
            ))}
          </div>

          {/* 컨트롤 버튼 */}
          <div className="flex items-center justify-between pt-4 border-t border-gray-700">
            <Button
              onClick={handlePlayAllToggle}
              className="bg-green-600 hover:bg-green-700"
            >
              {isPlayingAll ? (
                <>
                  <Pause className="w-4 h-4 mr-2" />
                  Pause All
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 mr-2" />
                  Play All
                </>
              )}
            </Button>

             <div className="flex gap-2">
              {/* A/B 비교 버튼 */}
              {stems.length > 0 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant={isABMode ? "default" : "outline"}
                    size="sm"
                    onClick={handleABToggle}
                    className={isABMode ? "bg-purple-600 hover:bg-purple-700" : "bg-transparent border-gray-600"}
                  >
                    A/B {showOriginal ? "원본" : "분리"}
                  </Button>
                  {isABMode && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleExitABMode}
                      className="text-gray-400 hover:text-white"
                    >
                      ×
                    </Button>
                  )}
                </div>
              )}
              <Button
                variant="outline"
                onClick={handleExportMix}
                className="bg-transparent border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export Mix
              </Button>
              <Button
                variant="outline"
                onClick={handleSendToPianoRoll}
                className="bg-transparent border-orange-600 text-orange-300 hover:bg-orange-900"
              >
                🎹 Piano Roll
              </Button>
              <Button
                onClick={handleAddToMixer}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add to Mixer
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 스템 추출 다이얼로그 */}
      <StemExtractionDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onExtract={handleExtractComplete}
        fileName={originalFile?.name}
        audioFile={originalFile || undefined}
      />

      {/* 숨겨진 원본 오디오 요소 (A/B 테스트용) */}
      {originalAudioUrl && (
        <audio
          ref={originalAudioRef}
          src={originalAudioUrl}
          style={{ display: 'none' }}
          preload="auto"
        />
      )}
    </div>
  );
}

export default StemSeparationPanel;
