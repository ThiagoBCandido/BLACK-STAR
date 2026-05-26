import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { SpotifyPlayerService } from '../../core/services/spotify-player.service';

@Component({
  selector: 'app-profile-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './profile-screen.component.html',
  styleUrl: './profile-screen.component.scss',
})
export class ProfileScreenComponent {
  readonly player = inject(PlayerStateService);
  readonly spotifyAuth = inject(SpotifyAuthService);
  readonly spotifyPlayer = inject(SpotifyPlayerService);

  async connectSpotify(): Promise<void> {
    await this.spotifyAuth.login();
  }
  
  disconnectSpotify(): void {
    this.player.stopPlaybackSync();
    this.spotifyPlayer.disconnect();
    this.spotifyAuth.logout();
  }
}
