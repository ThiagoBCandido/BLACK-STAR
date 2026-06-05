import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { SearchStateService } from '../../core/state/search-state.service';

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

  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;

    this.search.updateSearchQuery(query);

    this.clearSearchDebounce();

    this.searchDebounceId = setTimeout(() => {
      void this.search.searchTracks();
    }, 450);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    this.clearSearchDebounce();

    await this.search.searchTracks();
  }

  retrySearch(): void {
    void this.search.searchTracks();
  }

  clearSearch(): void {
    this.clearSearchDebounce();

    this.search.clearSearch();
  }

  ngOnDestroy(): void {
    this.clearSearchDebounce();
  }

  private clearSearchDebounce(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }
  }
}
