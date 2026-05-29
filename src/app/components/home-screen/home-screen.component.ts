import { CommonModule } from '@angular/common';
import { Component, computed, inject } from '@angular/core';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';

@Component({
  selector: 'app-home-screen',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent, TrackListSkeletonComponent],
  templateUrl: './home-screen.component.html',
  styleUrl: './home-screen.component.css',
})
export class HomeScreenComponent {
  readonly player = inject(PlayerStateService);
  readonly spotifyAuth = inject(SpotifyAuthService);
  readonly navigation = inject(NavigationStateService);
  readonly browse = inject(BrowseStateService);

  readonly featuredTrack = computed(() => {
    const currentTrack = this.player.currentTrack();
    if (currentTrack?.spotifyUri && !currentTrack.id.startsWith('mock')) {
      return currentTrack;
    }
    return this.browse.recentlyPlayedTracks()[0] ?? currentTrack;
  });

  readonly featuredDescription = computed(() => {
    const track = this.featuredTrack();
    if (!track) {
      return 'A dark music experience through BLACK STAR.';
    }

    return `${track.album} · ${track.duration}`;
  });
}