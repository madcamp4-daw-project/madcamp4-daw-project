import { useEffect, useRef, useCallback } from 'react';
import * as Tone from 'tone';
import { useDJStore } from '../store/useDJStore';

/**
 * 오디오 재생 제어 훅
 * Tone.js Player를 사용하여 트랙 재생을 관리합니다.
 * 
 * @param {number} unitIdx - 유닛 인덱스 (1 또는 2)
 * @returns {Object} { play, pause, seek, loadTrack, isPlaying, position, duration }
 */
export const useAudioPlayer = (unitIdx) => {
  const playerRef = useRef(null);
  const positionIntervalRef = useRef(null);
  const deckKey = unitIdx === 1 ? 'deck1' : 'deck2';
  
  // 스토어에서 덱 상태 가져오기
  const deck = useDJStore((state) => state[deckKey]);
  const setDeck = useDJStore((state) => state.setDeck);
  
  /**
   * 오디오 컨텍스트 초기화
   */
  useEffect(() => {
    const initAudio = async () => {
      if (Tone.context.state !== 'running') {
        await Tone.start();
      }
    };
    initAudio();
  }, []);
  
  /**
   * 트랙 로드
   * @param {string} url - 오디오 파일 URL
   */
  const loadTrack = useCallback(async (url) => {
    // 기존 플레이어 정리
    if (playerRef.current) {
      playerRef.current.stop();
      playerRef.current.dispose();
    }
    
    if (!url) {
      playerRef.current = null;
      setDeck(unitIdx, {
        trackId: null,
        trackTitle: null,
        artist: null,
        durationSec: 0,
        positionSec: 0,
        isPlaying: false,
        waveformPeaks: null,
      });
      return;
    }
    
    try {
      // Tone.Player 생성
      const player = new Tone.Player({
        url: url,
        autostart: false,
        onload: () => {
          const duration = player.buffer.duration;
          setDeck(unitIdx, {
            durationSec: duration,
            positionSec: 0,
          });
        },
        onstop: () => {
          setDeck(unitIdx, {
            isPlaying: false,
            positionSec: 0,
          });
          if (positionIntervalRef.current) {
            clearInterval(positionIntervalRef.current);
            positionIntervalRef.current = null;
          }
        },
      }).toDestination();
      
      playerRef.current = player;
    } catch (error) {
      console.error(`Failed to load track for unit ${unitIdx}:`, error);
    }
  }, [unitIdx, setDeck]);
  
  /**
   * 재생 시작/일시정지 토글
   */
  const play = useCallback(() => {
    if (!playerRef.current) return;
    
    const currentState = useDJStore.getState()[deckKey];
    
    if (currentState.isPlaying) {
      // 일시정지
      playerRef.current.stop();
      setDeck(unitIdx, { isPlaying: false });
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
        positionIntervalRef.current = null;
      }
    } else {
      // 재생 시작
      playerRef.current.start();
      setDeck(unitIdx, { isPlaying: true });
      
      // 재생 위치 추적 시작
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      
      const startTime = Tone.now();
      const startOffset = currentState.positionSec || 0;
      
      positionIntervalRef.current = setInterval(() => {
        if (playerRef.current && playerRef.current.state === 'started') {
          const elapsed = Tone.now() - startTime;
          const position = startOffset + elapsed;
          const duration = playerRef.current.buffer?.duration || 0;
          
          if (position >= duration) {
            // 재생 완료
            playerRef.current.stop();
            setDeck(unitIdx, { isPlaying: false, positionSec: 0 });
            clearInterval(positionIntervalRef.current);
            positionIntervalRef.current = null;
          } else {
            setDeck(unitIdx, { positionSec: position });
          }
        }
      }, 100); // 100ms마다 업데이트
    }
  }, [unitIdx, deckKey, setDeck]);
  
  /**
   * 재생 위치 이동 (seek)
   * @param {number} positionSec - 이동할 위치 (초 단위)
   */
  const seek = useCallback((positionSec) => {
    if (!playerRef.current) return;
    
    const duration = playerRef.current.buffer?.duration || 0;
    const clampedPosition = Math.max(0, Math.min(positionSec, duration));
    const wasPlaying = useDJStore.getState()[deckKey].isPlaying;
    
    if (wasPlaying) {
      // 재생 중이면 위치 변경 후 계속 재생
      playerRef.current.stop();
      playerRef.current.start(0, clampedPosition);
    } else {
      // 일시정지 상태면 위치만 변경
      setDeck(unitIdx, { positionSec: clampedPosition });
    }
  }, [unitIdx, deckKey, setDeck]);
  
  /**
   * 정지
   */
  const pause = useCallback(() => {
    if (!playerRef.current) return;
    
    playerRef.current.stop();
    setDeck(unitIdx, { isPlaying: false });
    if (positionIntervalRef.current) {
      clearInterval(positionIntervalRef.current);
      positionIntervalRef.current = null;
    }
  }, [unitIdx, setDeck]);
  
  /**
   * CUE 포인트로 이동
   * @param {number} cueIdx - CUE 인덱스 (1 또는 2)
   */
  const jumpToCue = useCallback((cueIdx) => {
    const currentState = useDJStore.getState()[deckKey];
    const cuePosition = currentState.cues?.[cueIdx];
    
    if (typeof cuePosition === 'number' && cuePosition >= 0) {
      seek(cuePosition);
    }
  }, [unitIdx, deckKey, seek]);
  
  /**
   * 정리
   */
  useEffect(() => {
    return () => {
      if (positionIntervalRef.current) {
        clearInterval(positionIntervalRef.current);
      }
      if (playerRef.current) {
        playerRef.current.stop();
        playerRef.current.dispose();
      }
    };
  }, []);
  
  return {
    play,
    pause,
    seek,
    loadTrack,
    jumpToCue,
    isPlaying: deck.isPlaying,
    position: deck.positionSec,
    duration: deck.durationSec,
  };
};

export default useAudioPlayer;
