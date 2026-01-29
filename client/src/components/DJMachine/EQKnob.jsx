import React from 'react';
import { useDJStore } from '../../store/useDJStore';

/**
 * SoundDial 컴포넌트 속성
 */
interface SoundDialProps {
  unitIdx: 1 | 2;
  dialType: 'mid' | 'bass' | 'filter';
  title: string;
}

/**
 * SoundDial 컴포넌트
 * EQ 및 필터 조절용 회전 다이얼
 */
const SoundDial: React.FC<SoundDialProps> = ({ unitIdx, dialType, title }) => {
  // 해당 다이얼 값만 구독 (불필요한 리렌더링 방지)
  const dialValue = useDJStore((state) => 
    unitIdx === 1 ? state.deck1[dialType] : state.deck2[dialType]
  );

  // 0.0 ~ 1.0 값을 각도(-135도 ~ +135도)로 변환
  const rotationAngle = dialValue * 270 - 135;
  const arcSweep = dialValue * 270;
  const isActive = useDJStore((s) => !!s.activeControls?.[`deck${unitIdx}:${dialType}`]);

  // 색상 변경: 초록/파란 → 보라/오렌지
  const ringColor = unitIdx === 1 ? 'rgba(176, 102, 255, 0.95)' : 'rgba(255, 159, 71, 0.95)';

  return (
    <div className="sound-dial-wrapper" style={{ textAlign: 'center' }}>
      <div className="sound-dial__title">{title}</div>

      {/* 다이얼 구조: (1) 채워지는 링 + (2) 고정 다이얼 + (3) 회전 포인터 */}
      <div className={`sound-dial ${isActive ? 'sound-dial--active' : ''}`}>
        <div
          className="sound-dial__ring"
          style={
            {
              ['--arcSweep' as any]: `${arcSweep}deg`,
              ['--ringColor' as any]: ringColor,
            } as React.CSSProperties
          }
          aria-hidden="true"
        />
        <div className="sound-dial__base">
          <div className="sound-dial__needle" style={{ transform: `rotate(${rotationAngle}deg)` }}>
            <div className="sound-dial__indicator" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SoundDial;
