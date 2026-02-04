import React, { useState } from 'react';
import useProjectStore from '../../../store/useProjectStore';
import styles from './Playlist.module.css';

// 1 Bar = 40px * 4 = 160px visually? Let's say 40px per bar for zoom out view
const BAR_WIDTH = 60; 

const Playlist = () => {
    const tracks = useProjectStore(state => state.playlist.tracks);
    const clips = useProjectStore(state => state.playlist.clips);
    const inserts = useProjectStore(state => state.mixer.inserts);
    const addClip = useProjectStore(state => state.addClip);
    const removeClip = useProjectStore(state => state.removeClip);
    const toggleMute = useProjectStore(state => state.toggleMute);
    const toggleSolo = useProjectStore(state => state.toggleSolo);

    // Simple interaction: Double click on track adds a test pattern clip
    const handleTrackDoubleClick = (trackId, e) => {
        // Calculate Bar position
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const startBar = Math.floor(x / BAR_WIDTH);

        // Demo: Add Pattern 1 Clip
        addClip({
            type: 'pattern',
            patternId: 1, // Hardcoded for demo
            start: startBar,
            duration: 4, // 4 bars
            trackId: trackId,
        });
    };
    
    // Demo: Context menu or right clip to delete
    const handleClipClick = (e, clipId) => {
        e.stopPropagation();
        removeClip(clipId);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('application/json');
        
        // 1. Handle Internal Browser Drag (JSON data)
        if (data) {
            try {
                const file = JSON.parse(data);
                const rect = e.currentTarget.getBoundingClientRect();
                const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
                const y = e.clientY - rect.top + e.currentTarget.scrollTop;
                
                const startBar = Math.floor(x / BAR_WIDTH);
                const trackIndex = Math.floor(y / 60);
                if (trackIndex < 0 || trackIndex >= tracks.length) return;
                const trackId = tracks[trackIndex].id;

                if (file.type === 'audio') {
                    // Ask user if they want to split? For now, we assume direct add for browser samples.
                    // Or we can add a modifier key check (e.g. Alt key) to trigger split?
                    // Let's keep browser samples as single clips for now, as they are usually already one calls.
                    addClip({
                        type: 'audio',
                        url: file.url,
                        name: file.name,
                        start: startBar,
                        duration: 2,
                        trackId: trackId,
                    });
                }
            } catch (err) {
                console.error("Browser drop failed", err);
            }
            return;
        }

        // 2. Handle External File Drop (Native OS Drag & Drop)
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const files = Array.from(e.dataTransfer.files);
            const file = files[0]; // Handle first file for now
            
            // Calculate Drop Position
            const rect = e.currentTarget.getBoundingClientRect();
            const x = e.clientX - rect.left + e.currentTarget.scrollLeft;
            const y = e.clientY - rect.top + e.currentTarget.scrollTop;
            const startBar = Math.floor(x / BAR_WIDTH);
            
            // Trigger AI Split Flow
            // We need to import uploadSound and splitLayers from api/audioApi
            // But we can't import inside function. Check inputs.
            // Assumption: imports are added to top of file.
            
            try {
                // Mocking Loading State via dummy clip or toast?
                // Let's add a "Processing..." clip
                const processingId = Date.now();
                addClip({
                    id: processingId,
                    type: 'audio',
                    name: `Uploading ${file.name}...`,
                    start: startBar,
                    duration: 4,
                    trackId: tracks[0].id, // Default to first track or calculated one
                    isProcessing: true 
                });

                // dynamic import to avoid lint issues if not at top, but usually better to add top imports
                const { uploadSound, splitLayers } = await import('../../../api/audioApi');

                const uploaded = await uploadSound(file, file.name, 'Unknown');
                
                // Update clip name
                // (Need updateClip action in store, but remove/add works for MVP)
                removeClip(processingId);
                
                // Now Split
                // Show "Separating..."
                addClip({
                    id: processingId, // reuse ID?
                    type: 'audio',
                    name: `AI Separating...`,
                    start: startBar,
                    duration: 4,
                    trackId: tracks[0].id,
                    isProcessing: true
                });

                const stems = await splitLayers(uploaded.trackId); // Expect { vocal, drums, bass, other } URLs
                
                removeClip(processingId);

                // Add 4 Stems
                const types = ['drums', 'bass', 'other', 'vocal'];
                types.forEach((stemType, idx) => {
                    // Ensure enough tracks?
                    // For MVP, just place on track + idx
                    // We might need to add tracks if not enough exist
                    
                    const targetTrackId = tracks[idx] ? tracks[idx].id : tracks[0].id; // Fallback
                    
                    addClip({
                        type: 'audio',
                        url: stems[stemType], // server should return full url or relative
                        name: `${file.name} (${stemType})`,
                        start: startBar,
                        duration: 8, // Estimate length or get from response
                        trackId: targetTrackId, // Stack them vertically
                        stemType: stemType
                    });
                });

            } catch (err) {
                console.error("AI Split Failed", err);
                alert("AI Separation Failed: " + err.message);
                // removeClip(processingId); // Clean up
            }
        }
    };

    return (
        <div className={styles.playlistContainer}>
            <div className={styles.header}>
                <span>Playlist</span>
                <div>
                    <button style={{ fontSize: '10px', marginRight: '5px' }}>Paint</button>
                    <button style={{ fontSize: '10px' }}>Slice</button>
                </div>
            </div>

            <div className={styles.timelineArea}>
                {/* Track Headers (Sonar 스타일: 이름, M, S) */}
                <div className={styles.trackHeaders}>
                    {tracks.map((track, idx) => {
                        const insertId = inserts[idx + 1]?.id ?? track.id;
                        const insert = inserts.find(i => i.id === insertId);
                        const isMute = insert?.mute ?? false;
                        const isSolo = insert?.solo ?? false;
                        return (
                            <div key={track.id} className={styles.trackHeader}>
                                <span className={styles.trackName}>{track.name}</span>
                                <button
                                    type="button"
                                    className={`${styles.trackBtn} ${isMute ? styles.trackBtnActive : ''}`}
                                    onClick={() => toggleMute(insertId)}
                                    title="Mute"
                                >
                                    M
                                </button>
                                <button
                                    type="button"
                                    className={`${styles.trackBtn} ${isSolo ? styles.trackBtnSolo : ''}`}
                                    onClick={() => toggleSolo(insertId)}
                                    title="Solo"
                                >
                                    S
                                </button>
                            </div>
                        );
                    })}
                </div>

                {/* Track Content (Grid) */}
                <div 
                    style={{ flex: 1, position: 'relative', minWidth: '1000px' }}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                > 
                     {/* Background Grid Lines (1 per track) */}
                    {tracks.map(track => (
                        <div 
                            key={track.id} 
                            style={{ height: '60px', borderBottom: '1px solid #222', position: 'relative' }}
                            onDoubleClick={(e) => handleTrackDoubleClick(track.id, e)}
                        >
                             {/* Bar Markers (Vertical lines) - handled by CSS gradient mostly or we can map them */}
                        </div>
                    ))}

                    {/* Render Clips */}
                    {clips.map(clip => {
                        // Find Y position based on track index
                        const trackIndex = tracks.findIndex(t => t.id === clip.trackId);
                        if (trackIndex === -1) return null;

                        const top = trackIndex * 60; // 60px is track height
                        const left = clip.start * BAR_WIDTH;
                        const width = clip.duration * BAR_WIDTH;

                        return (
                            <div
                                key={clip.id}
                                className={`
                                    ${styles.clip} 
                                    ${clip.isProcessing ? styles.clipProcessing : ''}
                                    ${clip.type === 'pattern' ? styles.clipPattern : ''}
                                    ${clip.type === 'audio' && !clip.stemType ? styles.clipAudio : ''}
                                    ${clip.stemType ? styles[`stem_${clip.stemType}`] : ''}
                                `}
                                style={{
                                    top: `${top + 2}px`,
                                    left: `${left}px`,
                                    width: `${width}px`
                                }}
                                onClick={(e) => handleClipClick(e, clip.id)}
                            >
                                <span className={styles.clipName}>
                                    {clip.name || (clip.type === 'pattern' ? `Pattern ${clip.patternId}` : 'Audio Clip')}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default Playlist;
