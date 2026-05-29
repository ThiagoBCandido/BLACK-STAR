import { computed, Injectable, inject, signal } from '@angular/core';
import { Track } from '../models/music.model';
import { SpotifyApiService } from '../services/spotify-api.service';
import { SpotifyPlayerService } from '../services/spotify-player.service';
import { ToastService } from '../services/toast.service';
import { LibraryStateService } from './library-state.service';

@Injectable({
  providedIn: 'root',
})
export class TrackOptionsStateService {
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly toast = inject(ToastService);
  private readonly libraryState = inject(LibraryStateService);

  readonly selectedOptionsTrack = signal<Track | null>(null);
  readonly trackOptionsMessage = signal<string | null>(null);

  readonly isAddToPlaylistOpen = signal(false);
  readonly isAddingTrackToPlaylist = signal(false);

  readonly isTrackOptionsOpen = computed(() => Boolean(this.selectedOptionsTrack()));

  openTrackOptions(track: Track, event?: Event): void {
    event?.stopPropagation();
    this.trackOptionsMessage.set(null);
    this.selectedOptionsTrack.set(track);
  }

  closeTrackOptions(): void {
    this.selectedOptionsTrack.set(null);
    this.trackOptionsMessage.set(null);
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

  openAddToPlaylist(): void {
    const track = this.selectedOptionsTrack();

    if (!track?.spotifyUri) {
      this.toast.error('This track cannot be added to a playlist.');
      return;
    }

    this.isAddToPlaylistOpen.set(true);

    if (!this.libraryState.libraryPlaylists().length) {
      void this.libraryState.loadLibraryPlaylists();
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
    const playlist = this.libraryState
      .libraryPlaylists()
      .find((item) => item.id === playlistId);

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

      this.libraryState.updatePlaylistTrackCount(playlist.id, 1);
      this.libraryState.addTrackToOpenedPlaylist(playlist.id, track);

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
}