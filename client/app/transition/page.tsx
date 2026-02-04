"use client";

/**
 * Transition DJ 독립 페이지
 * dj.app 스타일의 듀얼 덱 DJ 인터페이스 제공
 * 
 * 기술 스택:
 * - Madmom (백엔드): 정밀 다운비트 분석
 * - BeatNet (백엔드): AI 기반 트랜지션 믹싱
 * - WaveSurfer.js: 듀얼 웨이브폼 시각화
 * - Tone.js: 실시간 믹싱 및 이펙트
 */

import TransitionPanel from "@/components/transition/TransitionPanel";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, Layers } from "lucide-react";
import Link from "next/link";

/**
 * Transition DJ 메인 페이지 컴포넌트
 * /transition 라우트로 접근 가능
 */
export default function TransitionPage() {
  return (
    <div className="flex flex-col h-screen bg-[#0a0a14]">
      {/* 헤더 영역 */}
      <header className="flex items-center justify-between px-4 py-2 bg-[#12121f] border-b border-[#2a2a3f]">
        <div className="flex items-center gap-4">
          {/* 뒤로가기 버튼 */}
          <Link href="/daw">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#2a2a3f]"
              title="DAW로 돌아가기 (Ctrl+Shift+D)&#10;&#10;메인 DAW 화면으로 돌아갑니다."
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              DAW
            </Button>
          </Link>
          
          {/* Stems 탭 링크 */}
          <Link href="/stems">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#2a2a3f]"
              title="Stem Separation으로 이동&#10;&#10;오디오 파일을 Drums/Bass/Vocals/Instruments로 분리합니다."
            >
              <Layers className="w-4 h-4 mr-2" />
              Stems
            </Button>
          </Link>
        </div>

        {/* 우측 메뉴 */}
        <div className="flex items-center gap-2">
          <Link href="/">
            <Button
              variant="ghost"
              size="sm"
              className="text-gray-400 hover:text-white hover:bg-[#2a2a3f]"
              title="홈으로 이동&#10;&#10;메인 홈 페이지로 이동합니다."
            >
              <Home className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      {/* 메인 컨텐츠 영역 */}
      <main className="flex-1 overflow-hidden">
        <TransitionPanel />
      </main>
    </div>
  );
}
