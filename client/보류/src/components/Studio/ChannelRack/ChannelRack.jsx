import React from 'react';
import ChannelRow from './ChannelRow';
import styles from './ChannelRack.module.css';
import useProjectStore from '../../../store/useProjectStore';

const ChannelRack = () => {
    const channels = useProjectStore((state) => state.channels);
    const patternName = useProjectStore((state) => 
        state.patterns[state.activePatternId]?.name
    );

    return (
        <div className={styles.rackContainer}>
            <div className={styles.rackHeader}>
                <span>{patternName || 'Pattern'}</span>
                {/* Add + Button here for new channels later */}
                <button style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer' }}>+</button>
            </div>
            
            <div className={styles.channelList}>
                {channels.map((ch) => (
                    <ChannelRow key={ch.id} channel={ch} />
                ))}
            </div>
        </div>
    );
};

export default ChannelRack;
