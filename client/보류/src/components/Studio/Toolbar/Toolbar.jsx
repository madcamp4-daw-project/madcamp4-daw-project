import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import useProjectStore from '../../../store/useProjectStore';
import useTransport from '../../../hooks/useTransport';
import styles from './Toolbar.module.css'; // Creating CSS module next

const Toolbar = () => {
    // 객체를 반환하는 셀렉터는 useShallow로 감싸야 매 렌더마다 새 참조로 인한 무한 리렌더 방지
    const { isPlaying, bpm, setBpm } = useProjectStore(
        useShallow((state) => ({
            isPlaying: state.isPlaying,
            bpm: state.bpm,
            setBpm: state.setBpm,
        }))
    );
    
    const { togglePlay, stop } = useTransport();

    return (
        <div className={styles.toolbarContainer}>
            <div className={styles.transportButtons}>
                <button 
                    onClick={togglePlay}
                    className={`${styles.playButton} ${isPlaying ? styles.playButtonActive : ''}`}
                >
                    {isPlaying ? 'PAUSE' : 'PLAY'}
                </button>
                <button 
                    onClick={stop}
                    className={styles.stopButton}
                >
                    STOP
                </button>
            </div>

            <div className={styles.bpmDisplay}>
                <span className={styles.bpmLabel}>BPM</span>
                <input 
                    type="number" 
                    value={bpm} 
                    onChange={(e) => setBpm(Number(e.target.value))}
                    className={styles.bpmInput}
                />
            </div>
            
            <div className={styles.logo}>
                FL STUDIO CLONE (WEB)
            </div>
        </div>
    );
};

export default Toolbar;
