import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';


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

  get featuredRelease() {
    const track = this.player.tracks()[0] ?? this.player.currentTrack();

    return {
      title: track.album,
      artist: track.artist,
      description: 'A dark pop journey through the afterhours.',
      cover: track.cover,
      track,
    };
  }
}
