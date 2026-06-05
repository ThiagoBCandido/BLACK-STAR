import { CommonModule } from '@angular/common';
import { Component, OnDestroy, computed, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { SearchStateService } from '../../core/state/search-state.service';
import { DemoModeService } from '../../core/services/demo-mode.service';

@Component({
  selector: 'app-search-screen',
  standalone: true,
  imports: [
    CommonModule,
    ScreenHeaderComponent,
    TrackListItemComponent,
    TrackListSkeletonComponent,
  ],
  templateUrl: './search-screen.component.html',
  styleUrl: './search-screen.component.css',
})
export class SearchScreenComponent implements OnDestroy {
  readonly search = inject(SearchStateService);
  readonly demo = inject(DemoModeService);

  readonly headerEyebrow = computed(() => {
    return this.demo.isDemoMode() ? 'BLACK STAR' : 'Spotify';
  });

  readonly headerHeading = computed(() => {
    return this.demo.isDemoMode() ? 'Search Demo Catalog' : 'Search Music';
  });

  readonly headerDescription = computed(() => {
    return this.demo.isDemoMode()
      ? 'Find demo tracks, artists and albums available in BLACK STAR.'
      : 'Find tracks on Spotify and play them through BLACK STAR.';
  });

  readonly searchPlaceholder = computed(() => {
    return this.demo.isDemoMode()
      ? 'Search demo tracks'
      : 'Search tracks, artists or albums';
  });

  readonly initialTitle = computed(() => {
    return this.demo.isDemoMode() ? 'Search BLACK STAR' : 'Search Spotify';
  });

  readonly initialDescription = computed(() => {
    return this.demo.isDemoMode()
      ? 'Try searching for night, black, neon, static or midnight.'
      : 'Search for a track, artist or album. Results will appear here as you type.';
  });

  readonly resultEyebrow = computed(() => {
    return this.demo.isDemoMode() ? 'Demo results' : 'Results';
  });

  readonly queueName = computed(() => {
    return this.demo.isDemoMode() ? 'Demo Search Results' : 'Search Results';
  });

  readonly demoSuggestions = ['night', 'black', 'neon', 'static', 'midnight'];

  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;

    this.search.updateSearchQuery(query);

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = setTimeout(() => {
      void this.search.searchTracks();
    }, 450);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    await this.search.searchTracks();
  }

  async searchSuggestion(query: string): Promise<void> {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    this.search.updateSearchQuery(query);
    await this.search.searchTracks();
  }

  retrySearch(): void {
    void this.search.searchTracks();
  }

  clearSearch(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    this.search.clearSearch();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
  }
}
