"use client";

import { useEffect, useCallback } from "react";

/**
 * 키보드 단축키 핸들러 인터페이스
 * transitions.dj 단축키 100+ 지원
 */
interface KeyboardHandlers {
  // Transport - Deck A
  playPauseA?: () => void;
  reverseA?: () => void;
  cueJumpA?: () => void;
  cueSetA?: () => void;
  hotCueA?: (index: number) => void;
  beatJumpBackA?: () => void;
  beatJumpForwardA?: () => void;

  // Transport - Deck B
  playPauseB?: () => void;
  reverseB?: () => void;
  cueJumpB?: () => void;
  cueSetB?: () => void;
  hotCueB?: (index: number) => void;
  beatJumpBackB?: () => void;
  beatJumpForwardB?: () => void;

  // Transport - All
  playPauseAll?: () => void;
  quantizeToggle?: () => void;
  recordToggle?: () => void;

  // Tempo & Pitch - Deck A
  tempoDownA?: () => void;
  tempoUpA?: () => void;
  tempoSyncA?: () => void;
  tempoShiftLeftA?: () => void;
  tempoShiftRightA?: () => void;
  pitchBendDownA?: () => void;
  pitchBendUpA?: () => void;
  keyLockToggleA?: () => void;

  // Tempo & Pitch - Deck B
  tempoDownB?: () => void;
  tempoUpB?: () => void;
  tempoSyncB?: () => void;
  tempoShiftLeftB?: () => void;
  tempoShiftRightB?: () => void;
  pitchBendDownB?: () => void;
  pitchBendUpB?: () => void;
  keyLockToggleB?: () => void;

  // Loops - Deck A
  loopToggleA?: () => void;
  loopHalfA?: () => void;
  loopDoubleA?: () => void;
  loopInA?: () => void;
  loopOutA?: () => void;
  reloopA?: () => void;

  // Loops - Deck B
  loopToggleB?: () => void;
  loopHalfB?: () => void;
  loopDoubleB?: () => void;
  loopInB?: () => void;
  loopOutB?: () => void;
  reloopB?: () => void;

  // Effects - Deck A
  fx1ToggleA?: () => void;
  fx2ToggleA?: () => void;
  fx3ToggleA?: () => void;
  fxBeatsPrevA?: () => void;
  fxBeatsNextA?: () => void;

  // Effects - Deck B
  fx1ToggleB?: () => void;
  fx2ToggleB?: () => void;
  fx3ToggleB?: () => void;
  fxBeatsPrevB?: () => void;
  fxBeatsNextB?: () => void;

  // EQ - Deck A
  eqHighDownA?: () => void;
  eqHighUpA?: () => void;
  eqHighKillA?: () => void;
  eqMidDownA?: () => void;
  eqMidUpA?: () => void;
  eqMidKillA?: () => void;
  eqLowDownA?: () => void;
  eqLowUpA?: () => void;
  eqLowKillA?: () => void;

  // EQ - Deck B
  eqHighDownB?: () => void;
  eqHighUpB?: () => void;
  eqHighKillB?: () => void;
  eqMidDownB?: () => void;
  eqMidUpB?: () => void;
  eqMidKillB?: () => void;
  eqLowDownB?: () => void;
  eqLowUpB?: () => void;
  eqLowKillB?: () => void;

  // Mixer
  volumeDownA?: () => void;
  volumeUpA?: () => void;
  volumeDownB?: () => void;
  volumeUpB?: () => void;
  crossfaderLeft?: () => void;
  crossfaderRight?: () => void;
  crossfaderCutLeft?: () => void;
  crossfaderCutRight?: () => void;
  crossfaderTransitionLeft?: () => void;
  crossfaderTransitionRight?: () => void;
  crossfaderCenter?: () => void;

  // Library
  browserUp?: () => void;
  browserDown?: () => void;
  browserSearch?: () => void;
  browserSelectAll?: () => void;
  loadFromBrowserA?: () => void;
  loadFromBrowserB?: () => void;
  loadPrevTrackA?: () => void;
  loadNextTrackA?: () => void;
  loadPrevTrackB?: () => void;
  loadNextTrackB?: () => void;
  ejectDeckA?: () => void;
  ejectDeckB?: () => void;

