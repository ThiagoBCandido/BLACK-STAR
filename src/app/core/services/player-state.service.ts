import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Playlist, Track } from '../models/music.model';
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

type AppScreen = 'home' | 'search' | 'library' | 'profile';

@Injectable({
  providedIn: 'root',
})
export class PlayerStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  readonly likedSongs = signal<Track[]>([]);
  readonly isLikedSongsOpen = signal(false);
  readonly isLoadingLikedSongs = signal(false);
  readonly tracks = signal<Track[]>(TRACKS);
  readonly playlists = signal(PLAYLISTS);
  readonly libraryPlaylists = signal<Playlist[]>([]);
  readonly isLoadingLibrary = signal(false);
  readonly libraryError = signal<string | null>(null);
  readonly currentTrack = signal<Track>(TRACKS[2]);
  readonly isPlaying = signal(false);
  readonly isPlayerOpen = signal(false);
  readonly isPlayerClosing = signal(false);
  readonly isLiked = signal(false);
  readonly isLoadingSpotifyTracks = signal(false);
  readonly activeScreen = signal<AppScreen>('home');
  readonly searchQuery = signal('');
  readonly searchResults = signal<Track[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly selectedOptionsTrack = signal<Track | null>(null);
  readonly trackOptionsMessage = signal<string | null>(null);
  readonly isTrackOptionsOpen = computed(() => Boolean(this.selectedOptionsTrack()));
  readonly activeSpotifyDeviceName = signal<string | null>(null);
  readonly isExternalPlaybackActive = signal(false);
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
  private searchRequestId = 0;
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

    if (screen === 'library' && !this.libraryPlaylists().length) {
      void this.loadLibraryPlaylists();
    }
  }

  async loadLibraryPlaylists(): Promise<void> {
    this.isLoadingLibrary.set(true);
    this.libraryError.set(null);

    try {
      const playlists = await this.spotifyApi.getUserPlaylists();

      this.libraryPlaylists.set(playlists);

      if (!playlists.length) {
        this.libraryError.set('No Spotify playlists found.');
      }
    } catch (error) {
      console.error('Could not load Spotify playlists:', error);
      this.libraryError.set('Could not load your Spotify playlists.');
    } finally {
      this.isLoadingLibrary.set(false);
    }
  }

  async openLikedSongs(): Promise<void> {
    this.isLikedSongsOpen.set(true);
    this.libraryError.set(null);

    if (this.likedSongs().length) {
      return;
    }

    await this.loadLikedSongs();
  }

  async loadLikedSongs(): Promise<void> {
    this.isLoadingLikedSongs.set(true);
    this.libraryError.set(null);

    try {
      const tracks = await this.spotifyApi.getSavedTracks();

      this.likedSongs.set(tracks);

      if (!tracks.length) {
        this.libraryError.set('No liked songs found in your Spotify library.');
      }
    } catch (error) {
      console.error('Could not load liked songs:', error);
      this.libraryError.set('Could not load your liked songs. Try reconnecting Spotify.');
    } finally {
      this.isLoadingLikedSongs.set(false);
    }
  }

  closeLikedSongs(): void {
    this.isLikedSongsOpen.set(false);
  }

  showPlaylistUnavailable(): void {
    this.libraryError.set(
      'Playlist track loading is temporarily disabled. Use Liked Songs or Search to play tracks for now.'
    );
  }

  openTrackOptions(track: Track, event?: Event): void {
    event?.stopPropagation();
    this.trackOptionsMessage.set(null);
    this.selectedOptionsTrack.set(track);
  }

  closeTrackOptions(): void {
    this.selectedOptionsTrack.set(null);
    this.trackOptionsMessage.set(null);
  }

  async playOptionsTrack(): Promise<void> {
    const track = this.selectedOptionsTrack();

    if (!track) {
      return;
    }

    await this.selectTrack(track);
    this.closeTrackOptions();
  }

  openSelectedTrackOnSpotify(): void {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUrl) {
      this.trackOptionsMessage.set('Spotify link is not available for this track.');
      return;
    }

    window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer');
  }

  async copySelectedTrackLink(): Promise<void> {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUrl) {
      this.trackOptionsMessage.set('Spotify link is not available for this track.');
      return;
    }

    try {
      await navigator.clipboard.writeText(track.spotifyUrl);
      this.trackOptionsMessage.set('Copied to clipboard.');
    } catch {
      this.trackOptionsMessage.set('Could not copy the link.');
    }
  }

  updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
  }

  async searchTracks(): Promise<void> {
    const query = this.searchQuery().trim();
    const requestId = ++this.searchRequestId;

    if (query.length < 2) {
      this.searchResults.set([]);
      this.hasSearched.set(false);
      this.isSearching.set(false);
      return;
    }

    this.isSearching.set(true);
    this.hasSearched.set(true);

    try {
      const results = await this.spotifyApi.searchTracks(query);

      if (requestId !== this.searchRequestId) {
        return;
      }

      this.searchResults.set(results);
    } catch (error) {
      console.error('Could not search Spotify tracks:', error);

      if (requestId === this.searchRequestId) {
        this.searchResults.set([]);
      }
    } finally {
      if (requestId === this.searchRequestId) {
        this.isSearching.set(false);
      }
    }
  }

  clearSearch(): void {
    this.searchRequestId++;
    this.searchQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.isSearching.set(false);
  }

  async selectTrack(track: Track): Promise<void> {
    this.currentTrack.set(track);
    this.isPlaying.set(true);
    this.moveTrackToTop(track);

    await this.playCurrentTrackOnSpotify();
  }

  async selectTrackAndOpenPlayer(track: Track): Promise<void> {
    this.currentTrack.set(track);
    this.isPlaying.set(true);
    this.moveTrackToTop(track);
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
    this.moveTrackToTop(track);

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
    this.moveTrackToTop(tracks[nextIndex]);

    await this.playCurrentTrackOnSpotify();
  }

  async previousTrack(event?: Event): Promise<void> {
    event?.stopPropagation();

    const tracks = this.tracks();
    const currentIndex = tracks.findIndex((track) => track.id === this.currentTrack().id);
    const previousIndex = currentIndex === 0 ? tracks.length - 1 : currentIndex - 1;

    this.currentTrack.set(tracks[previousIndex]);
    this.isPlaying.set(true);
    this.moveTrackToTop(tracks[previousIndex]);

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

    const existsInLikedSongs = this.likedSongs().some((item) => item.id === track.id);

    if (this.likedSongs().length && !existsInLikedSongs) {
      this.likedSongs.update((tracks) => [track, ...tracks]);
    }

    if (this.currentTrack().id !== track.id) {
      this.currentTrack.set(track);
    }
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
