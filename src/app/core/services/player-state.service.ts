import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyPlayerService } from './spotify-player.service';

interface PlaybackTrack {
  id: string;
  name: string;
  uri: string;
  duration_ms: number;
  artists: Array<{ name: string }>;
  album: {
    name: string;
    images: Array<{ url: string }>;
  };
}

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

  readonly positionMs = computed(() => this.spotifyPlayer.positionMs());

  readonly durationMs = computed(() => {
    const spotifyDuration = this.spotifyPlayer.durationMs();

    if (spotifyDuration > 0) {
      return spotifyDuration;
    }

    return this.currentTrack().durationMs ?? 0;
  });

  readonly progressPercent = computed(() => {
    const duration = this.durationMs();

    if (!duration) {
      return 0;
    }

    return Math.min((this.positionMs() / duration) * 100, 100);
  });

  readonly positionLabel = computed(() => this.formatDuration(this.positionMs()));
  readonly durationLabel = computed(() => this.formatDuration(this.durationMs()));
  readonly isShuffleEnabled = computed(() => this.spotifyPlayer.isShuffleEnabled());
  readonly repeatMode = computed(() => this.spotifyPlayer.repeatMode());
  readonly volumePercent = computed(() => this.spotifyPlayer.volumePercent());
  readonly isMuted = computed(() => this.spotifyPlayer.isMuted());

  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    effect(
      () => {
        const state = this.spotifyPlayer.playbackState();

        if (!state) {
          return;
        }

        const playbackTrack = state.track_window.current_track;

        if (!playbackTrack?.id) {
          return;
        }

        this.isPlaying.set(!state.paused);

        const existingTrack = this.tracks().find((track) => track.id === playbackTrack.id);
        const mappedTrack = existingTrack ?? this.mapPlaybackTrack(playbackTrack, state.duration);

        if (!existingTrack) {
          this.tracks.update((tracks) => [mappedTrack, ...tracks]);
        }

        if (this.currentTrack().id !== mappedTrack.id) {
          this.currentTrack.set(mappedTrack);
        }
      },
      { allowSignalWrites: true }
    );
  }

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

  async toggleShuffle(): Promise<void> {
    try {
      await this.spotifyPlayer.toggleShuffle();
    } catch (error) {
      console.error('Could not toggle Spotify shuffle:', error);
    }
  }

  async cycleRepeatMode(): Promise<void> {
    try {
      await this.spotifyPlayer.cycleRepeatMode();
    } catch (error) {
      console.error('Could not change Spotify repeat mode:', error);
    }
  }

  async setVolumeFromInput(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const value = Number(input.value);

    try {
      await this.spotifyPlayer.setVolumePercent(value);
    } catch (error) {
      console.error('Could not change Spotify volume:', error);
    }
  }

  async toggleMute(event?: Event): Promise<void> {
    event?.stopPropagation();

    try {
      await this.spotifyPlayer.toggleMute();
    } catch (error) {
      console.error('Could not toggle Spotify mute:', error);
    }
  }

  async seekFromProgressClick(event: MouseEvent): Promise<void> {
    const progressElement = event.currentTarget as HTMLElement;
    const rect = progressElement.getBoundingClientRect();
    const clickPosition = event.clientX - rect.left;
    const ratio = Math.max(0, Math.min(clickPosition / rect.width, 1));
    const targetPosition = Math.round(this.durationMs() * ratio);

    try {
      await this.spotifyPlayer.seekTo(targetPosition);
    } catch (error) {
      console.error('Could not seek Spotify playback:', error);
    }
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

  private mapPlaybackTrack(track: PlaybackTrack, durationMs: number): Track {
    return {
      id: track.id,
      title: track.name,
      artist: track.artists.map((artist) => artist.name).join(', '),
      album: track.album.name,
      cover: track.album.images[0]?.url ?? '',
      duration: this.formatDuration(durationMs || track.duration_ms),
      durationMs: durationMs || track.duration_ms,
      spotifyUri: track.uri,
    };
  }

  private formatDuration(durationMs: number): string {
    if (!durationMs || durationMs < 0) {
      return '0:00';
    }

    const totalSeconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}
