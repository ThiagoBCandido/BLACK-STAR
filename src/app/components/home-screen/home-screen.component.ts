import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';

@Component({
  selector: 'app-home-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './home-screen.component.html',
  styleUrl: './home-screen.component.css',
})
export class HomeScreenComponent {
  readonly player = inject(PlayerStateService);
  readonly spotifyAuth = inject(SpotifyAuthService);

  get featuredRelease() {
    const track = this.player.tracks()[0] ?? this.player.currentTrack();

    return {
      title: track.title,
      artist: track.artist,
      description: 'A dark pop journey through the afterhours.',
      cover: track.cover,
      track,
    };
  }
}
