import { Injectable, inject } from '@angular/core';
import { Playlist, Track } from '../models/music.model';
import { SpotifyAuthService } from './spotify-auth.service';

interface SpotifyImage {
  url: string;
  height: number | null;
  width: number | null;
}

interface CreatePlaylistRequest {
  name: string;
  description: string;
  public: boolean;
  collaborative: boolean;
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
  duration_ms?: number;
  type?: string;
  is_local?: boolean;
  external_urls?: {
    spotify?: string;
  };
  artists?: SpotifyArtist[];
  album?: SpotifyAlbum;
}

interface SpotifyPlaylist {
  id: string;
  name: string;
  description?: string | null;
  images?: SpotifyImage[];
  uri?: string;
  collaborative?: boolean;
  external_urls?: {
    spotify?: string;
  };
  owner?: {
    id?: string;
    display_name?: string | null;
  };
  items?: {
    href?: string;
    total?: number;
  };
  tracks?: {
    href?: string;
    total?: number;
  };
}

interface PlaylistItem {
  track?: SpotifyTrack | null;
  item?: SpotifyTrack | null;
  is_local?: boolean;
}

interface PlaylistTracksResponse {
  items: PlaylistItem[];
  next?: string | null;
  total?: number;
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
  next?: string | null;
  total?: number;
}

interface UserPlaylistsResponse {
  items: SpotifyPlaylist[];
}

