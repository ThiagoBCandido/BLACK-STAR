import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyPlayerService } from './spotify-player.service';
import { ToastService } from './toast.service';
import { LibraryStateService } from '../state/library-state.service';

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

type AppScreen = 'home' | 'search' | 'library' | 'profile' | 'recentlyPlayed' | 'topTracks';

@Injectable({
  providedIn: 'root',
})
export class PlayerStateService {
  /* services */
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly toast = inject(ToastService);
  private readonly libraryState = inject(LibraryStateService);

  /* app data signals */
  readonly tracks = signal<Track[]>(TRACKS);
  readonly playlists = signal(PLAYLISTS);

  /* playback signals */
  readonly currentTrack = signal<Track>(TRACKS[2]);
  readonly isPlaying = signal(false);
  readonly isPlayerOpen = signal(false);
  readonly isPlayerClosing = signal(false);
  readonly isLiked = signal(false);
  readonly isLoadingSpotifyTracks = signal(false);

  /* navigation signals */
  readonly activeScreen = signal<AppScreen>('home');

  /* track action signals */
  readonly topTracks = signal<Track[]>([]);
  readonly isLoadingTopTracks = signal(false);

  /* Spotify sync signals */
  readonly activeSpotifyDeviceName = signal<string | null>(null);
  readonly isExternalPlaybackActive = signal(false);

  /* home computed values */
  readonly featuredTrack = computed(() => {
    const currentTrack = this.currentTrack();
    const firstTrack = this.tracks()[0];

    return currentTrack ?? firstTrack;
  });

  readonly featuredDescription = computed(() => {
    const track = this.featuredTrack();

    if (!track) {
      return 'A dark music experience through BLACK STAR.';
    }

    return `${track.album} · ${track.duration}`;
  });

  /* player computed values */
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

      const uniqueTracks = this.removeDuplicateTracks(spotifyTracks);

      this.tracks.set(uniqueTracks);
      this.currentTrack.set(uniqueTracks[0]);
      this.isPlaying.set(false);
    } catch (error) {
      console.error('Could not load Spotify tracks:', error);
    } finally {
      this.isLoadingSpotifyTracks.set(false);
    }
  }

  startPlaybackSync(): void {
    if (this.playbackSyncIntervalId) {
      return;
    }

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
    this.isExternalPlaybackActive.set(false);
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
        this.isExternalPlaybackActive.set(false);

        this.spotifyPlayer.applyExternalPlaybackState({
          isPlaying: false,
          positionMs: 0,
          durationMs: this.durationMs(),
          trackUri: this.currentTrack().spotifyUri ?? null,
        });

        return;
      }

      this.activeSpotifyDeviceName.set(playback.deviceName);

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

  setActiveScreen(screen: AppScreen): void {
    this.activeScreen.set(screen);

    switch (screen) {
      case 'library':
        if (!this.libraryState.libraryPlaylists().length) {
          void this.libraryState.loadLibraryPlaylists();
        }
        break;

      case 'topTracks':
        if (!this.topTracks().length) {
          void this.loadTopTracks();
        }
        break;

      default:
        break;
    }
  }

  async loadTopTracks(): Promise<void> {
    this.isLoadingTopTracks.set(true);

    try {
      const tracks = await this.spotifyApi.getTopTracks();

      this.topTracks.set(this.removeDuplicateTracks(tracks));
    } catch (error) {
      console.error('Could not load Spotify top tracks:', error);
      this.toast.error('Could not load your top tracks.');
    } finally {
      this.isLoadingTopTracks.set(false);
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

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const nextIndex = (currentIndex + 1) % tracks.length;

    this.setCurrentTrackForPlayback(tracks[nextIndex]);

    await this.playCurrentTrackOnSpotify();
  }

  async previousTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.tracks();
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
      this.currentTrack.set(track);
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
    this.currentTrack.set(track);
    this.isPlaying.set(true);
    this.moveTrackToTop(track);
  }

  private moveTrackToTop(track: Track): void {
    this.tracks.update((tracks) => {
      const filteredTracks = tracks.filter((item) => item.id !== track.id);
      return [track, ...filteredTracks];
    });
  }

  private removeDuplicateTracks(tracks: Track[]): Track[] {
    const seenTrackIds = new Set<string>();

    return tracks.filter((track) => {
      if (seenTrackIds.has(track.id)) {
        return false;
      }

      seenTrackIds.add(track.id);
      return true;
    });
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
