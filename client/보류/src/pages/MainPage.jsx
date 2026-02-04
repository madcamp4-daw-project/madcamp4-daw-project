import React from 'react';
import { Link } from 'react-router-dom';
import styles from './MainPage.module.css';

const MainPage = () => {
    return (
        <div className={styles.container}>
            <div className={styles.content}>
                <h1 className={styles.title}>FL STUDIO WEB</h1>
                <p className={styles.subtitle}>
                    Online Music Production Environment
                </p>

                <div className={styles.cardGrid}>
                    <Link to="/studio" className={`${styles.card} ${styles.mixCard}`} style={{ maxWidth: '400px', margin: '0 auto' }}>
                        <div className={styles.cardIcon}>🎹</div>
                        <h2 className={styles.cardTitle}>ENTER STUDIO</h2>
                        <p className={styles.cardDesc}>
                            Start creating music with pattern-based sequencing, 
                            piano roll, and audio recording.
                        </p>
                    </Link>
                </div>

                <div style={{ marginTop: '4rem', color: '#555', fontSize: '0.8rem' }}>
                    v2.0 • Powered by Tone.js & React
                </div>

                <div style={{ marginTop: '1.5rem' }}>
                    <Link to="/dev" className={styles.devNavLink}>
                        🧭 Dev Nav (모든 페이지)
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default MainPage;
