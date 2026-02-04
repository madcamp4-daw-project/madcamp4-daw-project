import React from 'react';
import { useShallow } from 'zustand/react/shallow';
import StepSequencer from './StepSequencer';
import styles from './ChannelRack.module.css';
import useProjectStore from '../../../store/useProjectStore';

const ChannelRow = ({ channel }) => {
    // 객체를 반환하는 셀렉터는 useShallow로 감싸야 매 렌더마다 새 참조로 인한 무한 리렌더 방지
    const { vol, pan, setChannelVolume, setChannelPan } = useProjectStore(
        useShallow((state) => ({
            vol: channel.vol,
            pan: channel.pan,
            setChannelVolume: state.setChannelVolume,
            setChannelPan: state.setChannelPan,
        }))
    );

    // Placeholder for knob interaction
    // In real implementation, this would use a drag handler
    const handleVolChange = () => {
        const newVal = vol === 0 ? -6 : 0; // Toggle for demo
        setChannelVolume(channel.id, newVal);
    };

    return (
        <div className={styles.channelRow}>
            {/* Controls Left Side */}
            <div className={styles.channelControls}>
                <div 
                    className={styles.knob} 
                    onClick={handleVolChange}
                    title={`Vol: ${vol}`}
                    style={{ transform: `scale(${0.8 + (vol + 60)/100})` }} // Mock visual
                />
                <div className={styles.knob} title={`Pan: ${pan}`} />
                <span className={styles.channelName}>{channel.name}</span>
            </div>

            {/* Sequencer Right Side */}
            <StepSequencer channelId={channel.id} />
        </div>
    );
};

export default ChannelRow;
