import React from 'react';

/**
 * FxButton 컴포넌트
 * 이펙트 및 CUE 트리거 버튼
 */
const FxButton = ({ text, shortcutKey, pressed, style = 'gray', extraClass = '' }) => {
  return (
    <button
      type="button"
      className={`fx-btn fx-btn--${style} ${pressed ? 'fx-btn--pressed' : ''} ${extraClass}`}
      aria-pressed={pressed ? 'true' : 'false'}
    >
      <div className="fx-btn__text">{text}</div>
      {shortcutKey ? <div className="fx-btn__shortcut">{shortcutKey}</div> : null}
    </button>
  );
};

export default FxButton;
