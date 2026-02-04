"use client";

import React, { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TooltipWrapper } from "@/components/ui/tooltip";
import { Search, X, Play, Pause, Download, Cloud, Music, Loader2 } from "lucide-react";
import type { SoundCloudTrack } from "@/lib/api/soundcloud";

interface SoundCloudModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTrackSelect: (track: SoundCloudTrack, deck: 'A' | 'B') => void;
}

/**
 * SoundCloud 검색 및 트랙 로드 모달
 * 트랙 검색 → 미리듣기 → Deck A/B 로드
 */
export function SoundCloudModal({
  isOpen,
  onClose,
  onTrackSelect,
}: SoundCloudModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<SoundCloudTrack[]>([]);
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null);
  const [selectedDeck, setSelectedDeck] = useState<'A' | 'B'>('A');

  /**
   * SoundCloud 검색 (Mock)
   */
  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    
    // Mock 검색 결과 (실제 구현 시 API 호출)
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockResults: SoundCloudTrack[] = [
      {
        id: 1,
        title: `${searchQuery} - Track 1`,
        artist: "Artist A",
        duration: 240000,
        artworkUrl: "",
        streamUrl: "",
        genre: "Electronic",
        bpm: 128,
        permalinkUrl: "https://soundcloud.com/mock/track1",
        playbackCount: 150000,
        likesCount: 4500,
      },
      {
        id: 2,
        title: `${searchQuery} - Track 2`,
        artist: "Artist B",
        duration: 195000,
        artworkUrl: "",
        streamUrl: "",
        genre: "House",
        bpm: 124,
        permalinkUrl: "https://soundcloud.com/mock/track2",
        playbackCount: 230000,
        likesCount: 7800,
      },
      {
        id: 3,
        title: `${searchQuery} - Track 3`,
        artist: "Artist C",
        duration: 312000,
        artworkUrl: "",
        streamUrl: "",
        genre: "Techno",
        bpm: 130,
        permalinkUrl: "https://soundcloud.com/mock/track3",
        playbackCount: 89000,
        likesCount: 3200,
      },
      {
        id: 4,
        title: `${searchQuery} - Remix`,
        artist: "DJ Remix",
        duration: 285000,
        artworkUrl: "",
        streamUrl: "",
        genre: "EDM",
        bpm: 140,
        permalinkUrl: "https://soundcloud.com/mock/track4",
        playbackCount: 456000,
        likesCount: 12000,
      },
    ];
    
    setSearchResults(mockResults);
    setIsSearching(false);
  }, [searchQuery]);

  /**
   * 미리듣기 토글
   */
  const handlePreviewToggle = (trackId: string) => {
    setPlayingTrackId(prev => prev === trackId ? null : trackId);
  };

  /**
   * 트랙 선택 및 덱 로드
   */
  const handleLoadToDeck = (track: SoundCloudTrack, deck: 'A' | 'B') => {
    onTrackSelect(track, deck);
    // 선택 후에도 모달 유지 (여러 트랙 로드 가능)
  };

  /**
   * 시간 포맷팅 (ms → mm:ss)
   */
  const formatDuration = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-gradient-to-b from-[#1a1a2e] to-[#12121f] border border-[#3a3a4f] rounded-xl shadow-2xl overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between px-4 py-3 bg-[#12121f] border-b border-[#3a3a4f]">
          <div className="flex items-center gap-2">
            <Cloud className="w-5 h-5 text-orange-500" />
            <span className="text-lg font-medium text-white">SoundCloud</span>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#3a3a4f]"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* 검색 바 */}
        <div className="px-4 py-3 border-b border-[#3a3a4f]">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                placeholder="트랙, 아티스트, 장르 검색..."
                className="pl-9 bg-[#252535] border-[#3a3a4f] text-white placeholder:text-gray-500"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={isSearching}
              className="bg-orange-600 hover:bg-orange-500"
            >
              {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '검색'}
            </Button>
          </div>

          {/* 덱 선택 */}
          <div className="flex gap-2 mt-2">
            <span className="text-[10px] text-gray-400 uppercase self-center">Load to:</span>
            <Button
              size="sm"
              variant={selectedDeck === 'A' ? 'default' : 'outline'}
              onClick={() => setSelectedDeck('A')}
              className={`h-6 text-[10px] ${
                selectedDeck === 'A'
                  ? 'bg-blue-600 hover:bg-blue-500'
                  : 'bg-transparent border-[#3a3a4f] text-gray-400'
              }`}
            >
              Deck A
            </Button>
            <Button
              size="sm"
              variant={selectedDeck === 'B' ? 'default' : 'outline'}
              onClick={() => setSelectedDeck('B')}
              className={`h-6 text-[10px] ${
                selectedDeck === 'B'
                  ? 'bg-purple-600 hover:bg-purple-500'
                  : 'bg-transparent border-[#3a3a4f] text-gray-400'
              }`}
            >
              Deck B
            </Button>
          </div>
        </div>

        {/* 검색 결과 */}
        <div className="max-h-[400px] overflow-y-auto">
          {searchResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-gray-500">
              <Music className="w-12 h-12 mb-2 opacity-50" />
              <span>트랙을 검색하세요</span>
            </div>
          ) : (
            <div className="divide-y divide-[#3a3a4f]">
              {searchResults.map((track) => {
                const isPlaying = playingTrackId === String(track.id);
                
                return (
                  <div
                    key={track.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-[#252535] transition-colors"
                  >
                    {/* 아트워크 */}
                    <div className="w-12 h-12 bg-[#3a3a4f] rounded flex items-center justify-center flex-shrink-0">
                      <Music className="w-6 h-6 text-gray-600" />
                    </div>

                    {/* 트랙 정보 */}
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white truncate">
                        {track.title}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-gray-400">
                        <span>{track.artist}</span>
                        <span>•</span>
                        <span>{formatDuration(track.duration)}</span>
                        <span>•</span>
                        <span className="text-purple-400">{track.bpm || '--'} BPM</span>
                        <span>•</span>
                        <span className="text-orange-400">{track.genre || '--'}</span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <div className="flex items-center gap-1">
                      <TooltipWrapper content="미리듣기">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handlePreviewToggle(String(track.id))}
                          className={`w-8 h-8 ${isPlaying ? 'text-green-400' : 'text-gray-400'} hover:text-white`}
                        >
                          {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                        </Button>
                      </TooltipWrapper>
                      <TooltipWrapper content={`Deck ${selectedDeck}에 로드`}>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleLoadToDeck(track, selectedDeck)}
                          className="w-8 h-8 text-gray-400 hover:text-white hover:bg-[#3a3a4f]"
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                      </TooltipWrapper>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 푸터 */}
        <div className="px-4 py-2 bg-[#12121f] border-t border-[#3a3a4f] text-[10px] text-gray-500 text-center">
          Powered by SoundCloud API • 
          <a href="https://soundcloud.com" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:underline ml-1">
            soundcloud.com
          </a>
        </div>
      </div>
    </div>
  );
}

export default SoundCloudModal;
