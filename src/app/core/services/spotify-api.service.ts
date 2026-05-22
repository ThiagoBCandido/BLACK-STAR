import { Injectable, inject } from '@angular/core';
import { Track } from '../models/music.model';
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
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  external_urls: {
    spotify: string;
  };
  artists: SpotifyArtist[];
  album: SpotifyAlbum;
}

interface RecentlyPlayedResponse {
  items: Array<{
    track: SpotifyTrack;
  }>;
}

interface TopTracksResponse {
  items: SpotifyTrack[];
}

@Injectable({
  providedIn: 'root',
})
export class SpotifyApiService {
  private readonly auth = inject(SpotifyAuthService);
  private readonly apiBaseUrl = 'https://api.spotify.com/v1';

  async getRecentlyPlayedTracks(): Promise<Track[]> {
    const response = await this.request<RecentlyPlayedResponse>(
      '/me/player/recently-played?limit=10'
    );

    if (!response?.items?.length) {
      return [];
    }

    return response.items.map((item) => this.mapSpotifyTrack(item.track));
  }

  async getTopTracks(): Promise<Track[]> {
    const response = await this.request<TopTracksResponse>(
      '/me/top/tracks?limit=10&time_range=short_term'
    );

    if (!response?.items?.length) {
      return [];
    }

    return response.items.map((track) => this.mapSpotifyTrack(track));
  }

  private async request<T>(endpoint: string): Promise<T | null> {
    const token = this.auth.getAccessToken();

    if (!token) {
      return null;
    }

    const response = await fetch(`${this.apiBaseUrl}${endpoint}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      console.error('Spotify API error:', response.status, response.statusText);
      return null;
    }

    return response.json() as Promise<T>;
  }

  private mapSpotifyTrack(track: SpotifyTrack): Track {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(', '),
      album: track.album.name,
      cover: track.album.images[0]?.url ?? '',
      duration: this.formatDuration(track.duration_ms),
      durationMs: track.duration_ms,
      spotifyUri: track.uri,
      spotifyUrl: track.external_urls.spotify,
    };
  }

  private formatDuration(durationMs: number): string {
    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
