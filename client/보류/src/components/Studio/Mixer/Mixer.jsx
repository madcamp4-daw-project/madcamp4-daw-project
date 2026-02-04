import React, { useRef, useEffect } from 'react';
import useProjectStore from '../../../store/useProjectStore';
import styles from './Mixer.module.css';

const Mixer = () => {
    const inserts = useProjectStore(state => state.mixer.inserts);
    const setMixerVolume = useProjectStore(state => state.setMixerVolume);
    const setSelectedInsertId = useProjectStore(state => state.setSelectedInsertId);
    const toggleMute = useProjectStore(state => state.toggleMute);
    const toggleSolo = useProjectStore(state => state.toggleSolo);

    const meterRefs = useRef([]);

    useEffect(() => {
        // Tone.Meter 연동 시 여기서 애니메이션
    }, []);

    const handleVolume = (id, e) => {
        setMixerVolume(id, parseFloat(e.target.value));
    };

    return (
        <div className={styles.mixerContainer}>
            {inserts.map((insert, idx) => (
                <div
                    key={insert.id}
                    className={`${styles.channelStrip} ${insert.id === 0 ? styles.masterStrip : ''}`}
                    onClick={() => setSelectedInsertId(insert.id)}
                >
                    {insert.id > 0 && (
                        <>
                            <div className={styles.fxRow}>
                                <span className={styles.fxLabel}>Post</span>
                                <button type="button" className={styles.fxSlot} title="FX">FX</button>
                            </div>
                            <div className={styles.sendsRow}>
                                <span className={styles.sendsLabel}>Sends</span>
                            </div>
                        </>
                    )}
                    <div className={styles.meterContainer}>
                        <div
                            className={styles.meterLevel}
                            ref={el => (meterRefs.current[idx] = el)}
                            style={{ height: '30%' }}
                        />
                    </div>
                    <div className={styles.faderArea}>
                        <input
                            type="range"
                            min="-60"
                            max="6"
                            step="0.1"
                            value={insert.vol}
                            onChange={(e) => handleVolume(insert.id, e)}
                            className={styles.volumeSlider}
                            title={`${insert.vol.toFixed(1)} dB`}
                        />
                    </div>
                    <div className={styles.msrwiRow}>
                        <button
                            type="button"
                            className={`${styles.msrwiBtn} ${insert.mute ? styles.muteActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleMute(insert.id); }}
                            title="Mute"
                        >
                            M
                        </button>
                        <button
                            type="button"
                            className={`${styles.msrwiBtn} ${insert.solo ? styles.soloActive : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleSolo(insert.id); }}
                            title="Solo"
                        >
                            S
                        </button>
                        {insert.id > 0 && (
                            <>
                                <button type="button" className={styles.msrwiBtn} title="Record Arm">R</button>
                                <button type="button" className={styles.msrwiBtn} title="Write">W</button>
                                <button type="button" className={styles.msrwiBtn} title="Input">I</button>
                            </>
                        )}
                    </div>
                    {insert.id > 0 && (
                        <div className={styles.ioRow}>
                            <select className={styles.ioSelect} title="Input" defaultValue="">
                                <option value="">In</option>
                            </select>
                            <select className={styles.ioSelect} title="Output" defaultValue="master">
                                <option value="master">Master</option>
                            </select>
                        </div>
                    )}
                    <div className={styles.stripHeader}>{insert.name}</div>
                </div>
            ))}
        </div>
    );
};

export default Mixer;
