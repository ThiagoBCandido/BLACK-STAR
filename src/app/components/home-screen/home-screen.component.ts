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
}