import { CommonModule } from '@angular/common';
import { Component, OnDestroy, inject } from '@angular/core';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { PlayerStateService } from '../../core/services/player-state.service';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';

@Component({
  selector: 'app-search-screen',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent, TrackListSkeletonComponent, ScreenHeaderComponent],
  templateUrl: './search-screen.component.html',
  styleUrl: './search-screen.component.css',
})
export class SearchScreenComponent implements OnDestroy {
  readonly player = inject(PlayerStateService);

  private searchDebounceId: ReturnType<typeof setTimeout> | null = null;

  onSearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value;

    this.player.updateSearchQuery(query);

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }

    this.searchDebounceId = setTimeout(() => {
      this.player.searchTracks();
    }, 450);
  }

  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    await this.player.searchTracks();
  }

  clearSearch(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
      this.searchDebounceId = null;
    }

    this.player.clearSearch();
  }

  ngOnDestroy(): void {
    if (this.searchDebounceId) {
      clearTimeout(this.searchDebounceId);
    }
  }
}
