import { Injectable, computed, inject, signal } from '@angular/core';
import { Playlist, Track } from '../models/music.model';
import { SpotifyApiService } from '../services/spotify-api.service';
import { SpotifyAuthService } from '../services/spotify-auth.service';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root',
})
export class LibraryStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly spotifyAuth = inject(SpotifyAuthService);
  private readonly toast = inject(ToastService);

  readonly libraryPlaylists = signal<Playlist[]>([]);
  readonly selectedPlaylist = signal<Playlist | null>(null);
  readonly selectedPlaylistTracks = signal<Track[]>([]);

  readonly likedSongs = signal<Track[]>([]);
  readonly likedTrackIds = signal<Set<string>>(new Set());
  readonly isLikedSongsOpen = signal(false);

  readonly isLoadingLibrary = signal(false);
  readonly isLoadingPlaylistTracks = signal(false);
  readonly isLoadingLikedSongs = signal(false);

  readonly libraryError = signal<string | null>(null);
  readonly libraryTrackSearchQuery = signal('');

  readonly editablePlaylists = computed(() => this.libraryPlaylists().filter((playlist) => playlist.isAccessible !== false));

  readonly filteredLikedSongs = computed(() => {
    const query = this.libraryTrackSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.likedSongs();
    }

    return this.likedSongs().filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query));
  });

  readonly filteredSelectedPlaylistTracks = computed(() => {
    const query = this.libraryTrackSearchQuery().trim().toLowerCase();
    if (!query) {
      return this.selectedPlaylistTracks();
    }

    return this.selectedPlaylistTracks().filter((track) => `${track.title} ${track.artist} ${track.album}`.toLowerCase().includes(query));
  });

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

  async openLikedSongs(): Promise<void> {
    this.clearLibraryTrackSearch();
    this.isLikedSongsOpen.set(true);
    this.selectedPlaylist.set(null);
    this.selectedPlaylistTracks.set([]);
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
      this.likedTrackIds.set(new Set(tracks.map((track) => track.id)));

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
    this.libraryError.set(null);
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
        this.libraryError.set('No playable tracks were returned by Spotify for this playlist.');
      }
    } catch (error) {
      console.error('Could not load Spotify playlist tracks:', error);
      this.libraryError.set('Could not load this playlist.');
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

  updateLibraryTrackSearchQuery(query: string): void {
    this.libraryTrackSearchQuery.set(query);
  }

  clearLibraryTrackSearch(): void {
    this.libraryTrackSearchQuery.set('');
  }

  addTrackToLikedState(track: Track): void {
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

  removeTrackFromLikedState(track: Track): void {
    this.likedTrackIds.update((ids) => {
      const nextIds = new Set(ids);
      nextIds.delete(track.id);
      return nextIds;
    });

    this.likedSongs.update((tracks) =>
      tracks.filter((item) => item.id !== track.id)
    );
  }

  async checkTrackLikeState(track: Track): Promise<boolean> {
    if (!track.spotifyUri) {
      return false;
    }

    if (this.likedTrackIds().has(track.id)) {
      return true;
    }

    try {
      const isSaved = await this.spotifyApi.checkLibraryItem(track.spotifyUri);

      if (isSaved) {
        this.addTrackToLikedState(track);
      }

      return isSaved;
    } catch (error) {
      console.error('Could not check liked state:', error);
      return false;
    }
  }

  updatePlaylistTrackCount(playlistId: string, amount: number): void {
    this.libraryPlaylists.update((playlists) => playlists.map((playlist) => playlist.id === playlistId ? { ...playlist, totalTracks: Math.max((playlist.totalTracks ?? 0) + amount, 0) } : playlist)
    );
  }

  addTrackToOpenedPlaylist(playlistId: string, track: Track): void {
    if (this.selectedPlaylist()?.id !== playlistId) {
      return;
    }

    this.selectedPlaylistTracks.update((tracks) => {
      const alreadyExists = tracks.some((item) => item.id === track.id);
      if (alreadyExists) {
        return tracks;
      }

      return [track, ...tracks];
    });
  }

  addPlaylistToLibrary(playlist: Playlist): void {
    this.libraryPlaylists.update((playlists) => {
      const filteredPlaylists = playlists.filter((item) => item.id !== playlist.id);
      return [playlist, ...filteredPlaylists];
    });
  }
}