interface SpotifyPlaybackDevice {
  id: string | null;
  name: string;
  type?: string | null;
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
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyApiService {
  private readonly auth = inject(SpotifyAuthService);
  private readonly apiBaseUrl = 'https://api.spotify.com/v1';

  async getRecentlyPlayedTracks(): Promise<Track[]> {
    const response = await this.request<RecentlyPlayedResponse>('/me/player/recently-played?limit=10');

    return this.mapSpotifyTracks(response?.items.map((item) => item.track) ?? []);
  }

  async addTrackToPlaylist(playlistId: string, trackUri: string): Promise<boolean> {
    if (!playlistId || !trackUri) {
      return false;
    }

    const response = await this.request<{ snapshot_id: string }>(
      `/playlists/${encodeURIComponent(playlistId)}/items`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ uris: [trackUri] }),
      }
    );
    return Boolean(response?.snapshot_id);
  }

  async createPlaylist(data: CreatePlaylistRequest): Promise<Playlist | null> {
    const response = await this.request<SpotifyPlaylist>('/me/playlists', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response) {
      return null;
    }

    return this.mapSpotifyPlaylist(response, this.auth.profile()?.id);
  }

  async getTopTracks(): Promise<Track[]> {
    const response = await this.request<TopTracksResponse>('/me/top/tracks?limit=10&time_range=short_term');
    return this.mapSpotifyTracks(response?.items ?? []);
  }

  async getSavedTracks(): Promise<Track[] | null> {
    const limit = 50;
    let offset = 0;
    let hasNextPage = true;

    const savedItems: Array<{
      added_at: string;
      track: SpotifyTrack | null;
    }> = [];

    while (hasNextPage) {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('market', 'from_token');

      const response = await this.request<SavedTracksResponse>(`/me/tracks?${params.toString()}`);
      if (!response) {
        return null;
      }
      if (!response.items?.length) {
        break;
      }
      savedItems.push(...response.items);
      offset += limit;
      hasNextPage = Boolean(response.next);
    }

    return savedItems.map((item) => item.track).filter((track): track is SpotifyTrack => {
        return Boolean( track && track.name && track.uri && track.uri.startsWith('spotify:track:') && !track.is_local);
      }).map((track) => this.mapSpotifyTrack(track)
    );
  }

  async checkLibraryItem(uri: string): Promise<boolean> {
    if (!uri) {
      return false;
    }

    const response = await this.request<boolean[]>(`/me/library/contains?${this.createUriParams(uri)}`);
    return Boolean(response?.[0]);
  }

  async saveItemToLibrary(uri: string): Promise<void> {
    if (!uri) {
      throw new Error('Missing Spotify URI.');
    }

    await this.request<void>(`/me/library?${this.createUriParams(uri)}`, 
    {
      method: 'PUT',
    });
  }

  async removeItemFromLibrary(uri: string): Promise<void> {
    if (!uri) {
      throw new Error('Missing Spotify URI.');
    }

    await this.request<void>(`/me/library?${this.createUriParams(uri)}`, 
    {
      method: 'DELETE',
    });
  }

  async getCurrentPlayback(): Promise<CurrentPlaybackSnapshot | null> {
    const response = await this.request<CurrentPlaybackResponse>('/me/player?additional_types=track');
    if (!response) {
      return null;
    }

    const track = this.isPlayableSpotifyTrack(response.item) ? this.mapSpotifyTrack(response.item) : null;
    return {
      isPlaying: response.is_playing,
      progressMs: response.progress_ms ?? 0,
      durationMs: track?.durationMs ?? 0,
      track,
      deviceId: response.device?.id ?? null,
      deviceName: response.device?.name ?? null,
      deviceType: response.device?.type ?? null,
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

    return response.tracks.items
      .filter((track) => Boolean(track && track.name && track.uri))
      .map((track) => this.mapSpotifyTrack(track));
  }

  async getUserPlaylists(currentUserId?: string): Promise<Playlist[]> {
    const params = new URLSearchParams();
    params.set('limit', '50');
    params.set('fields', 'items(id,name,description,images(url),uri,collaborative,external_urls(spotify),owner(id,display_name),items(total),tracks(total)),next');
    const response = await this.request<UserPlaylistsResponse>(`/me/playlists?${params.toString()}`);
    if (!response?.items?.length) {
      return [];
    }

    return response.items.filter((playlist) => Boolean(playlist?.id)).map((playlist) => this.mapSpotifyPlaylist(playlist, currentUserId));
  }

  async getPlaylistTracks(playlistId: string): Promise<Track[]> {
    if (!playlistId) {
      return [];
    }

    const limit = 50;
    let offset = 0;
    let hasNextPage = true;
    const playlistItems: PlaylistItem[] = [];

    while (hasNextPage) {
      const params = new URLSearchParams();
      params.set('limit', String(limit));
      params.set('offset', String(offset));
      params.set('locale', 'pt-BR');
      const response = await this.request<PlaylistTracksResponse>(`/playlists/${encodeURIComponent(playlistId)}/items?${params.toString()}`);
      if (!response?.items?.length) {
        break;
      }

      playlistItems.push(...response.items);
      offset += limit;
      hasNextPage = Boolean(response.next);
    }

    return playlistItems.map((playlistItem) => {
        const track = playlistItem.track ?? playlistItem.item ?? null;
        if (!track || playlistItem.is_local || track.is_local) {
          return null;
        }

        return track;
      }).filter((track): track is SpotifyTrack => {
        return Boolean(
          track &&
          track.name &&
          track.uri &&
          track.uri.startsWith('spotify:track:')
        );
      }).map((track) => this.mapSpotifyTrack(track));
  }

  private createUriParams(uri: string): string {
    const params = new URLSearchParams();
    params.set('uris', uri);
    return params.toString();
  }

  private mapSpotifyTracks(tracks: SpotifyTrack[]): Track[] {
    return tracks.map((track) => this.mapSpotifyTrack(track));
  }

  private isPlayableSpotifyTrack(track: SpotifyTrack | null): track is SpotifyTrack {
    return Boolean(track && track.id && track.uri && !track.is_local);
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T | null> {
    const token = await this.auth.getValidAccessToken();
    if (!token) {
      console.error('Spotify API error: missing access token.');
      return null;
    }

    const url = `${this.apiBaseUrl}${endpoint}`;
    const response = await fetch(url, {
      ...options,
      headers: {Authorization: `Bearer ${token}`, ...(options.headers ?? {})}
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
        body: errorBody
      });

      if (response.status === 401 || response.status === 403) {
        throw new Error(`Spotify access denied: ${errorBody}`);
      }

      return null;
    }

    const text = await response.text();
    if (!text) {
      return null;
    }

    return JSON.parse(text) as T;
  }

  private mapSpotifyTrack(track: SpotifyTrack): Track {
    return {
      id: track.id ?? track.uri,
      title: track.name,
      artist: track.artists?.map((artist) => artist.name).join(', ') || 'Unknown artist',
      album: track.album?.name || 'Unknown album',
      cover: track.album?.images?.[0]?.url ?? '',
      duration: this.formatDuration(track.duration_ms ?? 0),
      durationMs: track.duration_ms ?? 0,
      spotifyUri: track.uri,
      spotifyUrl: track.external_urls?.spotify
    };
  }

  private mapSpotifyPlaylist(playlist: SpotifyPlaylist, currentUserId?: string): Playlist {
    const ownerId = playlist.owner?.id;
    const collaborative = Boolean(playlist.collaborative);
    const isOwnedByCurrentUser = Boolean(currentUserId && ownerId === currentUserId);
    const isAccessible = currentUserId ? isOwnedByCurrentUser || collaborative : true;

    return {
      id: playlist.id,
      title: playlist.name || 'Untitled playlist',
      description: playlist.description || 'Spotify playlist',
      image: playlist.images?.[0]?.url ?? '',
      owner: playlist.owner?.display_name ?? 'Spotify',
      ownerId, totalTracks: playlist.items?.total ?? playlist.tracks?.total ?? 0,
      collaborative, isOwnedByCurrentUser, isAccessible,
      spotifyUri: playlist.uri,
      spotifyUrl: playlist.external_urls?.spotify
    };
  }

  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
