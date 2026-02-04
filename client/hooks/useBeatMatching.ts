"use client";

import { useState, useCallback, useEffect, useRef } from "react";

/**
 * 비트매칭 상태 인터페이스
 * SYNC/BEAT 기능을 위한 상태 관리
 */
export interface BeatMatchState {
  tempoSync: boolean;       // SYNC 버튼 활성화 (BPM 동기화)
  beatLock: boolean;        // BEAT 버튼 활성화 (비트 위상 잠금)
  beatGridA: number[];      // Deck A 비트 타임스탬프 (초)
  beatGridB: number[];      // Deck B 비트 타임스탬프 (초)
  downbeatsA: number[];     // Deck A 다운비트 (마디 첫 박)
  downbeatsB: number[];     // Deck B 다운비트
  bpmA: number;             // Deck A 현재 BPM
  bpmB: number;             // Deck B 현재 BPM
  originalBpmA: number;     // Deck A 원본 BPM
  originalBpmB: number;     // Deck B 원본 BPM
  phaseDifference: number;  // 비트 위상 차이 (ms)
  isAligned: boolean;       // 비트 정렬 완료 여부
}

/**
 * 섹션 정보 인터페이스
 */
export interface Section {
  name: "Intro" | "Verse" | "Chorus" | "Break" | "Outro";
  start: number;  // 시작 시간 (초)
  end: number;    // 종료 시간 (초)
}

interface UseBeatMatchingOptions {
  onBpmChangeA?: (bpm: number) => void;
  onBpmChangeB?: (bpm: number) => void;
  onPhaseAdjust?: (adjustMs: number) => void;
}

/**
 * 비트매칭 훅
 * Deck A와 Deck B 간의 BPM 동기화 및 비트 위상 정렬 기능
 */
