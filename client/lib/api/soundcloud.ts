/**
 * SoundCloud API 클라이언트
 * SoundCloud 카탈로그 검색, 플레이리스트 로드, 스트리밍 지원
 */

// SoundCloud API 설정
const SOUNDCLOUD_CLIENT_ID = process.env.NEXT_PUBLIC_SOUNDCLOUD_CLIENT_ID || 'demo';
const SOUNDCLOUD_API_BASE = 'https://api.soundcloud.com';

/**
 * SoundCloud 트랙 정보
 */
export interface SoundCloudTrack {
  id: number;
  title: string;
  artist: string;
  duration: number;      // 밀리초
  bpm?: number;
  genre?: string;
  artworkUrl?: string;
  streamUrl?: string;
  permalinkUrl: string;
  playbackCount: number;
  likesCount: number;
}

/**
 * SoundCloud 플레이리스트
 */
export interface SoundCloudPlaylist {
  id: number;
  title: string;
  trackCount: number;
  tracks: SoundCloudTrack[];
}

/**
 * 검색 결과
 */
export interface SearchResult {
  collection: SoundCloudTrack[];
  nextHref?: string;
  totalCount: number;
}

/**
 * 트랙 검색
 * @param query - 검색어
 * @param limit - 결과 수 (기본: 20)
 * @param offset - 오프셋
 */
export async function searchTracks(
  query: string,
  limit: number = 20,
  offset: number = 0
): Promise<SearchResult> {
  try {
    const params = new URLSearchParams({
      q: query,
      limit: limit.toString(),
      offset: offset.toString(),
      client_id: SOUNDCLOUD_CLIENT_ID,
    });

    const response = await fetch(`${SOUNDCLOUD_API_BASE}/tracks?${params}`);

    if (!response.ok) {
      throw new Error(`SoundCloud search failed: ${response.statusText}`);
    }

    const data = await response.json();

    return {
      collection: data.map(mapTrack),
      totalCount: data.length,
    };
  } catch (error) {
    console.error('SoundCloud search error:', error);
    // 에러 시 Mock 데이터 반환
    return mockSearchTracks(query);
  }
}

/**
 * 사용자 플레이리스트 가져오기
 * @param userId - 사용자 ID
 */
