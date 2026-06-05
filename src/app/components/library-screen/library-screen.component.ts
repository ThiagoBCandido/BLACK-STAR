import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { CreatePlaylistStateService } from '../../core/state/create-playlist-state.service';
import { LibraryStateService } from '../../core/state/library-state.service';
import { PlayerStateService } from '../../core/services/player-state.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';
import { BrowseStateService } from '../../core/state/browse-state.service';

@Component({
  selector: 'app-library-screen',
  standalone: true,
  imports: [
    CommonModule,
    ScreenHeaderComponent,
    TrackListItemComponent,
    TrackListSkeletonComponent,
  ],
  templateUrl: './library-screen.component.html',
  styleUrl: './library-screen.component.css',
})
export class LibraryScreenComponent {
  readonly library = inject(LibraryStateService);
  readonly create = inject(CreatePlaylistStateService);
  readonly player = inject(PlayerStateService);
  readonly navigation = inject(NavigationStateService);
  readonly browse = inject(BrowseStateService);

  onLibrarySearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.library.updateLibraryTrackSearchQuery(input.value);
  }

  closeCurrentView(): void {
    if (this.library.selectedPlaylist()) {
      this.library.closeSelectedPlaylist();
      return;
    }

    if (this.library.isLikedSongsOpen()) {
      this.library.closeLikedSongs();
    }
  }

  playSelectedPlaylist(): void {
    const tracks = this.library.filteredSelectedPlaylistTracks().length
      ? this.library.filteredSelectedPlaylistTracks()
      : this.library.selectedPlaylistTracks();

    const playlistName = this.library.selectedPlaylist()?.title ?? 'Playlist';

    void this.player.playQueue(tracks, playlistName);
  }
}