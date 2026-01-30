import React from 'react';
import DJMachine from '../components/DJMachine/DJMachine';
import styles from './pages.module.css';

function MixPage() {
  return (
    <div className={styles.mixPage}>
      <DJMachine />
    </div>
  );
}

export default MixPage;