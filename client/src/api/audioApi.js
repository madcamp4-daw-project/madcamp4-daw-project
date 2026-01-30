/**
 * 오디오 API 클라이언트
 * Base URL: VITE_API_BASE_URL 또는 http://localhost:3001/api
 */

const getBaseUrl = () =>
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
    'http://localhost:3001/api';
  
  /**
   * multipart/form-data로 오디오 업로드 (POST /api/sound/upload)
   * @param {File} file - 오디오 파일
   * @param {{ title?: string, artist?: string }} [meta] - 선택 메타
   * @returns {Promise<{ success: boolean, trackId?: number, analysis?: object, message?: string, error?: string, code?: string }>}
   */
  export async function uploadSound(file, meta = {}) {
    const form = new FormData();
    form.append('file', file);
    if (meta.title) form.append('title', meta.title);
    if (meta.artist) form.append('artist', meta.artist);
  
    const res = await fetch(`${getBaseUrl()}/sound/upload`, {
      method: 'POST',
      body: form,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || res.statusText);
    }
    return data;
  }
  
  /**
   * Blob을 base64 문자열로 변환
   * @param {Blob} blob - 변환할 Blob 객체
   * @returns {Promise<string>} base64 인코딩된 문자열
   */
  async function blobToBase64(blob) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        // data:audio/webm;base64, 부분 제거
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * 피아노 연주 녹음 저장 (POST /api/piano/record)
   * @param {{ title: string, notes: Array<{time: number, note: string, duration: number}>, audioBlob: Blob }} params
   * @returns {Promise<{ success: boolean, presetId?: number, audioPath?: string, message?: string, error?: string, code?: string }>}
   */
  export async function uploadPianoRecord({ title, notes = [], audioBlob }) {
    if (!title || !audioBlob) {
      throw new Error('title과 audioBlob은 필수입니다.');
    }

    // Blob을 base64로 변환
    const base64Audio = await blobToBase64(audioBlob);

    const res = await fetch(`${getBaseUrl()}/piano/record`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title,
        notes,
        audioBlob: base64Audio,
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || res.statusText);
    }
    return data;
  }
  
  /**
   * 레이어 분리 요청 (POST /api/sound/split)
   * @param {number} trackId
   * @returns {Promise<{ success: boolean, layers?: object, message?: string, error?: string, code?: string }>}
   */
  export async function splitLayers(trackId) {
    const res = await fetch(`${getBaseUrl()}/sound/split`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || res.statusText);
    }
    return data;
  }
  
  /**
   * 분석 재실행 (POST /api/sound/inspect)
   * @param {number} trackId
   * @returns {Promise<{ success: boolean, analysis?: object, error?: string, code?: string }>}
   */
  export async function inspectSound(trackId) {
    const res = await fetch(`${getBaseUrl()}/sound/inspect`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || res.statusText);
    }
    return data;
  }
  
  /**
   * 블렌드 시퀀스 생성 (POST /api/sound/blend)
   * @param {{ sourceId: number, targetId: number, blendPoint: number }} params
   * @returns {Promise<{ success: boolean, blendId?: number, outputPath?: string, duration?: number, message?: string, error?: string, code?: string }>}
   */
  export async function createBlend({ sourceId, targetId, blendPoint }) {
    const res = await fetch(`${getBaseUrl()}/sound/blend`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sourceId, targetId, blendPoint }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.success) {
      throw new Error(data.error || res.statusText);
    }
    return data;
  }
  
  /**
   * 레이어 분리 상태 조회 (GET /api/sound/split/:trackId/status)
   * @param {number} trackId
   * @returns {Promise<{ status: string, progress?: number, estimatedTimeRemaining?: number }>}
   */
  export async function getSplitStatus(trackId) {
    const res = await fetch(`${getBaseUrl()}/sound/split/${trackId}/status`);
    return res.json().catch(() => ({}));
  }
  
  /**
   * 블렌드 상태 조회 (GET /api/sound/blend/:blendId/status)
   * @param {number} blendId
   * @returns {Promise<{ status: string, progress?: number, estimatedTimeRemaining?: number }>}
   */
  export async function getBlendStatus(blendId) {
    const res = await fetch(`${getBaseUrl()}/sound/blend/${blendId}/status`);
    return res.json().catch(() => ({}));
  }

  /**
   * 음악 URL 해석 (이미지 등)
   * @param {string} path - 서버 경로 (예: /uploads/covers/...)
   * @returns {string} 전체 URL
   */
  export function resolveMusicUrl(path) {
    if (!path) return '';
    if (path.startsWith('http')) return path;
    const baseUrl = getBaseUrl().replace('/api', ''); // API Base에서 /api 제거
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${baseUrl}${cleanPath}`;
  }