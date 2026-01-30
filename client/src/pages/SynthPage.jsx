import React, { useEffect } from 'react';
import CompositionKeyboard from '../components/CompositionKeyboard/CompositionKeyboard';
import { instrumentManager } from '../utils/instrumentManager';
import styles from './pages.module.css';

function SynthPage() {
  useEffect(() => {
    // 페이지 로드 시 오디오 컨텍스트 초기화 등을 수행할 수 있음
    instrumentManager.init();
  }, []);

  return (
    <div className={styles.synthPage}>
      <CompositionKeyboard
        previewMode={false}
        type="synth"
        instrumentManager={instrumentManager}
        onClose={() => console.log('Synth closed')}
      />
    </div>
  );
}

export default SynthPage;