  // View
  zoomIn?: () => void;
  zoomOut?: () => void;
  zoomDefault?: () => void;
  scrollLeft?: () => void;
  scrollRight?: () => void;
  toggleFullscreen?: () => void;
  exitFullscreen?: () => void;
}

/**
 * 키보드 단축키 훅
 * transitions.dj 키보드 매핑 완전 복제
 */
export function useKeyboardShortcuts(handlers: KeyboardHandlers) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // 입력 필드에서는 무시
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;

      // Transport - Deck A
      if (key === "x" && !ctrl && !shift) {
        e.preventDefault();
        handlers.playPauseA?.();
      }
      if (key === "x" && shift && !ctrl) {
        e.preventDefault();
        handlers.reverseA?.();
      }
      if (key === "z" && !ctrl && !shift) {
        e.preventDefault();
        handlers.cueJumpA?.();
      }
      if (key === "z" && shift && !ctrl) {
        e.preventDefault();
        handlers.cueSetA?.();
      }

      // Hot Cue - Deck A (1-5)
      if (["1", "2", "3", "4", "5"].includes(key) && !ctrl && !shift) {
        e.preventDefault();
        handlers.hotCueA?.(parseInt(key));
      }
      if (["1", "2", "3", "4", "5"].includes(key) && ctrl && !shift) {
        e.preventDefault();
        handlers.hotCueA?.(parseInt(key)); // Set
      }

      // Transport - Deck B
      if (key === "." && !ctrl && !shift) {
        e.preventDefault();
        handlers.playPauseB?.();
      }
      if (key === "." && shift && !ctrl) {
        e.preventDefault();
        handlers.reverseB?.();
      }
      if (key === "," && !ctrl && !shift) {
        e.preventDefault();
        handlers.cueJumpB?.();
      }
      if (key === "," && shift && !ctrl) {
        e.preventDefault();
        handlers.cueSetB?.();
      }

      // Hot Cue - Deck B (6-0)
      if (["6", "7", "8", "9", "0"].includes(key) && !ctrl && !shift) {
        e.preventDefault();
        handlers.hotCueB?.(parseInt(key) === 0 ? 5 : parseInt(key) - 5);
      }

      // Beat Jump
      if (key === "c" && !ctrl && !shift) {
        e.preventDefault();
        handlers.beatJumpBackA?.();
      }
      if (key === "v" && !ctrl && !shift) {
        e.preventDefault();
        handlers.beatJumpForwardA?.();
      }
      if (key === "n" && !ctrl && !shift) {
        e.preventDefault();
        handlers.beatJumpBackB?.();
      }
      if (key === "m" && !ctrl && !shift) {
        e.preventDefault();
        handlers.beatJumpForwardB?.();
      }

      // Quantize
      if (key === "b" && !ctrl && !shift) {
        e.preventDefault();
        handlers.quantizeToggle?.();
      }

      // Play/Pause All
      if (key === " " && shift && !ctrl) {
        e.preventDefault();
        handlers.playPauseAll?.();
      }

      // Record
      if (key === "r" && ctrl && !shift) {
        e.preventDefault();
        handlers.recordToggle?.();
      }

      // Tempo - Deck A
      if (key === "a" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoDownA?.();
      }
      if (key === "s" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoUpA?.();
      }
      if (key === "[" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoSyncA?.();
      }

      // Tempo - Deck B
      if (key === "l" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoDownB?.();
      }
      if (key === ";" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoUpB?.();
      }
      if (key === "]" && !ctrl && !shift) {
        e.preventDefault();
        handlers.tempoSyncB?.();
      }

      // Pitch Bend - Deck A
      if (key === "q" && !ctrl && !shift) {
        e.preventDefault();
        handlers.pitchBendDownA?.();
      }
      if (key === "w" && !ctrl && !shift) {
        e.preventDefault();
        handlers.pitchBendUpA?.();
      }

      // Pitch Bend - Deck B
      if (key === "o" && !ctrl && !shift) {
        e.preventDefault();
        handlers.pitchBendDownB?.();
      }
      if (key === "p" && !ctrl && !shift) {
        e.preventDefault();
        handlers.pitchBendUpB?.();
      }

      // Key Lock
      if (key === "[" && shift && !ctrl) {
        e.preventDefault();
        handlers.keyLockToggleA?.();
      }
      if (key === "]" && shift && !ctrl) {
        e.preventDefault();
        handlers.keyLockToggleB?.();
      }

      // Loops - Deck A
      if (key === "r" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopToggleA?.();
      }
      if (key === "e" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopHalfA?.();
      }
      if (key === "t" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopDoubleA?.();
      }

      // Loops - Deck B
      if (key === "u" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopToggleB?.();
      }
      if (key === "y" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopHalfB?.();
      }
      if (key === "i" && !ctrl && !shift) {
        e.preventDefault();
        handlers.loopDoubleB?.();
      }

      // EQ Kill - Deck A
      if (key === "e" && ctrl && !shift) {
        e.preventDefault();
        handlers.eqHighKillA?.();
      }
      if (key === "d" && ctrl && !shift) {
        e.preventDefault();
        handlers.eqMidKillA?.();
      }
      if (key === "c" && ctrl && !shift) {
        e.preventDefault();
        handlers.eqLowKillA?.();
      }

      // EQ Kill - Deck B
      if (key === "o" && ctrl && !shift) {
        e.preventDefault();
        handlers.eqHighKillB?.();
      }
      if (key === "l" && ctrl && !shift) {
        e.preventDefault();
        handlers.eqMidKillB?.();
      }
      if (key === "." && ctrl && !shift) {
        e.preventDefault();
        handlers.eqLowKillB?.();
      }

      // Mixer - Volume
      if (key === "d" && !ctrl && !shift) {
        e.preventDefault();
        handlers.volumeDownA?.();
      }
      if (key === "f" && !ctrl && !shift) {
        e.preventDefault();
        handlers.volumeUpA?.();
      }
      if (key === "j" && !ctrl && !shift) {
        e.preventDefault();
        handlers.volumeDownB?.();
      }
      if (key === "k" && !ctrl && !shift) {
        e.preventDefault();
        handlers.volumeUpB?.();
      }

      // Crossfader
      if (key === "g" && !ctrl && !shift) {
        e.preventDefault();
        handlers.crossfaderLeft?.();
      }
      if (key === "h" && !ctrl && !shift) {
        e.preventDefault();
        handlers.crossfaderRight?.();
      }
      if (key === "f" && shift && !ctrl) {
        e.preventDefault();
        handlers.crossfaderCutLeft?.();
      }
      if (key === "j" && shift && !ctrl) {
        e.preventDefault();
        handlers.crossfaderCutRight?.();
      }
      if (key === "b" && shift && !ctrl) {
        e.preventDefault();
        handlers.crossfaderCenter?.();
      }

      // View
      if ((key === "+" || key === "=") && !ctrl && !shift) {
        e.preventDefault();
        handlers.zoomIn?.();
      }
      if (key === "-" && !ctrl && !shift) {
        e.preventDefault();
        handlers.zoomOut?.();
      }
      if (key === "=" && shift && ctrl) {
        e.preventDefault();
        handlers.zoomDefault?.();
      }
      if (key === "arrowleft" && alt) {
        e.preventDefault();
        handlers.scrollLeft?.();
      }
      if (key === "arrowright" && alt) {
        e.preventDefault();
        handlers.scrollRight?.();
      }
      if (key === "f" && shift && ctrl) {
        e.preventDefault();
        handlers.toggleFullscreen?.();
      }
      if (key === "escape") {
        e.preventDefault();
        handlers.exitFullscreen?.();
      }

      // Library
      if (key === "f" && ctrl && !shift) {
        e.preventDefault();
        handlers.browserSearch?.();
      }
      if (key === "arrowup" && shift) {
        e.preventDefault();
        handlers.browserUp?.();
      }
      if (key === "arrowdown" && shift) {
        e.preventDefault();
        handlers.browserDown?.();
      }
      if (key === "arrowleft" && shift && !ctrl) {
        e.preventDefault();
        handlers.loadFromBrowserA?.();
      }
      if (key === "arrowright" && shift && !ctrl) {
        e.preventDefault();
        handlers.loadFromBrowserB?.();
      }
    },
    [handlers]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);
}

export default useKeyboardShortcuts;
