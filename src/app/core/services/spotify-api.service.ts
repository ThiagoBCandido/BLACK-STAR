import { Injectable, inject } from '@angular/core';
import { Playlist, Track } from '../models/music.model';
import { SpotifyAuthService } from './spotify-auth.service';

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface SpotifyArtist {
  name: string;
}

interface SpotifyAlbum {
  name: string;
  images: SpotifyImage[];
}

interface SpotifyTrack {
  id: string | null;
  name: string;
  uri: string;
  duration_ms: number;
  type?: string;
  is_local?: boolean;
  external_urls?: {
    spotify?: string;
  };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string | null;
  images?: SpotifyImage[];
  collaborative?: boolean;
  owner?: {
    id?: string;
    display_name?: string | null;
  };
  tracks?: {
    total?: number;
  };
}

interface RecentlyPlayedResponse {
  items: Array<{
    track: SpotifyTrack;
  }>;
}

interface TopTracksResponse {
  items: SpotifyTrack[];
}

interface SearchTracksResponse {
  tracks: {
    items: SpotifyTrack[];
  };
}

interface SavedTracksResponse {
  items: Array<{
    added_at: string;
    track: SpotifyTrack | null;
  }>;
}

interface UserPlaylistsResponse {
  items: SpotifyPlaylist[];
}

interface SpotifyPlaybackDevice {
  id: string | null;
  name: string;
  type: string;
  is_active: boolean;
}

interface CurrentPlaybackResponse {
  device?: SpotifyPlaybackDevice;
  is_playing: boolean;
  progress_ms: number | null;
  item: SpotifyTrack | null;
}

export interface CurrentPlaybackSnapshot {
  isPlaying: boolean;
  progressMs: number;
  durationMs: number;
  track: Track | null;
  deviceId: string | null;
  deviceName: string | null;
  deviceType: string | null;
  isActiveDevice: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyApiService {
  private readonly auth = inject(SpotifyAuthService);
  private readonly apiBaseUrl = 'https://api.spotify.com/v1';

  async getRecentlyPlayedTracks(): Promise<Track[]> {
    const response = await this.request<RecentlyPlayedResponse>('/me/player/recently-played?limit=10');

    if (!response?.items?.length) {
      return [];
    }

    return response.items.map((item) => this.mapSpotifyTrack(item.track));
  }

  async getTopTracks(): Promise<Track[]> {
    const response = await this.request<TopTracksResponse>('/me/top/tracks?limit=10&time_range=short_term');

    if (!response?.items?.length) {
      return [];
    }

    return response.items.map((track) => this.mapSpotifyTrack(track));
  }
  
  async getSavedTracks(): Promise<Track[]> {
    const response = await this.request<SavedTracksResponse>('/me/tracks');
    if (!response?.items?.length) {
      return [];
    }

    return response.items.map((item) => item.track).filter((track): track is SpotifyTrack => {
      return Boolean(track && track.id && track.uri && track.type === 'track' && !track.is_local);
    }).map((track) => this.mapSpotifyTrack(track));
  }

  async getCurrentPlayback(): Promise<CurrentPlaybackSnapshot | null> {
    const response = await this.request<CurrentPlaybackResponse>(
      '/me/player?additional_types=track'
    );

    if (!response) {
      return null;
    }

    const item = response.item;
    const isPlayableTrack = Boolean(
      item &&
      item.id &&
      item.uri &&
      item.type === 'track' &&
      !item.is_local
    );

    const track = isPlayableTrack && item ? this.mapSpotifyTrack(item) : null;

    return {
      isPlaying: response.is_playing,
      progressMs: response.progress_ms ?? 0,
      durationMs: track?.durationMs ?? 0,
      track,
      deviceId: response.device?.id ?? null,
      deviceName: response.device?.name ?? null,
      deviceType: response.device?.type ?? null,
      isActiveDevice: response.device?.is_active ?? false,
    };
  }

  async searchTracks(query: string): Promise<Track[]> {
    const trimmedQuery = query.trim();

    if (!trimmedQuery) {
      return [];
    }

    const params = new URLSearchParams();

    params.set('q', trimmedQuery);
    params.set('type', 'track');

    const response = await this.request<SearchTracksResponse>(`/search?${params.toString()}`);

    if (!response?.tracks?.items?.length) {
      return [];
    }

    return response.tracks.items.map((track) => this.mapSpotifyTrack(track));
  }

  async getUserPlaylists(currentUserId?: string): Promise<Playlist[]> {
    const params = new URLSearchParams();

    params.set('limit', '50');
    params.set('fields', 'items(id,name,description,images(url),collaborative,owner(id,display_name),tracks(total)),next');

    const response = await this.request<UserPlaylistsResponse>(`/me/playlists?${params.toString()}`);
    if (!response?.items?.length) {
      return [];
    }

    return response.items.filter((playlist) => Boolean(playlist?.id)).map((playlist) => this.mapSpotifyPlaylist(playlist, currentUserId));
  }

  private async request<T>(endpoint: string): Promise<T | null> {
    const token = this.auth.getAccessToken();

    if (!token) {
      console.error('Spotify API error: missing access token.');
      return null;
    }

    const url = `${this.apiBaseUrl}${endpoint}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (response.status === 204) {
      return null;
    }

    if (!response.ok) {
      const errorBody = await response.text();

      console.error('Spotify API error:', {
        status: response.status,
        statusText: response.statusText,
        url,
        body: errorBody,
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error('Spotify access denied. Reconnect your Spotify account.');
      }

      return null;
    }

    return response.json() as Promise<T>;
  }

  private mapSpotifyTrack(track: SpotifyTrack): Track {
    return {
      id: track.id ?? track.uri,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(', '),
      album: track.album.name,
      cover: track.album.images[0]?.url ?? '',
      duration: this.formatDuration(track.duration_ms),
      durationMs: track.duration_ms,
      spotifyUri: track.uri,
      spotifyUrl: track.external_urls?.spotify,
    };
  }

  private mapSpotifyPlaylist(playlist: SpotifyPlaylist, currentUserId?: string): Playlist {
    const isOwnedByCurrentUser = Boolean(
      currentUserId && playlist.owner?.id === currentUserId
    );

    const collaborative = Boolean(playlist.collaborative);
    const isAccessible = isOwnedByCurrentUser || collaborative;

    return {
      id: playlist.id,
      title: playlist.name || 'Untitled playlist',
      description: playlist.description || 'Spotify playlist',
      image: playlist.images?.[0]?.url ?? '',
      owner: playlist.owner?.display_name ?? 'Spotify',
      totalTracks: playlist.tracks?.total ?? 0,
      isAccessible,
    };
  }

  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
