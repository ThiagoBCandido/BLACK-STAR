import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { PlayerStateService } from '../../core/services/player-state.service';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';

@Component({
  selector: 'app-recently-played-screen',
  standalone: true,
  imports: [
    CommonModule,
    ScreenHeaderComponent,
    TrackListItemComponent,
    TrackListSkeletonComponent,
  ],
  templateUrl: './recently-played-screen.component.html',
  styleUrl: './recently-played-screen.component.css',
})
export class RecentlyPlayedScreenComponent {
  readonly player = inject(PlayerStateService);
  readonly browse = inject(BrowseStateService);
  readonly navigation = inject(NavigationStateService);

  playRecentlyPlayed(): void {
    const tracks = this.browse.recentlyPlayedTracks();

    if (!tracks.length) {
      return;
    }

    void this.player.playQueue(tracks, 'Recently Played');
  }
}
