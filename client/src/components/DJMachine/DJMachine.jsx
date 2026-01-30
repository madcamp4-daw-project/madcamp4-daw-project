// MixController.jsx - 메인 DJ 기계 컴포넌트 (리팩토링됨)
// 오디오 믹싱 및 트랙 컨트롤 담당

import React, { useEffect } from 'react';
import TrackDeck from './DeckPanel';
import AudioVisualizer from './WaveformBar';
import { useDJStore } from '../../store/useDJStore';

/**
 * MixController 컴포넌트
 * 두 개의 트랙 덱과 오디오 시각화를 관리하는 메인 컨트롤러
 */
const MixController = () => {
  const setDeck = useDJStore((state) => state.setDeck);
  const setActiveControl = useDJStore((state) => state.setActiveControl);
  const setDial = useDJStore((state) => state.setDial);
  
  /**
   * 키보드 단축키 매핑
   */
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 입력 필드에 포커스가 있으면 무시
      if (
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      ) {
        return;
      }
      
      const key = e.key.toLowerCase();
      const isNumPad = e.location === 3; // 숫자패드
      
      // Unit 1 단축키
      if (key === 'g') {
        e.preventDefault();
        const deck1 = useDJStore.getState().deck1;
        setDeck(1, { isPlaying: !deck1.isPlaying });
      } else if (key === 'v') {
        e.preventDefault();
        // 스크래치 기능 (추후 구현)
        console.log('Unit 1: Scratch');
      } else if (key === '1' && !isNumPad) {
        e.preventDefault();
        const key = 'deck1:cue1';
        const isActive = !!useDJStore.getState().activeControls[key];
        setActiveControl(key, !isActive);
        // CUE 포인트로 이동 (useAudioPlayer 필요)
      } else if (key === '2' && !isNumPad) {
        e.preventDefault();
        const key = 'deck1:cue2';
        const isActive = !!useDJStore.getState().activeControls[key];
        setActiveControl(key, !isActive);
      }
      
      // Unit 2 단축키
      if (key === 'h') {
        e.preventDefault();
        const deck2 = useDJStore.getState().deck2;
        setDeck(2, { isPlaying: !deck2.isPlaying });
      } else if (key === 'n') {
        e.preventDefault();
        // 스크래치 기능 (추후 구현)
        console.log('Unit 2: Scratch');
      } else if (key === '9' && !isNumPad) {
        e.preventDefault();
        const key = 'deck2:cue1';
        const isActive = !!useDJStore.getState().activeControls[key];
        setActiveControl(key, !isActive);
      } else if (key === '0' && !isNumPad) {
        e.preventDefault();
        const key = 'deck2:cue2';
        const isActive = !!useDJStore.getState().activeControls[key];
        setActiveControl(key, !isActive);
      }
      
      // FX 버튼 단축키 (숫자패드)
      if (isNumPad) {
        e.preventDefault();
        const numPadKey = e.code; // 'Numpad1', 'Numpad2' 등
        
        if (numPadKey === 'Numpad1') {
          // Unit 1: CRUSH
          setDeck(1, { fx: 'CRUSH' });
        } else if (numPadKey === 'Numpad2') {
          // Unit 1: FLANGER
          setDeck(1, { fx: 'FLANGER' });
        } else if (numPadKey === 'Numpad4') {
          // Unit 1: SLICER
          setDeck(1, { fx: 'SLICER' });
        } else if (numPadKey === 'Numpad5') {
          // Unit 1: KICK
          setDeck(1, { fx: 'KICK' });
        }
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [setDeck, setActiveControl]);
  
  return (
    <div className="mix-controller">
      {/* 상단 오디오 시각화 바 */}
      <AudioVisualizer variant="top" />
      
      {/* 트랙 덱 패널들 */}
      <div className="mix-controller__units">
        <TrackDeck unitIdx={1} position="left" info={{ title: '', artist: '', bpm: 0, elapsed: '0:00', total: '0:00' }} />
        <TrackDeck unitIdx={2} position="right" info={{ title: '', artist: '', bpm: 0, elapsed: '0:00', total: '0:00' }} />
      </div>
      
      {/* 믹서 패널 (추후 구현) */}
    </div>
  );
};

export default MixController;
