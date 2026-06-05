import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { SpotifyPlayerService } from '../../core/services/spotify-player.service';
import { DemoModeService } from '../../core/services/demo-mode.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';
import { ScreenHeaderComponent } from '../screen-header/screen-header.component';

@Component({
  selector: 'app-profile-screen',
  standalone: true,
  imports: [CommonModule, ScreenHeaderComponent],
  templateUrl: './profile-screen.component.html',
  styleUrl: './profile-screen.component.css',
})
export class ProfileScreenComponent {
  readonly player = inject(PlayerStateService);
  readonly spotifyAuth = inject(SpotifyAuthService);
  readonly spotifyPlayer = inject(SpotifyPlayerService);
  readonly demo = inject(DemoModeService);
  readonly navigation = inject(NavigationStateService);

  async connectSpotify(): Promise<void> {
    this.demo.disableDemoMode();
    await this.spotifyAuth.login();
  }

  disconnectSpotify(): void {
    this.player.stopPlaybackSync();
    this.spotifyPlayer.disconnect();
    this.spotifyAuth.logout();
  }

  exitDemoMode(): void {
    this.demo.disableDemoMode();
    this.navigation.goHome();
    window.location.reload();
  }
}
