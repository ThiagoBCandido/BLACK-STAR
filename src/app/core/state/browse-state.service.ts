import { Injectable, inject, signal } from '@angular/core';
import { TRACKS } from '../data/mock-music.data';
import { Track } from '../models/music.model';
import { DemoModeService } from '../services/demo-mode.service';
import { SpotifyApiService } from '../services/spotify-api.service';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root',
})
export class BrowseStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly toast = inject(ToastService);
  private readonly demo = inject(DemoModeService);

  readonly recentlyPlayedTracks = signal<Track[]>([]);
  readonly topTracks = signal<Track[]>([]);

  readonly isLoadingRecentlyPlayed = signal(false);
  readonly isLoadingTopTracks = signal(false);

  async loadRecentlyPlayedTracks(): Promise<Track[]> {
    this.isLoadingRecentlyPlayed.set(true);

    try {
      if (this.demo.isDemoMode()) {
        const tracks = this.removeDuplicateTracks(TRACKS);
        this.recentlyPlayedTracks.set(tracks);
        return tracks;
      }

      let tracks = await this.spotifyApi.getRecentlyPlayedTracks();

      if (!tracks.length) {
        tracks = await this.spotifyApi.getTopTracks();
      }

      const uniqueTracks = this.removeDuplicateTracks(tracks);

      this.recentlyPlayedTracks.set(uniqueTracks);

      return uniqueTracks;
    } catch (error) {
      console.error('Could not load recently played tracks:', error);
      this.toast.error('Could not load recently played tracks.');
      return [];
    } finally {
      this.isLoadingRecentlyPlayed.set(false);
    }
  }

  async loadTopTracks(): Promise<Track[]> {
    this.isLoadingTopTracks.set(true);

    try {
      if (this.demo.isDemoMode()) {
        const tracks = this.removeDuplicateTracks([...TRACKS].reverse());
        this.topTracks.set(tracks);
        return tracks;
      }

      const tracks = await this.spotifyApi.getTopTracks();
      const uniqueTracks = this.removeDuplicateTracks(tracks);

      this.topTracks.set(uniqueTracks);

      return uniqueTracks;
    } catch (error) {
      console.error('Could not load Spotify top tracks:', error);
      this.toast.error('Could not load your top tracks.');
      return [];
    } finally {
      this.isLoadingTopTracks.set(false);
    }
  }

  moveTrackToTop(track: Track): void {
    this.recentlyPlayedTracks.update((tracks) => {
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
}