import React, { useEffect } from 'react';
import Toolbar from '../components/Studio/Toolbar/Toolbar';
import FileBrowser from '../components/Studio/Browser/FileBrowser';
import ChannelRack from '../components/Studio/ChannelRack/ChannelRack';
import PianoRoll from '../components/Studio/PianoRoll/PianoRoll';
import Playlist from '../components/Studio/Playlist/Playlist';
import Mixer from '../components/Studio/Mixer/Mixer';
import LeftFxPanel from '../components/Studio/LeftFxPanel/LeftFxPanel';
import AudioFxBrowser from '../components/Studio/Browser/AudioFxBrowser';
import AudioEngine from '../components/Studio/AudioEngine/AudioEngine';
import CompositionKeyboard from '../components/CompositionKeyboard/CompositionKeyboard';
import { instrumentManager } from '../utils/instrumentManager';
import styles from './StudioPage.module.css';

const StudioPage = () => {
    useEffect(() => {
        instrumentManager.initialize();
    }, []);

    return (
        <div className={styles.studioContainer}>
            <AudioEngine />

            <div className={styles.topPanel}>
                <Toolbar />
            </div>

            <div className={styles.mainWorkspace}>
                <div className={styles.leftFxColumn}>
                    <LeftFxPanel />
                </div>
                <div className={styles.centerColumn}>
                    <div className={styles.arrangementGrid}>
                        <div className={styles.playlistArea}>
                            <Playlist />
                        </div>
                        <div className={styles.channelRackArea}>
                            <ChannelRack />
                        </div>
                    </div>
                </div>
                <div className={styles.browserColumn}>
                    <div className={styles.browserFiles}>
                        <FileBrowser />
                    </div>
                    <div className={styles.browserFx}>
                        <AudioFxBrowser />
                    </div>
                </div>
            </div>

            <div className={styles.consoleSection}>
                <Mixer />
            </div>

            <div className={styles.pianoRollSection}>
                <PianoRoll />
            </div>

            <div className={styles.instrumentRackSection}>
                <CompositionKeyboard
                    padId="studio"
                    previewMode={false}
                    type="synth"
                    instrumentManager={instrumentManager}
                    onClose={() => {}}
                    embedded={true}
                />
            </div>
        </div>
    );
};

export default StudioPage;
