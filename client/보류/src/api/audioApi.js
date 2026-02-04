// audioApi.js
// Base URL from env or default
const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001/api';

/** 상대 경로를 풀 URL로 변환 (스트리밍/커버 등) */
export const resolveMusicUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:')) return path;
    const base = BASE_URL.replace(/\/api\/?$/, '');
    return path.startsWith('/') ? `${base}${path}` : `${base}/${path}`;
};

export const uploadSound = async (file, title, artist, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    if(title) formData.append('title', title);
    if(artist) formData.append('artist', artist);

    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${BASE_URL}/sound/upload`);

        xhr.upload.onprogress = (e) => {
            if (e.lengthComputable && onProgress) {
                const percentComplete = (e.loaded / e.total) * 100;
                onProgress(percentComplete);
            }
        };

        xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    const response = JSON.parse(xhr.responseText);
                    resolve(response);
                } catch (err) {
                    reject(new Error('Invalid JSON response'));
                }
            } else {
                reject(new Error(`Upload failed: ${xhr.statusText}`));
            }
        };

        xhr.onerror = () => reject(new Error('Network error'));
        xhr.send(formData);
    });
};

export const splitLayers = async (trackId) => {
    const response = await fetch(`${BASE_URL}/sound/split`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trackId })
    });
    if (!response.ok) throw new Error('Split failed');
    return response.json();
};

export const createBlend = async (sourceId, targetId, blendPoint) => {
    const response = await fetch(`${BASE_URL}/sound/blend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sourceId, targetId, blendPoint })
    });
    if (!response.ok) throw new Error('Blend failed');
    return response.json();
};

/** 피아노 녹음 업로드 (title, notes, audioBlob 등 opts 전달). 서버 API 연동 시 구현 확장 */
export const uploadPianoRecord = async (opts) => {
    const formData = new FormData();
    const blob = opts?.audioBlob ?? opts?.blob;
    if (blob) formData.append('file', blob);
    if (opts?.title) formData.append('title', opts.title);
    if (opts?.notes) formData.append('notes', JSON.stringify(opts.notes));
    const response = await fetch(`${BASE_URL}/piano/upload`, {
        method: 'POST',
        body: formData,
    });
    if (!response.ok) throw new Error('Piano upload failed');
    return response.json();
};

// Add sample upload for browser
export const uploadSample = async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await fetch(`${BASE_URL}/sample/upload`, {
        method: 'POST',
        body: formData
    });
    return response.json();
};