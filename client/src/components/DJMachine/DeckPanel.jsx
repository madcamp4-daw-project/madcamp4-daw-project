import React from 'react';
import { useDJStore } from '../../store/useDJStore';
import { resolveMusicUrl } from '../../api/audioApi';
import SoundDial from './EQKnob';
import VinylPlayer from './Turntable';
import FxButton from './EffectPad';
import AudioVisualizer from './WaveformBar';

/**
 * TrackDeck 컴포넌트
 * 개별 트랙 덱 패널 - 배치 변경: 노브(상단) → 턴테이블 → 웨이브폼 → 패드 → 헤더(하단)
 */
const TrackDeck = ({ unitIdx, position, info }) => {
  // 스토어에서 현재 트랙 유닛 상태 가져오기
  const trackUnit = useDJStore((s) => (unitIdx === 1 ? s.deck1 : s.deck2));
  const cue1Active = useDJStore((s) => !!s.activeControls?.[`deck${unitIdx}:cue1`]);
  const cue2Active = useDJStore((s) => !!s.activeControls?.[`deck${unitIdx}:cue2`]);
  
  // 각 덱별 단축키 설정
  const cue1Key = unitIdx === 1 ? '1' : '9';
  const cue2Key = unitIdx === 1 ? '2' : '0';

  // FX 버튼 배열 (2x3 그리드로 변경)
  const fxButtons = [
    { text: 'cue 1', shortcutKey: cue1Key, style: 'gray', cueIdx: 1 },
    { text: 'slicer', shortcutKey: 'num4', style: 'gray', fx: 'SLICER' },
    { text: 'cue 2', shortcutKey: cue2Key, style: 'gray', cueIdx: 2 },
    { text: 'kick', shortcutKey: 'num5', style: 'gray', fx: 'KICK' },
    { text: 'crush', shortcutKey: 'num1', style: 'gray', fx: 'CRUSH' },
    { text: 'flanger', shortcutKey: 'num2', style: 'gray', fx: 'FLANGER' },
  ];

  return (
    <section className={`track-deck track-deck--${position}`}>
      {/* 노브 (상단으로 이동) */}
      <div className="track-deck__dials">
        <SoundDial unitIdx={unitIdx} dialType="filter" title="FILTER" />
        <SoundDial unitIdx={unitIdx} dialType="mid" title="MID" />
        <SoundDial unitIdx={unitIdx} dialType="bass" title="BASS" />
      </div>

      {/* 턴테이블 (상단) */}
      <div className="track-deck__vinyl">
        <VinylPlayer
          unitIdx={unitIdx}
          spinning={trackUnit.isPlaying}
          playShortcut={unitIdx === 1 ? 'G' : 'H'}
          scratchShortcut={unitIdx === 1 ? 'V' : 'N'}
        />
      </div>

      {/* 웨이브폼 */}
      <div className="track-deck__visualizer">
        <AudioVisualizer unitIdx={unitIdx} variant="deck" />
      </div>

      {/* FX 버튼 패드 (2x3 그리드) */}
      <div className="track-deck__fx-grid">
        {fxButtons.map((btn) => (
          <FxButton
            key={`${btn.text}-${btn.shortcutKey}`}
            text={btn.text}
            shortcutKey={btn.shortcutKey}
            style={btn.style}
            pressed={btn.fx ? trackUnit.fx === btn.fx : btn.cueIdx === 1 ? cue1Active : btn.cueIdx === 2 ? cue2Active : false}
            extraClass={btn.text.includes('cue') ? 'fx-btn--cue' : ''}
          />
        ))}
      </div>

      {/* 헤더 (하단으로 이동) */}
      <footer className="track-deck__footer">
        <div className="track-deck__cover" aria-label="Album cover">
          {trackUnit.coverUrl ? (
            <img
              src={resolveMusicUrl(trackUnit.coverUrl)}
              alt=""
              className="track-deck__cover-img"
              draggable={false}
            />
          ) : (
            <div className="track-deck__cover-placeholder" />
          )}
        </div>
        <div className="track-deck__info">
          <div className="track-deck__title-row">
            <div className="track-deck__title">{trackUnit.trackTitle || info.title}</div>
            <div className="track-deck__fav" aria-hidden="true">♥</div>
          </div>
          <div className="track-deck__artist">{info.artist}</div>
        </div>
        <div className="track-deck__tempo">
          <div className="track-deck__tempo-label">BPM</div>
          <div className="track-deck__tempo-value">{info.bpm}</div>
        </div>
      </footer>

      {/* 시간 표시 */}
      <div className={`track-deck__time-bar ${trackUnit.isPlaying ? 'track-deck__time-bar--active' : ''}`}>
        <div className="track-deck__elapsed">{info.elapsed}</div>
        /<div className="track-deck__total">{info.total}</div>
      </div>
    </section>
  );
};

export default TrackDeck;