export async function getPlaylists(userId: string): Promise<SoundCloudPlaylist[]> {
  try {
    const response = await fetch(
      `${SOUNDCLOUD_API_BASE}/users/${userId}/playlists?client_id=${SOUNDCLOUD_CLIENT_ID}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get playlists: ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error('SoundCloud playlists error:', error);
    return [];
  }
}

/**
 * 스트리밍 URL 가져오기
 * @param trackId - 트랙 ID
 */
export async function getStreamUrl(trackId: number): Promise<string> {
  try {
    const response = await fetch(
      `${SOUNDCLOUD_API_BASE}/tracks/${trackId}/stream?client_id=${SOUNDCLOUD_CLIENT_ID}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get stream URL: ${response.statusText}`);
    }

    const data = await response.json();
    return data.url;
  } catch (error) {
    console.error('SoundCloud stream error:', error);
    return '';
  }
}

/**
 * 장르별 트랙 가져오기
 * @param genre - 장르 (예: "electronic", "hip-hop")
 */
export async function getTracksByGenre(
  genre: string,
  limit: number = 20
): Promise<SoundCloudTrack[]> {
  try {
    const response = await fetch(
      `${SOUNDCLOUD_API_BASE}/tracks?genres=${genre}&limit=${limit}&client_id=${SOUNDCLOUD_CLIENT_ID}`
    );

    if (!response.ok) {
      throw new Error(`Failed to get tracks by genre: ${response.statusText}`);
    }

    const data = await response.json();
    return data.map(mapTrack);
  } catch (error) {
    console.error('SoundCloud genre tracks error:', error);
    return mockGetTracksByGenre(genre);
  }
}

/**
 * API 응답을 트랙 객체로 변환
 */
function mapTrack(data: Record<string, unknown>): SoundCloudTrack {
  return {
    id: data.id as number,
    title: data.title as string,
    artist: (data.user as Record<string, unknown>)?.username as string || 'Unknown',
    duration: data.duration as number,
    bpm: data.bpm as number | undefined,
    genre: data.genre as string,
    artworkUrl: data.artwork_url as string,
    streamUrl: data.stream_url as string,
    permalinkUrl: data.permalink_url as string,
    playbackCount: data.playback_count as number || 0,
    likesCount: data.likes_count as number || 0,
  };
}

/**
 * Mock: 트랙 검색 시뮬레이션
 */
export function mockSearchTracks(query: string): SearchResult {
  const mockTracks: SoundCloudTrack[] = [
    {
      id: 1,
      title: '4 Letters (TikTok Song)',
      artist: 'humbletay23',
      duration: 179000,
      bpm: 85,
      genre: 'R&B & Soul',
      artworkUrl: '/mock/artwork1.jpg',
      permalinkUrl: 'https://soundcloud.com/mock/track1',
      playbackCount: 1500000,
      likesCount: 45000,
    },
    {
      id: 2,
      title: '4URA & Young Viridii - Yesterday [NCS Release]',
      artist: 'NCS',
      duration: 206000,
      bpm: 88,
      genre: 'Drum & Bass',
      artworkUrl: '/mock/artwork2.jpg',
      permalinkUrl: 'https://soundcloud.com/mock/track2',
      playbackCount: 2300000,
      likesCount: 78000,
    },
    {
      id: 3,
      title: '[Dusttale] PYROSOMNI 2 +FLP',
      artist: 'solunary',
      duration: 241000,
      bpm: 120,
      genre: 'Electronic',
      artworkUrl: '/mock/artwork3.jpg',
      permalinkUrl: 'https://soundcloud.com/mock/track3',
      playbackCount: 890000,
      likesCount: 32000,
    },
    {
      id: 4,
      title: '[Splatoon 3 Remix] Deep Cut - Anarchy Rainbow',
      artist: 'Video Game Remixes',
      duration: 225000,
      bpm: 130,
      genre: 'Splatoon',
      artworkUrl: '/mock/artwork4.jpg',
      permalinkUrl: 'https://soundcloud.com/mock/track4',
      playbackCount: 456000,
      likesCount: 18000,
    },
    {
      id: 5,
      title: 'Abandoned feat. Tadeusz - Passengers',
      artist: 'Ophelia Records',
      duration: 299000,
      bpm: 145,
      genre: 'Dance & EDM',
      artworkUrl: '/mock/artwork5.jpg',
      permalinkUrl: 'https://soundcloud.com/mock/track5',
      playbackCount: 3200000,
      likesCount: 95000,
    },
  ];

  // 검색어로 필터링
  const filtered = query
    ? mockTracks.filter(
        (t) =>
          t.title.toLowerCase().includes(query.toLowerCase()) ||
          t.artist.toLowerCase().includes(query.toLowerCase())
      )
    : mockTracks;

  return {
    collection: filtered,
    totalCount: filtered.length,
  };
}

/**
 * Mock: 장르별 트랙 시뮬레이션
 */
export function mockGetTracksByGenre(genre: string): SoundCloudTrack[] {
  const genreTracks: Record<string, SoundCloudTrack[]> = {
    'dance-edm': [
      {
        id: 101,
        title: 'Euphoria (Extended Mix)',
        artist: 'DJ Producer',
        duration: 360000,
        bpm: 128,
        genre: 'Dance & EDM',
        artworkUrl: '/mock/edm1.jpg',
        permalinkUrl: 'https://soundcloud.com/mock/edm1',
        playbackCount: 5600000,
        likesCount: 120000,
      },
    ],
    'deep-house': [
      {
        id: 201,
        title: 'Midnight Dreams',
        artist: 'Deep Vibes',
        duration: 420000,
        bpm: 122,
        genre: 'Deep House',
        artworkUrl: '/mock/deep1.jpg',
        permalinkUrl: 'https://soundcloud.com/mock/deep1',
        playbackCount: 890000,
        likesCount: 45000,
      },
    ],
    'drum-bass': [
      {
        id: 301,
        title: 'Jungle Warfare',
        artist: 'Bass Commander',
        duration: 280000,
        bpm: 174,
        genre: 'Drum & Bass',
        artworkUrl: '/mock/dnb1.jpg',
        permalinkUrl: 'https://soundcloud.com/mock/dnb1',
        playbackCount: 1200000,
        likesCount: 67000,
      },
    ],
  };

  return genreTracks[genre] || [];
}

/**
 * 시간 포맷팅 (밀리초 → mm:ss)
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
