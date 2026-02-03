// MixController.jsx - 메인 DJ 기계 컴포넌트 (리팩토링됨)
// 오디오 믹싱 및 트랙 컨트롤 담당

import React from 'react';
import TrackDeck from './TrackDeck';
import AudioVisualizer from './AudioVisualizer';

/**
 * MixController 컴포넌트
 * 두 개의 트랙 덱과 오디오 시각화를 관리하는 메인 컨트롤러
 */
const MixController = () => {
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
