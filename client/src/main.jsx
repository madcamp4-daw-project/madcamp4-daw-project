import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';

/**
 * 앱 로드 실패 시 #root에 표시할 에러 UI (흰 화면 대신)
 */
function renderLoadError(err) {
  const root = document.getElementById('root');
  if (!root) return;
  const msg = String(err?.message ?? err ?? 'Unknown error')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  root.innerHTML = `
    <div style="min-height:100vh;background:#1a1a1a;color:#ff6b6b;padding:2rem;font-family:system-ui,sans-serif;">
      <h2 style="margin:0 0 1rem 0;">앱 로드 실패</h2>
      <pre style="background:#2d2d2d;padding:1rem;border-radius:8px;overflow:auto;font-size:0.85rem;">${msg}</pre>
      <button onclick="window.location.reload()" style="margin-top:1rem;padding:0.5rem 1rem;background:#444;color:#fff;border:none;border-radius:6px;cursor:pointer;">새로고침</button>
    </div>
  `;
}

(async function mountApp() {
  try {
    const { default: App } = await import('./App');
    const rootEl = document.getElementById('root');
    if (!rootEl) throw new Error('#root element not found');
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </React.StrictMode>
    );
  } catch (err) {
    console.error('App load error:', err);
    renderLoadError(err);
  }
})();

