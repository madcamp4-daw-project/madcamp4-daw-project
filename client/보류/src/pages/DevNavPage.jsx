import React from 'react';
import { Link } from 'react-router-dom';
import styles from './DevNavPage.module.css';

/**
 * 개발용 최상위 네비게이션 페이지
 * 모든 페이지에 접근할 수 있는 링크를 제공
 */
const PAGES = [
  { path: '/', label: '메인 (Main)', desc: 'FL STUDIO WEB 랜딩' },
  { path: '/studio', label: '스튜디오 (Studio)', desc: 'DAW 단일 레이아웃 · Synth 포함' },
  { path: '/dev', label: '개발 네비 (Dev Nav)', desc: '이 페이지' },
];

const DevNavPage = () => {
  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <h1 className={styles.title}>🧭 Dev Navigation</h1>
        <p className={styles.subtitle}>개발용 · 모든 페이지 접근</p>
      </header>
      <nav className={styles.nav}>
        <ul className={styles.list}>
          {PAGES.map(({ path, label, desc }) => (
            <li key={path} className={styles.item}>
              <Link to={path} className={styles.link}>
                <span className={styles.label}>{label}</span>
                <span className={styles.desc}>{desc}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
      <footer className={styles.footer}>
        <Link to="/" className={styles.backLink}>← 메인으로</Link>
      </footer>
    </div>
  );
};

export default DevNavPage;
