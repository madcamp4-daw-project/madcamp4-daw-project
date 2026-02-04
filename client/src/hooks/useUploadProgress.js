import { useState } from 'react';

const useUploadProgress = () => {
    const [progress, setProgress] = useState(0);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);

    const startUpload = () => {
        setProgress(0);
        setIsUploading(true);
        setError(null);
    };

    const updateProgress = (val) => {
        setProgress(val);
    };

    const finishUpload = () => {
        setProgress(100);
        setIsUploading(false);
    };

    const failUpload = (err) => {
        setIsUploading(false);
        setError(err);
    };

    /** apiFn(...args) 호출 후 진행률/완료 처리. 호출부: uploadFile(uploadPianoRecord, opts) 또는 uploadFile(uploadSound, file, opts) */
    const uploadFile = async (apiFn, ...args) => {
        startUpload();
        try {
            const result = await apiFn(...args);
            finishUpload();
            return result;
        } catch (e) {
            failUpload(e);
            throw e;
        }
    };

    return { progress, isUploading, error, startUpload, updateProgress, finishUpload, failUpload, uploadFile };
};

export default useUploadProgress;
export { useUploadProgress };
