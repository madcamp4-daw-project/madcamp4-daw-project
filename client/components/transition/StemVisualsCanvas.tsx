"use client";

import React, { useRef, useEffect } from "react";
import type { DeckState } from "./TransitionPanel";

interface StemVisualsCanvasProps {
  deck: DeckState;
  zoomLevel: number;
  width: number;
  height: number;
}

/**
 * Stem Visuals 색상 상수
 * transitions.dj 정확한 색상 복제
 */
const STEM_COLORS = {
  vocals: "#00FF00",     // 녹색 - 최상단 (피치 노트)
  melody: "#FFA500",     // 주황 - 악기/멜로디 (피치 노트)
  bass: "#FF0000",       // 빨강 - 베이스 (피치 노트)
  snareHihat: "#3498DB", // 파랑 - 스네어/하이햇 (상단 마커)
  kick: "#9B59B6",       // 보라 - 킥 드럼 (하단 마커)
};

/**
 * Mock 노트 데이터 타입
 */
interface Note {
  time: number;      // 시작 시간 (초)
  pitch: number;     // 0-1 정규화된 피치 (0=낮음, 1=높음)
  duration: number;  // 길이 (초)
  volume: number;    // 0-1 볼륨
}

interface DrumHit {
  time: number;
  intensity: number; // 0-1
}

/**
 * Stem Visuals Canvas 컴포넌트
 * 5색상 스템 시각화 (Vocals, Melody, Bass, Snare/HiHat, Kick)
 */
