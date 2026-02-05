"use client";

import React, { useState, useCallback } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Library,
  Clock,
  Upload,
  GripHorizontal,
  Trash2,
} from "lucide-react";

/**
 * 업로드된 트랙 정보
 */
export interface UploadedTrack {
  id: string;
  title: string;
  artist: string;
  duration: number; // seconds
  bpm?: number;
  key?: string;
  uploadedAt: Date;
  fileSize?: number; // bytes
}

/**
 * Library Panel Props
 */
interface LibraryPanelProps {
  /** 업로드된 트랙 목록 */
  uploadedTracks: UploadedTrack[];
  /** 트랙 선택 핸들러 */
  onTrackSelect: (track: UploadedTrack, side: 'A' | 'B') => void;
  /** 트랙 삭제 핸들러 */
  onTrackDelete?: (trackId: string) => void;
}

/**
 * 시간 포맷팅 (MM:SS)
 */
function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * DJ 라이브러리 패널 컴포넌트
 * 실제 업로드된 파일만 표시
 */
export function LibraryPanel({ uploadedTracks, onTrackSelect, onTrackDelete }: LibraryPanelProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>(null);

  /**
   * 트랙 드래그 시작
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent, track: UploadedTrack) => {
      e.dataTransfer.setData('application/json', JSON.stringify(track));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  /**
   * 트랙 더블클릭 → Deck A에 로드
   */
  const handleDoubleClick = useCallback(
    (track: UploadedTrack) => {
      onTrackSelect(track, 'A');
    },
    [onTrackSelect]
  );

  return (
    <div className="flex h-full bg-[#1a1a1a] border-t border-gray-700">
      {/* 사이드바 헤더 */}
      <div className="w-36 border-r border-gray-700 py-2">
        <div className="flex items-center gap-2 px-3 py-2 text-sm bg-[#333] text-white">
          <Library className="w-4 h-4" />
          <span className="truncate">내 라이브러리</span>
        </div>
        <div className="px-3 py-2 text-xs text-gray-500">
          {uploadedTracks.length}개 트랙
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 bg-[#1e1e1e]">
          <span className="text-xs text-gray-400">
            업로드된 트랙만 표시됩니다. 좌측 덱 영역에 파일을 드롭하여 업로드하세요.
          </span>
        </div>

        {/* 트랙 테이블 헤더 */}
        <div className="flex items-center px-3 py-2 text-xs text-gray-500 border-b border-gray-700 bg-[#1e1e1e]">
          <div className="w-8">#</div>
          <div className="flex-1">TITLE</div>
          <div className="w-32">ARTIST</div>
          <div className="w-16 text-right">TIME</div>
          <div className="w-12 text-right">BPM</div>
          <div className="w-16 text-right">KEY</div>
          <div className="w-8"></div>
        </div>

        {/* 트랙 목록 */}
        <ScrollArea className="flex-1">
          {uploadedTracks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-500 gap-3">
              <Upload className="w-8 h-8 opacity-50" />
              <div className="text-center">
                <p className="text-sm">아직 업로드된 트랙이 없습니다</p>
                <p className="text-xs mt-1">덱 영역에 오디오 파일을 드래그하여 업로드하세요</p>
              </div>
            </div>
          ) : (
            uploadedTracks.map((track, index) => (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, track)}
                onDoubleClick={() => handleDoubleClick(track)}
                onClick={() => setSelectedTrackId(track.id)}
                className={`flex items-center px-3 py-2 text-sm cursor-grab active:cursor-grabbing group transition-colors ${
                  selectedTrackId === track.id
                    ? 'bg-[#333] text-white'
                    : 'hover:bg-[#252525]'
                }`}
              >
                <div className="w-8 text-gray-500">{index + 1}</div>
                <div className="flex-1 flex items-center gap-2">
                  <GripHorizontal className="w-4 h-4 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                  <span className="text-white truncate">{track.title}</span>
                </div>
                <div className="w-32 text-gray-400 truncate">{track.artist}</div>
                <div className="w-16 text-right text-gray-400">
                  {formatDuration(track.duration)}
                </div>
                <div className="w-12 text-right text-gray-400">
                  {track.bpm ? Math.round(track.bpm) : '-'}
                </div>
                <div className="w-16 text-right text-gray-400">
                  {track.key || '-'}
                </div>
                <div className="w-8 flex justify-end">
                  {onTrackDelete && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onTrackDelete(track.id);
                      }}
                      className="text-gray-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="삭제"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </ScrollArea>

        {/* 하단 정보 */}
        <div className="px-3 py-2 text-xs text-gray-500 border-t border-gray-700 bg-[#1e1e1e]">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              총 {formatDuration(uploadedTracks.reduce((sum, t) => sum + t.duration, 0))}
            </span>
            <span>더블클릭: Deck A에 로드</span>
            <span>드래그: 원하는 덱에 드롭</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LibraryPanel;
