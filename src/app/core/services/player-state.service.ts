import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { PLAYLISTS, TRACKS } from '../data/mock-music.data';
import { Playlist, Track } from '../models/music.model';
import { SpotifyApiService } from './spotify-api.service';
import { SpotifyAuthService } from './spotify-auth.service';
import { SpotifyPlayerService } from './spotify-player.service';
import { ToastService } from './toast.service';

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
  private readonly spotifyAuth = inject(SpotifyAuthService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly toast = inject(ToastService);

  /* library signals */
  readonly libraryTrackSearchQuery = signal('');
  readonly likedSongs = signal<Track[]>([]);
  readonly likedTrackIds = signal<Set<string>>(new Set());
  readonly isLikedSongsOpen = signal(false);
  readonly isLoadingLikedSongs = signal(false);

  /* app data signals */
  readonly tracks = signal<Track[]>(TRACKS);
  readonly playlists = signal(PLAYLISTS);

  /* Spotify library signals */
  readonly libraryPlaylists = signal<Playlist[]>([]);
  readonly selectedPlaylist = signal<Playlist | null>(null);
  readonly selectedPlaylistTracks = signal<Track[]>([]);
  readonly isLoadingLibrary = signal(false);
  readonly isLoadingPlaylistTracks = signal(false);
  readonly libraryError = signal<string | null>(null);

  /* playlist creation signals */
  readonly isCreatePlaylistOpen = signal(false);
  readonly createPlaylistName = signal('');
  readonly createPlaylistDescription = signal('');
  readonly createPlaylistIsPublic = signal(false);
  readonly isCreatingPlaylist = signal(false);

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
  readonly isAddToPlaylistOpen = signal(false);
  readonly isAddingTrackToPlaylist = signal(false);
  readonly topTracks = signal<Track[]>([]);
  readonly isLoadingTopTracks = signal(false);
  readonly selectedOptionsTrack = signal<Track | null>(null);
  readonly isTrackOptionsOpen = computed(() => Boolean(this.selectedOptionsTrack()));

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

  /* library computed values */
  readonly filteredLikedSongs = computed(() => {
    const query = this.libraryTrackSearchQuery().trim().toLowerCase();

    if (!query) {
      return this.likedSongs();
    }

    return this.likedSongs().filter((track) =>
      `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query)
    );
  });

  readonly filteredSelectedPlaylistTracks = computed(() => {
    const query = this.libraryTrackSearchQuery().trim().toLowerCase();

    if (!query) {
      return this.selectedPlaylistTracks();
    }

    return this.selectedPlaylistTracks().filter((track) =>
      `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query)
    );
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

  openAddToPlaylist(): void {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUri) {
      this.toast.error('This track cannot be added to a playlist.');
      return;
    }

    this.isAddToPlaylistOpen.set(true);

    if (!this.libraryPlaylists().length) {
      void this.loadLibraryPlaylists();
    }
  }

  closeAddToPlaylist(): void {
    if (this.isAddingTrackToPlaylist()) {
      return;
    }

    this.isAddToPlaylistOpen.set(false);
  }

  async addSelectedTrackToPlaylist(playlistId: string): Promise<void> {
    const track = this.selectedOptionsTrack();
    const playlist = this.libraryPlaylists().find((item) => item.id === playlistId);

    if (!track?.spotifyUri) {
      this.toast.error('This track cannot be added to a playlist.');
      return;
    }

    if (!playlist) {
      this.toast.error('Playlist not found.');
      return;
    }

    if (playlist.isAccessible === false) {
      this.toast.error('Spotify does not allow editing this playlist.');
      return;
    }

    this.isAddingTrackToPlaylist.set(true);

    try {
      const success = await this.spotifyApi.addTrackToPlaylist(
        playlist.id,
        track.spotifyUri
      );

      if (!success) {
        this.toast.error('Could not add track to playlist.');
        return;
      }

      this.libraryPlaylists.update((playlists) =>
        playlists.map((item) =>
          item.id === playlist.id
            ? { ...item, totalTracks: (item.totalTracks ?? 0) + 1 }
            : item
        )
      );

      if (this.selectedPlaylist()?.id === playlist.id) {
        this.selectedPlaylistTracks.update((tracks) => {
          const alreadyExists = tracks.some((item) => item.id === track.id);

          if (alreadyExists) {
            return tracks;
          }

          return [track, ...tracks];
        });
      }

      this.toast.success(`Added to ${playlist.title}.`);
      this.isAddToPlaylistOpen.set(false);
      this.closeTrackOptions();
    } catch (error) {
      console.error('Could not add track to playlist:', error);
      this.toast.error('Could not add track to playlist.');
    } finally {
      this.isAddingTrackToPlaylist.set(false);
    }
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
        if (!this.libraryPlaylists().length) {
          void this.loadLibraryPlaylists();
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

  /* library methods */
  updateLibraryTrackSearchQuery(query: string): void {
    this.libraryTrackSearchQuery.set(query);
  }

  clearLibraryTrackSearch(): void {
    this.libraryTrackSearchQuery.set('');
  }

  async loadLibraryPlaylists(): Promise<void> {
    this.isLoadingLibrary.set(true);
    this.libraryError.set(null);

    try {
      const currentUserId = this.spotifyAuth.profile()?.id;
      const playlists = await this.spotifyApi.getUserPlaylists(currentUserId);

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

  async selectPlaylist(playlist: Playlist): Promise<void> {
    if (playlist.isAccessible === false) {
      this.toast.error('Spotify only allows opening playlists you own or collaborate on.');
      return;
    }

    this.clearLibraryTrackSearch();
    this.isLikedSongsOpen.set(false);
    this.selectedPlaylist.set(playlist);
    this.selectedPlaylistTracks.set([]);
    this.isLoadingPlaylistTracks.set(true);
    this.libraryError.set(null);

    try {
      const tracks = await this.spotifyApi.getPlaylistTracks(playlist.id);

      this.selectedPlaylistTracks.set(tracks);

      if (!tracks.length) {
        this.libraryError.set(
          'No playable tracks were returned by Spotify for this playlist.'
        );
      }
    } catch (error) {
      console.error('Could not load Spotify playlist tracks:', error);
      this.libraryError.set('Could not load this playlist. Check the console error.');
    } finally {
      this.isLoadingPlaylistTracks.set(false);
    }
  }

  closeSelectedPlaylist(): void {
    this.clearLibraryTrackSearch();
    this.selectedPlaylist.set(null);
    this.selectedPlaylistTracks.set([]);
    this.libraryError.set(null);
  }

  openCreatePlaylist(): void {
    this.createPlaylistName.set('');
    this.createPlaylistDescription.set('');
    this.createPlaylistIsPublic.set(false);
    this.isCreatePlaylistOpen.set(true);
  }

  closeCreatePlaylist(): void {
    if (this.isCreatingPlaylist()) {
      return;
    }

    this.isCreatePlaylistOpen.set(false);
  }

  updateCreatePlaylistName(name: string): void {
    this.createPlaylistName.set(name);
  }

  updateCreatePlaylistDescription(description: string): void {
    this.createPlaylistDescription.set(description);
  }

  toggleCreatePlaylistVisibility(): void {
    this.createPlaylistIsPublic.update((value) => !value);
  }

  async createSpotifyPlaylist(): Promise<void> {
    const name = this.createPlaylistName().trim();
    const description = this.createPlaylistDescription().trim();
    const isPublic = this.createPlaylistIsPublic();

    if (!name) {
      this.toast.warning('Playlist name is required.');
      return;
    }

    this.isCreatingPlaylist.set(true);

    try {
      const playlist = await this.spotifyApi.createPlaylist({
        name,
        description,
        public: isPublic,
        collaborative: false,
      });

      if (!playlist) {
        this.toast.error('Could not create playlist.');
        return;
      }

      this.libraryPlaylists.update((playlists) => [playlist, ...playlists]);
      this.toast.success('Playlist created.');
      this.isCreatePlaylistOpen.set(false);
    } catch (error) {
      console.error('Could not create Spotify playlist:', error);
      this.toast.error('Could not create playlist. Reconnect Spotify and try again.');
    } finally {
      this.isCreatingPlaylist.set(false);
    }
  }

  async openLikedSongs(): Promise<void> {
    this.clearLibraryTrackSearch();
    this.isLikedSongsOpen.set(true);
    this.selectedPlaylist.set(null);
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

      if (tracks === null) {
        this.libraryError.set('Could not refresh Liked Songs right now.');
        return;
      }

      this.likedSongs.set(tracks);
      this.syncLikedTrackIds(tracks);

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
    this.clearLibraryTrackSearch();
    this.isLikedSongsOpen.set(false);
  }

  openTrackOptions(track: Track, event?: Event): void {
    event?.stopPropagation();
    this.selectedOptionsTrack.set(track);
  }

  closeTrackOptions(): void {
    this.selectedOptionsTrack.set(null);
  }

  async playOptionsTrack(): Promise<void> {
    const track = this.selectedOptionsTrack();

    if (!track) {
      return;
    }

    await this.selectTrack(track);
    this.closeTrackOptions();
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

  async addSelectedTrackToQueue(): Promise<void> {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUri) {
      this.toast.error('This track cannot be added to queue.');
      return;
    }

    try {
      await this.spotifyPlayer.addTrackToQueue(track.spotifyUri);
      this.toast.success('Added to queue.');
      this.closeTrackOptions();
    } catch (error) {
      console.error('Could not add track to Spotify queue:', error);
      this.toast.error('Could not add this track to queue.');
    }
  }

  openSelectedTrackOnSpotify(): void {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUrl) {
      this.toast.error('Spotify link is not available for this track.');
      return;
    }

    window.open(track.spotifyUrl, '_blank', 'noopener,noreferrer');
    this.toast.info('Opening Spotify.');
  }

  async copySelectedTrackLink(): Promise<void> {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUrl) {
      this.toast.error('Spotify link is not available for this track.');
      return;
    }

    try {
      await navigator.clipboard.writeText(track.spotifyUrl);
      this.toast.success('Spotify link copied.');
    } catch {
      this.toast.error('Could not copy the link.');
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
      this.likedSongs.update((tracks) => [track, ...tracks]);
    }

    if (this.currentTrack().id !== track.id) {
      this.currentTrack.set(track);
    }
  }

  private async syncCurrentTrackLikeState(track: Track): Promise<void> {
    if (!track.spotifyUri) {
      this.isLiked.set(false);
      return;
    }

    if (this.likedTrackIds().has(track.id)) {
      this.isLiked.set(true);
      return;
    }

    try {
      const isSaved = await this.spotifyApi.checkLibraryItem(track.spotifyUri);

      this.isLiked.set(isSaved);

      if (isSaved) {
        this.addTrackToLikedState(track);
      }
    } catch (error) {
      console.error('Could not check liked state:', error);
    }
  }

  private addTrackToLikedState(track: Track): void {
    this.likedTrackIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.add(track.id);
      return nextIds;
    });

    this.likedSongs.update((tracks) => {
      const filteredTracks = tracks.filter((item) => item.id !== track.id);
      return [track, ...filteredTracks];
    });
  }

  private removeTrackFromLikedState(track: Track): void {
    this.likedTrackIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(track.id);
      return nextIds;
    });

    this.likedSongs.update((tracks) => tracks.filter((item) => item.id !== track.id));
  }

  private syncLikedTrackIds(tracks: Track[]): void {
    this.likedTrackIds.set(new Set(tracks.map((track) => track.id)));
    this.isLiked.set(tracks.some((track) => track.id === this.currentTrack().id));
  }

  private shouldMirrorTrackIntoLikedSongs(track: Track): boolean {
    return Boolean(
      this.likedSongs().length &&
      !this.likedSongs().some((item) => item.id === track.id)
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
