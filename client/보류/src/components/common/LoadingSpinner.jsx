import React from 'react';
import styles from './common.module.css';

const LoadingSpinner = ({ text = "Loading..." }) => {
    return (
        <div className={styles.spinnerContainer}>
            <div className={styles.spinner}></div>
            <p>{text}</p>
        </div>
    );
};

export default LoadingSpinner;