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
  readonly hasCurrentTrack = this.playbackState.hasCurrentTrack;
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

  readonly queueTracks = this.playbackState.queueTracks;
  readonly queueName = this.playbackState.queueName;
  readonly hasQueue = this.playbackState.hasQueue;

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

        this.playbackState.setPlaying(!state.paused);

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
          this.isLiked.set(this.libraryState.likedTrackIds().has(track.id));
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

    this.playbackState.setCurrentTrack(track, { markAsCurrent: false });
    this.playbackState.setPlaying(false);
  }

  startPlaybackSync(): void {
    return;
  }

  stopPlaybackSync(): void {
    if (this.playbackSyncIntervalId) {
      clearInterval(this.playbackSyncIntervalId);
      this.playbackSyncIntervalId = null;
    }

    this.playbackState.setPlaybackSyncEnabled(false);
    this.playbackState.clearSpotifyDevice();
  }

  async syncCurrentPlayback(): Promise<void> {
    if (this.isSyncingCurrentPlayback) {
      return;
    }

    this.isSyncingCurrentPlayback = true;

    try {
      const playback = await this.spotifyApi.getCurrentPlayback();

      if (!playback) {
        this.playbackState.setPlaying(false);
        this.playbackState.clearSpotifyDevice();
        this.playbackState.setPlaybackProgress(0, this.durationMs());

        this.spotifyPlayer.applyExternalPlaybackState({
          isPlaying: false,
          positionMs: 0,
          durationMs: this.durationMs(),
          trackUri: this.currentTrack().spotifyUri ?? null,
        });

        return;
      }

      const blackStarDeviceId = this.spotifyPlayer.deviceId();
      const isExternalDevice = Boolean(
        playback.deviceId &&
        blackStarDeviceId &&
        playback.deviceId !== blackStarDeviceId
      );

      this.playbackState.setSpotifyDevice({
        name: playback.deviceName,
        type: playback.deviceType,
        isExternal: isExternalDevice,
      });
      this.playbackState.setPlaying(playback.isPlaying);

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

  selectTrack(track: Track): Promise<void> {
    return this.playbackState.selectTrack(track);
  }

  playQueue(tracks: Track[], queueName = 'Queue'): Promise<void> {
    return this.playbackState.playQueue(tracks, queueName);
  }

  selectTrackFromQueue(
    track: Track,
    tracks: Track[],
    queueName = 'Queue'
  ): Promise<void> {
    return this.playbackState.selectTrackFromQueue(track, tracks, queueName);
  }

  selectTrackAndOpenPlayer(track: Track): Promise<void> {
    return this.playbackState.selectTrackAndOpenPlayer(track);
  }

  toggleTrackPlayback(track: Track, event?: Event): Promise<void> {
    return this.playbackState.toggleTrackPlayback(track, event);
  }

  openPlayer(): void {
    if (this.closeTimeoutId) {
      clearTimeout(this.closeTimeoutId);
      this.closeTimeoutId = null;
    }

    this.isPlayerClosing.set(false);
    this.playbackState.openPlayer();
  }

  closePlayer(): void {
    if (this.closeTimeoutId) {
      return;
    }

    this.isPlayerClosing.set(true);

    this.closeTimeoutId = setTimeout(() => {
      this.playbackState.closePlayer();
      this.isPlayerClosing.set(false);
      this.closeTimeoutId = null;
    }, 240);
  }

  togglePlay(event?: Event): Promise<void> {
    return this.playbackState.togglePlay(event);
  }

  async toggleLike(): Promise<void> {
    const track = this.currentTrack();

    if (!track.spotifyUri) {
      const isAlreadyLiked = this.libraryState.likedTrackIds().has(track.id);

      if (isAlreadyLiked) {
        this.removeTrackFromLikedState(track);
        this.isLiked.set(false);
        this.toast.info('Removed from Liked Songs.');
        return;
      }

      this.addTrackToLikedState(track);
      this.isLiked.set(true);
      this.toast.success('Added to Liked Songs.');
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

  nextTrack(event?: Event): Promise<void> {
    return this.playbackState.nextTrack(event);
  }

  previousTrack(event?: Event): Promise<void> {
    return this.playbackState.previousTrack(event);
  }

  async toggleShuffle(): Promise<void> {
    return this.playbackState.toggleSpotifyShuffle();
  }

  async cycleRepeatMode(): Promise<void> {
    return this.playbackState.cycleSpotifyRepeatMode();
  }

  setVolume(event: Event): Promise<void> {
    return this.playbackState.setSpotifyVolumeFromEvent(event);
  }

  setVolumeFromInput(event: Event): Promise<void> {
    return this.setVolume(event);
  }

  toggleMute(): Promise<void> {
    return this.playbackState.toggleSpotifyMute();
  }

  toggleRepeat(): Promise<void> {
    return this.playbackState.cycleSpotifyRepeatMode();
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

  private syncCurrentTrackFromSpotify(track: Track): void {
    this.browseState.moveTrackToTop(track);

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
