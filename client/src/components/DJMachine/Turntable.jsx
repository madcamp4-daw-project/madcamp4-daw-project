import React from 'react';

/**
 * VinylPlayer 컴포넌트
 * 턴테이블/바이닐 플레이어 UI
 */
const VinylPlayer = ({ spinning, scratchShortcut, playShortcut, unitIdx }) => {
  return (
    <div
      className={`vinyl-player ${unitIdx === 1 ? 'vinyl-player--unit1' : ''} ${spinning ? 'vinyl-player--spinning' : ''}`}
      aria-label="Turntable"
    >
      <div className="vinyl-player__outer-ring" />
      <div className="vinyl-player__record" />
      <div className="vinyl-player__label" />
      <div className="vinyl-player__control" aria-hidden="true">
        <div className="vinyl-player__control-icon">{spinning ? '\u23F8\uFE0E' : '\u25B6\uFE0E'}</div>
        {playShortcut ? <div className="vinyl-player__play-key">{playShortcut}</div> : null}
        <div className="vinyl-player__scratch-key">{scratchShortcut}</div>
      </div>
    </div>
  );
};

export default VinylPlayer;
