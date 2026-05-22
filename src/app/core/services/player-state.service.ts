import { Injectable, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyPlayerService } from './spotify-player.service';

@Injectable({
  providedIn: 'root',
})
export class PlayerStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);

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

  async selectTrack(track: Track): Promise<void> {
    this.currentTrack.set(track);
    this.isPlaying.set(true);

    await this.playCurrentTrackOnSpotify();
  }

  async selectTrackAndOpenPlayer(track: Track): Promise<void> {
    this.currentTrack.set(track);
    this.isPlaying.set(true);
    this.openPlayer();

    await this.playCurrentTrackOnSpotify();
  }

  async toggleTrackPlayback(track: Track, event: Event): Promise<void> {
    event.stopPropagation();

    const isCurrentTrack = track.id === this.currentTrack().id;

    if (isCurrentTrack) {
      await this.togglePlay();
      return;
    }

    this.currentTrack.set(track);
    this.isPlaying.set(true);

    await this.playCurrentTrackOnSpotify();
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

  async togglePlay(event?: Event): Promise<void> {
    event?.stopPropagation();

    const hasSpotifyUri = Boolean(this.currentTrack().spotifyUri);

    if (!hasSpotifyUri) {
      this.isPlaying.update((value) => !value);
      return;
    }

    try {
      await this.spotifyPlayer.togglePlayback();
      this.isPlaying.update((value) => !value);
    } catch (error) {
      console.error('Could not toggle Spotify playback:', error);
    }
  }

  toggleLike(): void {
    this.isLiked.update((value) => !value);
  }

  async nextTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const nextIndex = (currentIndex + 1) % tracks.length;

    this.currentTrack.set(tracks[nextIndex]);
    this.isPlaying.set(true);

    await this.playCurrentTrackOnSpotify();
  }

  async previousTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const previousIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

    this.currentTrack.set(tracks[previousIndex]);
    this.isPlaying.set(true);

    await this.playCurrentTrackOnSpotify();
  }

  private async playCurrentTrackOnSpotify(): Promise<void> {
    const uri = this.currentTrack().spotifyUri;

    if (!uri) {
      return;
    }

    try {
      await this.spotifyPlayer.playTrack(uri);
      this.isPlaying.set(true);
    } catch (error) {
      this.isPlaying.set(false);
      console.error('Could not play Spotify track:', error);
    }
  }
}