export function useBeatMatching(options?: UseBeatMatchingOptions) {
  const [state, setState] = useState<BeatMatchState>({
    tempoSync: false,
    beatLock: false,
    beatGridA: [],
    beatGridB: [],
    downbeatsA: [],
    downbeatsB: [],
    bpmA: 120,
    bpmB: 120,
    originalBpmA: 120,
    originalBpmB: 120,
    phaseDifference: 0,
    isAligned: false,
  });

  const animationRef = useRef<number>(0);

  /**
   * 비트 그리드 설정
   * 백엔드 분석 결과를 적용
   */
  const setBeatGrid = useCallback(
    (deck: "A" | "B", beats: number[], downbeats: number[], bpm: number) => {
      setState((prev) => ({
        ...prev,
        [`beatGrid${deck}`]: beats,
        [`downbeats${deck}`]: downbeats,
        [`bpm${deck}`]: bpm,
        [`originalBpm${deck}`]: bpm,
      }));
    },
    []
  );

  /**
   * SYNC 버튼 핸들러
   * 상대 덱의 BPM에 맞춤
   */
  const syncTempo = useCallback(
    (sourceDeck: "A" | "B") => {
      setState((prev) => {
        const targetBpm = sourceDeck === "A" ? prev.bpmA : prev.bpmB;
        if (sourceDeck === "A") {
          options?.onBpmChangeB?.(targetBpm);
          return { ...prev, bpmB: targetBpm, tempoSync: true };
        } else {
          options?.onBpmChangeA?.(targetBpm);
          return { ...prev, bpmA: targetBpm, tempoSync: true };
        }
      });
    },
    [options]
  );

  /**
   * BPM 변경 핸들러
   * 피치/템포 조절 시 호출
   */
  const changeBpm = useCallback(
    (deck: "A" | "B", newBpm: number) => {
      setState((prev) => ({
        ...prev,
        [`bpm${deck}`]: newBpm,
        tempoSync: false, // BPM 변경 시 동기화 해제
      }));
    },
    []
  );

  /**
   * 가장 가까운 비트 찾기
   * 현재 재생 위치에서 가장 가까운 비트의 인덱스 반환
   */
  const findNearestBeat = useCallback(
    (currentTime: number, beatGrid: number[]): number => {
      if (beatGrid.length === 0) return -1;

      let nearestIdx = 0;
      let minDiff = Math.abs(beatGrid[0] - currentTime);

      for (let i = 1; i < beatGrid.length; i++) {
        const diff = Math.abs(beatGrid[i] - currentTime);
        if (diff < minDiff) {
          minDiff = diff;
          nearestIdx = i;
        }
      }

      return nearestIdx;
    },
    []
  );

  /**
   * 비트 위상 차이 계산
   * 두 덱의 현재 비트 위상 차이를 밀리초로 반환
   */
  const calculatePhaseDifference = useCallback(
    (currentTimeA: number, currentTimeB: number): number => {
      const { beatGridA, beatGridB, bpmA, bpmB } = state;

      if (beatGridA.length === 0 || beatGridB.length === 0) return 0;

      // 각 덱의 현재 비트 위상 (0~1)
      const beatIntervalA = 60 / bpmA;
      const beatIntervalB = 60 / bpmB;

      const phaseA = (currentTimeA % beatIntervalA) / beatIntervalA;
      const phaseB = (currentTimeB % beatIntervalB) / beatIntervalB;

      // 위상 차이 (-0.5 ~ 0.5)
      let phaseDiff = phaseA - phaseB;
      if (phaseDiff > 0.5) phaseDiff -= 1;
      if (phaseDiff < -0.5) phaseDiff += 1;

      // 밀리초로 변환
      return phaseDiff * beatIntervalA * 1000;
    },
    [state]
  );

  /**
   * BEAT 버튼 핸들러
   * 비트 위상 정렬 토글
   */
  const toggleBeatLock = useCallback(
    (currentTimeA: number, currentTimeB: number) => {
      const phaseDiff = calculatePhaseDifference(currentTimeA, currentTimeB);

      setState((prev) => ({
        ...prev,
        beatLock: !prev.beatLock,
        phaseDifference: phaseDiff,
        isAligned: Math.abs(phaseDiff) < 10, // 10ms 이내면 정렬됨
      }));

      if (!state.beatLock) {
        // Beat Lock 활성화 시 위상 조정
        options?.onPhaseAdjust?.(-phaseDiff);
      }
    },
    [state.beatLock, calculatePhaseDifference, options]
  );

  /**
   * 섹션 경계 감지
   * 8바/32비트 단위의 섹션 경계에서 트랜지션 포인트 식별
   */
  const findSectionBoundaries = useCallback(
    (downbeats: number[], bpm: number): number[] => {
      // 8바 = 32비트 = 8 다운비트
      const boundaries: number[] = [];
      for (let i = 0; i < downbeats.length; i += 8) {
        if (downbeats[i] !== undefined) {
          boundaries.push(downbeats[i]);
        }
      }
      return boundaries;
    },
    []
  );

  /**
   * 다음 섹션 경계까지 남은 시간
   */
  const getTimeToNextBoundary = useCallback(
    (currentTime: number, deck: "A" | "B"): number => {
      const downbeats = deck === "A" ? state.downbeatsA : state.downbeatsB;
      const bpm = deck === "A" ? state.bpmA : state.bpmB;
      const boundaries = findSectionBoundaries(downbeats, bpm);

      for (const boundary of boundaries) {
        if (boundary > currentTime) {
          return boundary - currentTime;
        }
      }

      return -1; // 더 이상 경계 없음
    },
    [state, findSectionBoundaries]
  );

  /**
   * 자동 트랜지션 시점 추천
   * Intro, Outro 등 적절한 트랜지션 포인트 반환
   */
  const suggestTransitionPoint = useCallback(
    (
      sectionsA: Section[],
      sectionsB: Section[],
      currentTimeA: number
    ): { fadeOutStart: number; fadeInStart: number } | null => {
      // Deck A의 Outro 또는 마지막 Chorus 이후 시작
      const outroA = sectionsA.find((s) => s.name === "Outro");
      const lastChorusA = [...sectionsA]
        .reverse()
        .find((s) => s.name === "Chorus");

      // Deck B의 Intro 또는 첫 Verse 시작
      const introB = sectionsB.find((s) => s.name === "Intro");

      if (outroA && introB) {
        return {
          fadeOutStart: outroA.start,
          fadeInStart: introB.start,
        };
      }

      if (lastChorusA && introB) {
        return {
          fadeOutStart: lastChorusA.end,
          fadeInStart: introB.start,
        };
      }

      return null;
    },
    []
  );

  /**
   * BPM 차이 계산
   */
  const getBpmDifference = useCallback((): number => {
    return Math.abs(state.bpmA - state.bpmB);
  }, [state.bpmA, state.bpmB]);

  /**
   * BPM 호환성 체크
   * 8% 이내 차이면 호환 가능
   */
  const areBpmsCompatible = useCallback((): boolean => {
    const diff = getBpmDifference();
    const avgBpm = (state.bpmA + state.bpmB) / 2;
    return (diff / avgBpm) * 100 <= 8;
  }, [state.bpmA, state.bpmB, getBpmDifference]);

  return {
    state,
    setBeatGrid,
    syncTempo,
    changeBpm,
    toggleBeatLock,
    calculatePhaseDifference,
    findSectionBoundaries,
    getTimeToNextBoundary,
    suggestTransitionPoint,
    getBpmDifference,
    areBpmsCompatible,
    findNearestBeat,
  };
}

export default useBeatMatching;
