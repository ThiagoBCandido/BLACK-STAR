import { Injectable, effect, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyPlayerService } from './spotify-player.service';
import { ToastService } from './toast.service';
import { LibraryStateService } from '../state/library-state.service';
import { BrowseStateService } from '../state/browse-state.service';
import { PlaybackStateService } from '../state/playback-state.service';

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
  /* services */
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly toast = inject(ToastService);
  private readonly libraryState = inject(LibraryStateService);
  private readonly browseState = inject(BrowseStateService);
  private readonly playbackState = inject(PlaybackStateService);

  /* app data signals */
  readonly playlists = signal(PLAYLISTS);

  /* playback signals */
  readonly currentTrack = this.playbackState.currentTrack;
  readonly isPlaying = this.playbackState.isPlaying;
  readonly isPlayerOpen = this.playbackState.isPlayerOpen;
  readonly isPlayerClosing = signal(false);
  readonly isLiked = signal(false);

  /* Spotify sync signals */
  readonly activeSpotifyDeviceName = this.playbackState.activeSpotifyDeviceName;
  readonly activeSpotifyDeviceType = this.playbackState.activeSpotifyDeviceType;
  readonly isExternalPlaybackActive = this.playbackState.isExternalPlaybackActive;
  readonly isPlaybackSyncEnabled = this.playbackState.isPlaybackSyncEnabled;

  /* player computed values */
  readonly positionMs = this.playbackState.positionMs;
  readonly progressMs = this.playbackState.progressMs;
  readonly durationMs = this.playbackState.durationMs;

  readonly volumePercent = this.playbackState.volumePercent;
  readonly previousVolumePercent = this.playbackState.previousVolumePercent;
  readonly isMuted = this.playbackState.isMuted;

  readonly isShuffleEnabled = this.playbackState.isShuffleEnabled;
  readonly repeatMode = this.playbackState.repeatMode;

  readonly progressPercent = this.playbackState.progressPercent;
  readonly currentTime = this.playbackState.currentTime;
  readonly durationTime = this.playbackState.durationTime;
  readonly totalTime = this.playbackState.totalTime;
  readonly positionLabel = this.playbackState.currentTime;
  readonly durationLabel = this.playbackState.durationTime;

  private closeTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private playbackSyncIntervalId: ReturnType<typeof setInterval> | null = null;
  private isSyncingCurrentPlayback = false;

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

        const existingTrack = this.browseState
          .recentlyPlayedTracks()
          .find((track) => track.id === playbackTrack.id);
        const mappedTrack = existingTrack ?? this.mapPlaybackTrack(playbackTrack, state.duration);

        if (!existingTrack) {
          this.browseState.moveTrackToTop(mappedTrack);
        }

        if (this.currentTrack().id !== mappedTrack.id) {
          this.playbackState.setCurrentTrack(mappedTrack);
        }
      },
      { allowSignalWrites: true }
    );

    effect(() => {
        const track = this.currentTrack();
        if (!track.spotifyUri) {
          this.isLiked.set(false);
          return;
        }
        void this.syncCurrentTrackLikeState(track);
      },
      { allowSignalWrites: true }
    );
  }

  setInitialTrack(track?: Track): void {
    if (!track) {
      return;
    }

    const currentTrack = this.currentTrack();
    const shouldReplaceCurrentTrack =
      !currentTrack.spotifyUri || currentTrack.id.startsWith('mock');

    if (!shouldReplaceCurrentTrack) {
      return;
    }

    this.playbackState.setCurrentTrack(track);
    this.isPlaying.set(false);
  }

  startPlaybackSync(): void {
    if (this.playbackSyncIntervalId) {
      return;
    }

    this.isPlaybackSyncEnabled.set(true);

    void this.syncCurrentPlayback();

    this.playbackSyncIntervalId = setInterval(() => {
      void this.syncCurrentPlayback();
    }, 3000);
  }

  stopPlaybackSync(): void {
    if (this.playbackSyncIntervalId) {
      clearInterval(this.playbackSyncIntervalId);
      this.playbackSyncIntervalId = null;
    }

    this.activeSpotifyDeviceName.set(null);
    this.activeSpotifyDeviceType.set(null);
    this.isExternalPlaybackActive.set(false);
    this.isPlaybackSyncEnabled.set(false);
  }

  async syncCurrentPlayback(): Promise<void> {
    if (this.isSyncingCurrentPlayback) {
      return;
    }

    this.isSyncingCurrentPlayback = true;

    try {
      const playback = await this.spotifyApi.getCurrentPlayback();

      if (!playback) {
        this.isPlaying.set(false);
        this.activeSpotifyDeviceName.set(null);
        this.activeSpotifyDeviceType.set(null);
        this.isExternalPlaybackActive.set(false);
        this.playbackState.setPlaybackProgress(0, this.durationMs());

        this.spotifyPlayer.applyExternalPlaybackState({
          isPlaying: false,
          positionMs: 0,
          durationMs: this.durationMs(),
          trackUri: this.currentTrack().spotifyUri ?? null,
        });

        return;
      }

      this.activeSpotifyDeviceName.set(playback.deviceName);
      this.activeSpotifyDeviceType.set(playback.deviceType);

      const blackStarDeviceId = this.spotifyPlayer.deviceId();
      const isExternalDevice = Boolean(
        playback.deviceId &&
        blackStarDeviceId &&
        playback.deviceId !== blackStarDeviceId
      );

      this.isExternalPlaybackActive.set(isExternalDevice);
      this.isPlaying.set(playback.isPlaying);

      if (playback.track) {
        this.syncCurrentTrackFromSpotify(playback.track);
      }

      this.playbackState.setPlaybackProgress(
        playback.progressMs,
        playback.durationMs
      );

      this.spotifyPlayer.applyExternalPlaybackState({
        isPlaying: playback.isPlaying,
        positionMs: playback.progressMs,
        durationMs: playback.durationMs,
        trackUri: playback.track?.spotifyUri ?? null,
      });
    } catch (error) {
      console.error('Could not sync Spotify playback:', error);
    } finally {
      this.isSyncingCurrentPlayback = false;
    }
  }

  async selectTrack(track: Track): Promise<void> {
    this.setCurrentTrackForPlayback(track);

    await this.playCurrentTrackOnSpotify();
  }

  async selectTrackAndOpenPlayer(track: Track): Promise<void> {
    this.setCurrentTrackForPlayback(track);
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

    this.setCurrentTrackForPlayback(track);

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

  async toggleLike(): Promise<void> {
    const track = this.currentTrack();

    if (!track.spotifyUri) {
      this.toast.error('This track cannot be added to Liked Songs.');
      return;
    }

    const previousState = this.isLiked();
    const nextState = !previousState;

    this.isLiked.set(nextState);

    try {
      if (nextState) {
        await this.spotifyApi.saveItemToLibrary(track.spotifyUri);
        this.addTrackToLikedState(track);
        this.toast.success('Added to Liked Songs.');
        return;
      }

      await this.spotifyApi.removeItemFromLibrary(track.spotifyUri);
      this.removeTrackFromLikedState(track);
      this.toast.info('Removed from Liked Songs.');
    } catch (error) {
      console.error('Could not update liked state:', error);
      this.isLiked.set(previousState);
      this.toast.error('Could not update Liked Songs.');
    }
  }

  async nextTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.browseState.recentlyPlayedTracks();

    if (!tracks.length) {
      return;
    }

    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const nextIndex = (currentIndex + 1) % tracks.length;

    this.setCurrentTrackForPlayback(tracks[nextIndex]);

    await this.playCurrentTrackOnSpotify();
  }

  async previousTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.browseState.recentlyPlayedTracks();

    if (!tracks.length) {
      return;
    }

    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const previousIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

    this.setCurrentTrackForPlayback(tracks[previousIndex]);

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

  private syncCurrentTrackFromSpotify(track: Track): void {
    this.moveTrackToTop(track);

    if (this.shouldMirrorTrackIntoLikedSongs(track)) {
      this.addTrackToLikedState(track);
    }

    if (this.currentTrack().id !== track.id) {
      this.playbackState.setCurrentTrack(track);
    }
  }

  private async syncCurrentTrackLikeState(track: Track): Promise<void> {
    const isSaved = await this.libraryState.checkTrackLikeState(track);
    this.isLiked.set(isSaved);
  }

  private addTrackToLikedState(track: Track): void {
    this.libraryState.addTrackToLikedState(track);
  }

  private removeTrackFromLikedState(track: Track): void {
    this.libraryState.removeTrackFromLikedState(track);
  }

  private shouldMirrorTrackIntoLikedSongs(track: Track): boolean {
    const likedSongs = this.libraryState.likedSongs();

    return Boolean(
      likedSongs.length &&
      !likedSongs.some((item) => item.id === track.id)
    );
  }

  private setCurrentTrackForPlayback(track: Track): void {
    this.playbackState.setCurrentTrack(track);
    this.isPlaying.set(true);
    this.moveTrackToTop(track);
  }

  private moveTrackToTop(track: Track): void {
    this.browseState.moveTrackToTop(track);
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
