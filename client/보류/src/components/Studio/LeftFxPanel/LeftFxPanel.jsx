import React from 'react';
import useProjectStore from '../../../store/useProjectStore';
import styles from './LeftFxPanel.module.css';

/**
 * Sonar 스타일 좌측 Fx 패널
 * 선택된 트랙/채널에 대한 이펙트 + EQ (Low, LoMid, HiMid, High, Gain, Freq, Q)
 */
const EQ_BANDS = [
    { id: 'low', label: 'Low' },
    { id: 'lomid', label: 'LoMid' },
    { id: 'himid', label: 'HiMid' },
    { id: 'high', label: 'High' },
];

const LeftFxPanel = () => {
    const selectedInsertId = useProjectStore((s) => s.selectedInsertId);

    return (
        <div className={styles.panel}>
            <div className={styles.header}>Fx</div>
            <div className={styles.content}>
                {selectedInsertId != null ? (
                    <>
                        <div className={styles.eqSection}>
                            <div className={styles.eqTitle}>EQ</div>
                            {EQ_BANDS.map((band) => (
                                <div key={band.id} className={styles.eqBand}>
                                    <span className={styles.eqBandLabel}>{band.label}</span>
                                    <div className={styles.eqKnobs}>
                                        <label className={styles.eqKnob}>
                                            <span>Gain</span>
                                            <input type="range" min="-12" max="12" defaultValue="0" className={styles.eqSlider} />
                                        </label>
                                        <label className={styles.eqKnob}>
                                            <span>Freq</span>
                                            <input type="range" min="0" max="100" defaultValue="50" className={styles.eqSlider} />
                                        </label>
                                        <label className={styles.eqKnob}>
                                            <span>Q</span>
                                            <input type="range" min="0" max="100" defaultValue="50" className={styles.eqSlider} />
                                        </label>
                                    </div>
                                </div>
                            ))}
                            <div className={styles.eqFilters}>
                                <span className={styles.filterLabel}>HP</span>
                                <input type="range" min="0" max="100" defaultValue="0" className={styles.eqSlider} />
                                <span className={styles.filterLabel}>LP</span>
                                <input type="range" min="0" max="100" defaultValue="100" className={styles.eqSlider} />
                            </div>
                        </div>
                        <div className={styles.fxSlots}>
                            <span className={styles.fxSlotsTitle}>Effects</span>
                            <button type="button" className={styles.fxSlotBtn}>+ FX</button>
                        </div>
                    </>
                ) : (
                    <p className={styles.placeholder}>믹서에서 채널 클릭 시 EQ·이펙트 표시</p>
                )}
            </div>
        </div>
    );
};

export default LeftFxPanel;
