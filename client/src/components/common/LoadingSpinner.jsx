//로딩중에 사용할 로딩 스피너로 LoadingSpinner로 import해서 사용

import React from 'react';

function LoadingSpinner() {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem',
        }}
        aria-label="로딩 중"
      >
        <div
          style={{
            width: 40,
            height: 40,
            border: '3px solid rgba(176, 102, 255, 0.3)',
            borderTopColor: '#b066ff',
            borderRadius: '50%',
            animation: 'spin 0.8s linear infinite',
          }}
        />
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }
  
  export default LoadingSpinner;