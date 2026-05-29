import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { CreatePlaylistStateService } from '../../core/state/create-playlist-state.service';
import { LibraryStateService } from '../../core/state/library-state.service';

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

  onLibrarySearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.library.updateLibraryTrackSearchQuery(input.value);
  }
}