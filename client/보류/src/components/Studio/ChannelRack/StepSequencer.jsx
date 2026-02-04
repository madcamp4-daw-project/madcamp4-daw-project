import React from 'react';
import styles from './ChannelRack.module.css';
import useProjectStore from '../../../store/useProjectStore';

const StepSequencer = ({ channelId }) => {
    // Select specific channel steps from store to prevent re-rendering entire rack
    const steps = useProjectStore((state) => 
        state.patterns[state.activePatternId]?.channels[channelId]
    );
    const toggleStep = useProjectStore((state) => state.toggleStep);

    // TODO: Visualize playhead later using Tone.Transport position
    
    if (!steps) return <div className={styles.sequencer}>Error</div>;

    return (
        <div className={styles.sequencer}>
            {steps.map((isActive, index) => (
                <div
                    key={index}
                    className={`${styles.stepButton} ${isActive ? styles.stepButtonActive : ''}`}
                    onMouseDown={() => toggleStep(channelId, index)} // MouseDown for better feel
                    role="button"
                    title={`Step ${index + 1}`}
                />
            ))}
        </div>
    );
};

export default StepSequencer;
