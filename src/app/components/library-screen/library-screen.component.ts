import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { PlayerStateService } from '../../core/services/player-state.service';
import { CreatePlaylistStateService } from '../../core/state/create-playlist-state.service';

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
  readonly player = inject(PlayerStateService);
  readonly create = inject(CreatePlaylistStateService);

  onLibrarySearchInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.player.updateLibraryTrackSearchQuery(input.value);
  }
}
