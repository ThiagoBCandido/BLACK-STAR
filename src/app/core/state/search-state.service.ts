import { Injectable, computed, inject, signal } from '@angular/core';
import { Track } from '../models/music.model';
import { SpotifyApiService } from '../services/spotify-api.service';
import { ToastService } from '../services/toast.service';

@Injectable({
  providedIn: 'root',
})
export class SearchStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly toast = inject(ToastService);

  readonly searchQuery = signal('');
  readonly lastSearchedQuery = signal('');
  readonly searchResults = signal<Track[]>([]);
  readonly isSearching = signal(false);
  readonly hasSearched = signal(false);
  readonly errorMessage = signal<string | null>(null);

  readonly trimmedQuery = computed(() => this.searchQuery().trim());

  readonly showMinimumCharsHint = computed(() => {
    const query = this.trimmedQuery();

    return query.length > 0 && query.length < 2;
  });

  readonly shouldShowNoResults = computed(() => {
    return ( this.hasSearched() && !this.isSearching() && !this.errorMessage() && this.lastSearchedQuery().length >= 2 && this.searchResults().length === 0);
  });

  private searchRequestId = 0;

  updateSearchQuery(query: string): void {
    this.searchQuery.set(query);
    this.errorMessage.set(null);

    if (!query.trim()) {
      this.resetSearchState();
    }
  }

  async searchTracks(): Promise<void> {
    const query = this.trimmedQuery();
    const requestId = ++this.searchRequestId;

    if (query.length < 2) {
      this.resetSearchState();
      return;
    }

    this.isSearching.set(true);
    this.hasSearched.set(true);
    this.lastSearchedQuery.set(query);
    this.errorMessage.set(null);

    try {
      const results = await this.spotifyApi.searchTracks(query);

      if (requestId !== this.searchRequestId) {
        return;
      }

      this.searchResults.set(results);
    } catch (error) {
      console.error('Could not search Spotify tracks:', error);

      if (requestId !== this.searchRequestId) {
        return;
      }

      this.searchResults.set([]);
      this.errorMessage.set(
        'Reconnect Spotify and try again. If the account is not authorized in the Spotify Dashboard, search will not work.'
      );
      this.toast.error('Could not search Spotify tracks.');
    } finally {
      if (requestId === this.searchRequestId) {
        this.isSearching.set(false);
      }
    }
  }

  clearSearch(): void {
    this.searchRequestId++;
    this.searchQuery.set('');
    this.resetSearchState();
  }

  private resetSearchState(): void {
    this.lastSearchedQuery.set('');
    this.searchResults.set([]);
    this.hasSearched.set(false);
    this.isSearching.set(false);
    this.errorMessage.set(null);
  }
}