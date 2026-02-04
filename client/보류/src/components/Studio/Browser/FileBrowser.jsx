import React, { useState } from 'react';
import styles from './Browser.module.css';

// Mock Data for now, later fetch from /api/samples
const MOCK_FOLDERS = [
    {
        name: 'Drums',
        files: [
            { id: 'kick1', name: 'Kick_01.wav', type: 'audio', url: '/samples/kick.wav' },
            { id: 'snare1', name: 'Snare_01.wav', type: 'audio', url: '/samples/snare.wav' },
            { id: 'hat1', name: 'HiHat_01.wav', type: 'audio', url: '/samples/hat.wav' },
            { id: 'clap1', name: 'Clap_01.wav', type: 'audio', url: '/samples/clap.wav' },
        ],
        isOpen: true
    },
    {
        name: 'Instruments',
        files: [
            { id: 'piano1', name: 'Piano_C4.wav', type: 'audio', url: '/samples/piano.wav' },
            { id: 'bass1', name: 'Bass_01.wav', type: 'audio', url: '/samples/bass.wav' },
        ],
        isOpen: false
    },
    {
        name: 'My Projects',
        files: [
            { id: 'proj1', name: 'Demo_Track', type: 'project' },
        ],
        isOpen: false
    }
];

const FileBrowser = () => {
    const [folders, setFolders] = useState(MOCK_FOLDERS);

    const toggleFolder = (index) => {
        const newFolders = [...folders];
        newFolders[index].isOpen = !newFolders[index].isOpen;
        setFolders(newFolders);
    };

    const handleDragStart = (e, file) => {
        e.dataTransfer.setData('application/json', JSON.stringify(file));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className={styles.browserContainer}>
            <div className={styles.browserHeader}>
                BROWSER
            </div>
            
            <div className={styles.fileList}>
                {folders.map((folder, folderIndex) => (
                    <div key={folder.name}>
                        <div 
                            className={styles.folderItem}
                            onClick={() => toggleFolder(folderIndex)}
                        >
                            {folder.isOpen ? '📂' : '📁'} {folder.name}
                        </div>
                        
                        {folder.isOpen && folder.files.map(file => (
                            <div 
                                key={file.id} 
                                className={styles.fileItem}
                                draggable
                                onDragStart={(e) => handleDragStart(e, file)}
                            >
                                <span style={{ marginRight: '5px' }}>
                                    {file.type === 'audio' ? '🎵' : '📄'}
                                </span>
                                {file.name}
                            </div>
                        ))}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default FileBrowser;
