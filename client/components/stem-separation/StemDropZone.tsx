"use client";

import React, { useRef, useState, useCallback } from "react";
import { Upload, Music, FileAudio } from "lucide-react";

/**
 * Stem 분리용 파일 드롭존 Props
 */
interface StemDropZoneProps {
  onFileSelect: (file: File) => void;  // 파일 선택 콜백
  isProcessing?: boolean;              // 처리 중 상태
  acceptedFormats?: string[];          // 허용 파일 포맷
}

/**
 * 오디오 파일 드래그&드롭 영역 컴포넌트
 * WAV, MP3, FLAC 등 오디오 파일 업로드 지원
 */
export function StemDropZone({
  onFileSelect,
  isProcessing = false,
  acceptedFormats = [".wav", ".mp3", ".flac", ".m4a", ".ogg"],
}: StemDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * 파일 유효성 검사
   */
  const isValidFile = useCallback(
    (file: File): boolean => {
      const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
      return acceptedFormats.includes(extension);
    },
    [acceptedFormats]
  );

  /**
   * 파일 처리 핸들러
   */
  const handleFile = useCallback(
    (file: File) => {
      if (isValidFile(file)) {
        setSelectedFile(file);
        onFileSelect(file);
      } else {
        alert(`지원하지 않는 파일 형식입니다.\n지원 형식: ${acceptedFormats.join(", ")}`);
      }
    },
    [isValidFile, onFileSelect, acceptedFormats]
  );

  /**
   * 드래그 오버 핸들러
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  /**
   * 드래그 리브 핸들러
   */
  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  /**
   * 드롭 핸들러
   */
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);

      if (isProcessing) return;

      const files = e.dataTransfer.files;
      if (files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile, isProcessing]
  );

  /**
   * 파일 선택 핸들러
   */
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [handleFile]
  );

  /**
   * 클릭하여 파일 선택
   */
  const handleClick = useCallback(() => {
    if (!isProcessing) {
      fileInputRef.current?.click();
    }
  }, [isProcessing]);

  /**
   * 파일 크기 포맷팅
   */
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`
        relative border-2 border-dashed rounded-lg p-8 
        transition-all duration-200 cursor-pointer
        ${
          isDragOver
            ? "border-blue-500 bg-blue-500/10"
            : "border-gray-600 hover:border-gray-500"
        }
        ${isProcessing ? "opacity-50 cursor-not-allowed" : ""}
      `}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
    >
      {/* 숨겨진 파일 입력 */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedFormats.join(",")}
        onChange={handleFileSelect}
        className="hidden"
        disabled={isProcessing}
      />

      <div className="flex flex-col items-center justify-center space-y-4">
        {selectedFile ? (
          // 선택된 파일 표시
          <>
            <FileAudio className="w-12 h-12 text-green-500" />
            <div className="text-center">
              <p className="text-white font-medium">{selectedFile.name}</p>
              <p className="text-gray-400 text-sm">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <p className="text-gray-500 text-sm">
              다른 파일을 선택하려면 클릭하거나 드래그하세요
            </p>
          </>
        ) : (
          // 기본 상태
          <>
            {isDragOver ? (
              <Music className="w-12 h-12 text-blue-500 animate-pulse" />
            ) : (
              <Upload className="w-12 h-12 text-gray-500" />
            )}
            <div className="text-center">
              <p className="text-white font-medium">
                {isDragOver
                  ? "여기에 파일을 놓으세요"
                  : "오디오 파일을 드래그하거나 클릭하여 선택"}
              </p>
              <p className="text-gray-500 text-sm mt-1">
                지원 형식: WAV, MP3, FLAC, M4A, OGG
              </p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default StemDropZone;
