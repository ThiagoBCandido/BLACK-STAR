import { Injectable, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerStateService {
  private readonly spotifyApi = inject(SpotifyApiService);

  readonly tracks = signal<Track[]>(TRACKS);
  readonly playlists = signal(PLAYLISTS);

  readonly currentTrack = signal<Track>(TRACKS[2]);
  readonly isPlaying = signal(false);
  readonly isPlayerOpen = signal(false);
  readonly isPlayerClosing = signal(false);
  readonly isLiked = signal(false);
  readonly isLoadingSpotifyTracks = signal(false);

  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  async loadSpotifyTracks(): Promise<void> {
    this.isLoadingSpotifyTracks.set(true);

    try {
      let spotifyTracks = await this.spotifyApi.getRecentlyPlayedTracks();

      if (!spotifyTracks.length) {
        spotifyTracks = await this.spotifyApi.getTopTracks();
      }

      if (!spotifyTracks.length) {
        return;
      }

      this.tracks.set(spotifyTracks);
      this.currentTrack.set(spotifyTracks[0]);
      this.isPlaying.set(false);
    } catch (error) {
      console.error('Could not load Spotify tracks:', error);
    } finally {
      this.isLoadingSpotifyTracks.set(false);
    }
  }

  selectTrack(track: Track): void {
    this.currentTrack.set(track);
    this.isPlaying.set(true);
  }

  selectTrackAndOpenPlayer(track: Track): void {
    this.currentTrack.set(track);
    this.isPlaying.set(true);
    this.openPlayer();
  }

  toggleTrackPlayback(track: Track, event: Event): void {
    event.stopPropagation();

    const isCurrentTrack = track.id === this.currentTrack().id;

    if (isCurrentTrack) {
      this.isPlaying.update((value) => !value);
      return;
    }

    this.currentTrack.set(track);
    this.isPlaying.set(true);
  }

  openPlayer(): void {
    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }

    this.isPlayerClosing.set(false);
    this.isPlayerOpen.set(true);
  }

  closePlayer(): void {
    this.isPlayerClosing.set(true);

    this.closeTimeoutId = setTimeout(() => {
      this.isPlayerOpen.set(false);
      this.isPlayerClosing.set(false);
      this.closeTimeoutId = null;
    }, 320);
  }

  togglePlay(event?: Event): void {
    event?.stopPropagation();
    this.isPlaying.update((value) => !value);
  }

  toggleLike(): void {
    this.isLiked.update((value) => !value);
  }

  nextTrack(event?: Event): void {
    event?.stopPropagation();

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const nextIndex = (currentIndex + 1) % tracks.length;

    this.currentTrack.set(tracks[nextIndex]);
    this.isPlaying.set(true);
  }

  previousTrack(event?: Event): void {
    event?.stopPropagation();

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const previousIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

    this.currentTrack.set(tracks[previousIndex]);
    this.isPlaying.set(true);
  }
}
