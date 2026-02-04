import React, { useState } from 'react';
import styles from './AudioFxBrowser.module.css';

/** Sonar 스타일 Audio Fx 플러그인 브라우저 (목록 UI, 실제 플러그인 로드는 후속) */
const MOCK_CATEGORIES = [
    'Cakewalk',
    'iZotope, Inc.',
    'Line 6',
    'Melda Productions',
    'Native Instruments',
    'Normad Factory',
    'Overloud',
];

const AudioFxBrowser = () => {
    const [search, setSearch] = useState('');

    return (
        <div className={styles.container}>
            <div className={styles.header}>Audio Fx</div>
            <input
                type="text"
                className={styles.search}
                placeholder="Search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
            />
            <ul className={styles.categoryList}>
                {MOCK_CATEGORIES.map((name) => (
                    <li key={name} className={styles.categoryItem}>
                        {name}
                    </li>
                ))}
            </ul>
            <div className={styles.footer}>Plug-ins</div>
        </div>
    );
};

export default AudioFxBrowser;