export function StemVisualsCanvas({
  deck,
  zoomLevel,
  width,
  height,
}: StemVisualsCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Mock 스템 데이터 생성
   */
  const generateMockStems = (duration: number, bpm: number) => {
    const beatDuration = 60 / bpm;
    const notes: { vocals: Note[]; melody: Note[]; bass: Note[] } = {
      vocals: [],
      melody: [],
      bass: [],
    };
    const drums: { kick: DrumHit[]; snareHihat: DrumHit[] } = {
      kick: [],
      snareHihat: [],
    };

    // 보컬 노트 생성 (불규칙한 멜로디)
    for (let t = 0; t < duration; t += beatDuration * (2 + Math.random() * 2)) {
      if (Math.random() > 0.3) {
        notes.vocals.push({
          time: t,
          pitch: 0.5 + Math.random() * 0.4, // 중상단
          duration: beatDuration * (1 + Math.random() * 2),
          volume: 0.6 + Math.random() * 0.4,
        });
      }
    }

    // 멜로디 노트 생성 (중간 빈도)
    for (let t = 0; t < duration; t += beatDuration * (0.5 + Math.random())) {
      if (Math.random() > 0.4) {
        notes.melody.push({
          time: t,
          pitch: 0.3 + Math.random() * 0.4, // 중간
          duration: beatDuration * (0.5 + Math.random()),
          volume: 0.5 + Math.random() * 0.5,
        });
      }
    }

    // 베이스 노트 생성 (낮은 빈도, 긴 음)
    for (let t = 0; t < duration; t += beatDuration * 2) {
      if (Math.random() > 0.2) {
        notes.bass.push({
          time: t,
          pitch: 0.1 + Math.random() * 0.2, // 하단
          duration: beatDuration * (1 + Math.random() * 2),
          volume: 0.7 + Math.random() * 0.3,
        });
      }
    }

    // 킥 드럼 (4비트마다)
    for (let t = 0; t < duration; t += beatDuration) {
      drums.kick.push({
        time: t,
        intensity: 0.6 + Math.random() * 0.4,
      });
    }

    // 스네어/하이햇 (2/4비트 + 오프비트)
    for (let t = beatDuration; t < duration; t += beatDuration * 2) {
      drums.snareHihat.push({
        time: t,
        intensity: 0.7 + Math.random() * 0.3,
      });
      // 하이햇 (8비트)
      drums.snareHihat.push({
        time: t + beatDuration * 0.5,
        intensity: 0.3 + Math.random() * 0.3,
      });
    }

    return { notes, drums };
  };

  /**
   * Canvas 렌더링
   */
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Canvas 크기 설정
    canvas.width = width;
    canvas.height = height;

    // 배경
    ctx.fillStyle = "#0a0a14";
    ctx.fillRect(0, 0, width, height);

    if (!deck.file) {
      ctx.fillStyle = "#333";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("No Track Loaded", width / 2, height / 2);
      return;
    }

    const duration = deck.duration || 180;
    const { notes, drums } = generateMockStems(duration, deck.bpm);

    // 시간 → X 좌표 변환
    const timeToX = (time: number) => (time / duration) * width;

    // 영역 분할
    const drumTopHeight = height * 0.12;   // 스네어/하이햇 영역 (상단)
    const drumBottomHeight = height * 0.12; // 킥 영역 (하단)
    const pitchAreaTop = drumTopHeight;
    const pitchAreaHeight = height - drumTopHeight - drumBottomHeight;

    // 1. 킥 드럼 렌더링 (하단 마커)
    drums.kick.forEach((hit) => {
      const x = timeToX(hit.time);
      const markerHeight = drumBottomHeight * hit.intensity;

      // 그라데이션 마커
      const gradient = ctx.createLinearGradient(x, height, x, height - markerHeight);
      gradient.addColorStop(0, STEM_COLORS.kick);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 2, height - markerHeight, 4, markerHeight);
    });

    // 2. 스네어/하이햇 렌더링 (상단 마커)
    drums.snareHihat.forEach((hit) => {
      const x = timeToX(hit.time);
      const markerHeight = drumTopHeight * hit.intensity;

      const gradient = ctx.createLinearGradient(x, 0, x, markerHeight);
      gradient.addColorStop(0, STEM_COLORS.snareHihat);
      gradient.addColorStop(1, "transparent");

      ctx.fillStyle = gradient;
      ctx.fillRect(x - 2, 0, 4, markerHeight);
    });

    // 3. 베이스 노트 렌더링 (빨강)
    if (!deck.stemMutes.bass) {
      notes.bass.forEach((note) => {
        const x = timeToX(note.time);
        const noteWidth = timeToX(note.duration);
        const y = pitchAreaTop + pitchAreaHeight * (1 - note.pitch);

        ctx.fillStyle = `rgba(255, 0, 0, ${note.volume * 0.8})`;
        ctx.fillRect(x, y - 2, noteWidth, 4);
      });
    }

    // 4. 멜로디 노트 렌더링 (주황)
    if (!deck.stemMutes.melody) {
      notes.melody.forEach((note) => {
        const x = timeToX(note.time);
        const noteWidth = timeToX(note.duration);
        const y = pitchAreaTop + pitchAreaHeight * (1 - note.pitch);

        ctx.fillStyle = `rgba(255, 165, 0, ${note.volume * 0.8})`;
        ctx.fillRect(x, y - 2, noteWidth, 4);
      });
    }

    // 5. 보컬 노트 렌더링 (녹색) - 최상단
    if (!deck.stemMutes.vocal) {
      notes.vocals.forEach((note) => {
        const x = timeToX(note.time);
        const noteWidth = timeToX(note.duration);
        const y = pitchAreaTop + pitchAreaHeight * (1 - note.pitch);

        // 보컬은 곡선으로 표현
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.bezierCurveTo(
          x + noteWidth * 0.3, y - 5,
          x + noteWidth * 0.7, y + 5,
          x + noteWidth, y
        );
        ctx.strokeStyle = `rgba(0, 255, 0, ${note.volume})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      });
    }

    // 비트 그리드 (가는 세로선)
    ctx.strokeStyle = "rgba(255,255,255,0.05)";
    ctx.lineWidth = 1;
    const beatDuration = 60 / deck.bpm;
    for (let t = 0; t < duration; t += beatDuration) {
      const x = timeToX(t);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }
  }, [deck, zoomLevel, width, height]);

  return (
    <canvas
      ref={canvasRef}
      className="w-full h-full"
      style={{ imageRendering: "auto" }}
    />
  );
}

export default StemVisualsCanvas;
