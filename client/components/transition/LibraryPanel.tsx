"use client";

import React, { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Library,
  Cloud,
  Music,
  Search,
  Clock,
  ExternalLink,
  GripHorizontal,
} from "lucide-react";
import {
  type SoundCloudTrack,
  mockSearchTracks,
  mockGetTracksByGenre,
  formatDuration,
} from "@/lib/api/soundcloud";

/**
 * Library Panel Props
 */
interface LibraryPanelProps {
  onTrackSelect: (track: SoundCloudTrack, side: 'A' | 'B') => void;
}

/**
 * 라이브러리 탭 타입
 */
type LibraryTab = 'library' | 'soundcloud' | 'dance-edm' | 'deep-house' | 'drum-bass';

/**
 * DJ 라이브러리 패널 컴포넌트
 * 로컬 라이브러리, SoundCloud, 장르별 탭 제공
 */
export function LibraryPanel({ onTrackSelect }: LibraryPanelProps) {
  const [activeTab, setActiveTab] = useState<LibraryTab>('library');
  const [searchQuery, setSearchQuery] = useState('');
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * 탭 변경 시 트랙 로드
   */
  useEffect(() => {
    const loadTracks = async () => {
      setIsLoading(true);
      try {
        if (activeTab === 'library' || activeTab === 'soundcloud') {
          const result = mockSearchTracks(searchQuery);
          setTracks(result.collection);
        } else {
          const genreTracks = mockGetTracksByGenre(activeTab);
          setTracks(genreTracks);
        }
      } catch (error) {
        console.error('Failed to load tracks:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTracks();
  }, [activeTab, searchQuery]);

  /**
   * 검색 핸들러
   */
  const handleSearch = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    // 검색 트리거 (useEffect에서 처리)
  }, []);

  /**
   * 트랙 드래그 시작
   */
  const handleDragStart = useCallback(
    (e: React.DragEvent, track: SoundCloudTrack) => {
      e.dataTransfer.setData('application/json', JSON.stringify(track));
      e.dataTransfer.effectAllowed = 'copy';
    },
    []
  );

  /**
   * 탭 정의
   */
  const tabs: Array<{ id: LibraryTab; label: string; icon: React.ReactNode }> = [
    { id: 'library', label: 'Library', icon: <Library className="w-4 h-4" /> },
    { id: 'soundcloud', label: 'SoundCloud', icon: <Cloud className="w-4 h-4" /> },
    { id: 'dance-edm', label: 'Dance & EDM', icon: <Music className="w-4 h-4" /> },
    { id: 'deep-house', label: 'Deep House', icon: <Music className="w-4 h-4" /> },
    { id: 'drum-bass', label: 'Drum & Bass', icon: <Music className="w-4 h-4" /> },
  ];

  return (
    <div className="flex h-full bg-[#1a1a1a] border-t border-gray-700">
      {/* 사이드바 탭 */}
      <div className="w-36 border-r border-gray-700 py-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`
              flex items-center gap-2 w-full px-3 py-2 text-sm transition-colors
              ${
                activeTab === tab.id
                  ? 'bg-[#333] text-white'
                  : 'text-gray-400 hover:text-white hover:bg-[#252525]'
              }
            `}
          >
            {tab.icon}
            <span className="truncate">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex-1 flex flex-col">
        {/* 검색바 */}
        <form
          onSubmit={handleSearch}
          className="flex items-center gap-2 p-2 border-b border-gray-700"
        >
          <Search className="w-4 h-4 text-gray-500" />
          <Input
            type="text"
            placeholder="Search songs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 h-8 bg-[#252525] border-gray-600 text-white placeholder:text-gray-500"
          />
        </form>

        {/* 트랙 테이블 헤더 */}
        <div className="flex items-center px-3 py-2 text-xs text-gray-500 border-b border-gray-700 bg-[#1e1e1e]">
          <div className="w-8">#</div>
          <div className="flex-1">TITLE</div>
          <div className="w-32">ARTIST</div>
          <div className="w-16 text-right">TIME</div>
          <div className="w-12 text-right">BPM</div>
          <div className="w-24">GENRE</div>
          <div className="w-8">LINK</div>
        </div>

        {/* 트랙 목록 */}
        <ScrollArea className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              Loading...
            </div>
          ) : tracks.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-gray-500">
              No tracks found
            </div>
          ) : (
            tracks.map((track, index) => (
              <div
                key={track.id}
                draggable
                onDragStart={(e) => handleDragStart(e, track)}
                className="flex items-center px-3 py-2 text-sm hover:bg-[#252525] cursor-grab active:cursor-grabbing group"
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
                  {track.bpm || '-'}
                </div>
                <div className="w-24 text-gray-400 truncate">
                  {track.genre || '-'}
                </div>
                <div className="w-8">
                  <a
                    href={track.permalinkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-gray-500 hover:text-white"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            ))
          )}
        </ScrollArea>
      </div>
    </div>
  );
}

export default LibraryPanel;
