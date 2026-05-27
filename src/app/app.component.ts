import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { FullPlayerComponent } from './components/full-player/full-player.component';
import { HomeScreenComponent } from './components/home-screen/home-screen.component';
import { LibraryScreenComponent } from './components/library-screen/library-screen.component';
import { MiniPlayerComponent } from './components/mini-player/mini-player.component';
import { ProfileScreenComponent } from './components/profile-screen/profile-screen.component';
import { RecentlyPlayedScreenComponent } from './components/recently-played-screen/recently-played-screen.component';
import { SearchScreenComponent } from './components/search-screen/search-screen.component';
import { TopTracksScreenComponent } from './components/top-tracks-screen/top-tracks-screen.component';
import { ToastComponent } from './components/toast/toast.component';
import { TrackOptionsSheetComponent } from './components/track-options-sheet/track-options-sheet.component';
import { PlayerStateService } from './core/services/player-state.service';
import { SpotifyAuthService } from './core/services/spotify-auth.service';
import { SpotifyPlayerService } from './core/services/spotify-player.service';


@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    CommonModule,
    HomeScreenComponent,
    SearchScreenComponent,
    LibraryScreenComponent,
    ProfileScreenComponent,
    RecentlyPlayedScreenComponent,
    TopTracksScreenComponent,
    MiniPlayerComponent,
    FullPlayerComponent,
    BottomNavComponent,
    TrackOptionsSheetComponent,
    ToastComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly player = inject(PlayerStateService);

  private readonly spotifyAuth = inject(SpotifyAuthService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);

  async ngOnInit(): Promise<void> {
    await this.spotifyAuth.initialize();

    if (this.spotifyAuth.isAuthenticated()) {
      await this.player.loadSpotifyTracks();
      await this.player.loadTopTracks();
      await this.spotifyPlayer.initialize();
      this.player.startPlaybackSync();
    }
  }
}
