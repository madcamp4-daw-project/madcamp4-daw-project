"use client";

/**
 * Stem Separation 독립 페이지
 * FL Studio 21.2 스타일의 4-Track 스템 분리 기능 제공
 * 
 * 기술 스택:
 * - Demucs (백엔드): 음원을 Drums, Bass, Vocals, Instruments로 분리
 * - WaveSurfer.js: 웨이브폼 시각화
 * - Tone.js: 실시간 오디오 재생 및 믹싱
 */

import StemSeparationPanel from "@/components/stem-separation/StemSeparationPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home } from "lucide-react";
import Link from "next/link";

/**
 * Stem Separation 메인 페이지 컴포넌트
 * /stems 라우트로 접근 가능
 */
export default function StemsPage() {
  return (
    <div className="flex flex-col h-screen bg-[#121212]">
      {/* 헤더 영역 */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#1a1a1a] border-b border-[#2a2a2a]">
        <div className="flex items-center gap-4">
          {/* 뒤로가기 버튼 */}
          <Link href="/daw">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              title="DAW로 돌아가기 (Ctrl+Shift+D)&#10;&#10;메인 DAW 화면으로 돌아갑니다."
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              DAW
            </Button>
          </Link>
          
          {/* 페이지 타이틀 */}
          <h1 className="text-lg font-semibold text-white">
            Stem Separation
          </h1>
          <span className="text-xs text-gray-500 bg-[#2a2a2a] px-2 py-1 rounded">
            Powered by Demucs AI
          </span>
        </div>

        {/* 우측 메뉴 */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#2a2a2a]"
              title="홈으로 이동&#10;&#10;메인 홈 페이지로 이동합니다."
            >
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-hidden">
        <StemSeparationPanel />
      </main>

      {/* 푸터 영역 - 도움말 */}
      <footer className="px-4 py-2 bg-[#1a1a1a] border-t border-[#2a2a2a]">
        <p className="text-xs text-gray-500 text-center">
          💡 팁: 오디오 파일을 드래그하여 업로드하면 AI가 자동으로 Drums, Bass, Vocals, Instruments 4개 트랙으로 분리합니다.
        </p>
      </footer>
    </div>
  );
}
