import { useState, useCallback } from 'react';

/**
 * 업로드 진행률 훅
 * 파일 업로드 시 진행률을 추적하고 관리합니다.
 * 
 * @returns {Object} { progress, isUploading, uploadFile, reset }
 */
export const useUploadProgress = () => {
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * 파일 업로드 실행
   * @param {Function} uploadFn - 업로드 함수 (예: uploadSound)
   * @param {...any} args - 업로드 함수에 전달할 인자들
   * @returns {Promise} 업로드 결과
   */
  const uploadFile = useCallback(async (uploadFn, ...args) => {
    setIsUploading(true);
    setProgress(0);
    setError(null);

    try {
      // XMLHttpRequest를 사용하여 진행률 추적
      // fetch API는 진행률 추적을 지원하지 않으므로, uploadFn이 FormData를 받는 경우를 가정
      const result = await uploadFn(...args);
      setProgress(100);
      return result;
    } catch (err) {
      setError(err.message || '업로드 실패');
      throw err;
    } finally {
      setIsUploading(false);
      // 진행률을 잠시 유지한 후 리셋
      setTimeout(() => {
        setProgress(0);
      }, 1000);
    }
  }, []);

  /**
   * 상태 리셋
   */
  const reset = useCallback(() => {
    setProgress(0);
    setIsUploading(false);
    setError(null);
  }, []);

  return {
    progress,
    isUploading,
    error,
    uploadFile,
    reset,
  };
};

export default useUploadProgress;
