import { Injectable, inject, signal } from "@angular/core";
import { Track } from "../models/music.model";
import { SpotifyApiService } from "../services/spotify-api.service";
import { ToastService } from "../services/toast.service";

@Injectable({ providedIn: 'root'}) 
export class SearchStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly searchResults = signal<Track[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);

  private searchRequestId = 0;

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
        this.toast.error('Could not search Spotify tracks. Reconnect Spotify and try again.');
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
}
