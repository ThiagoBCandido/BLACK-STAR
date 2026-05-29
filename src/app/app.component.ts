import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { AddToPlaylistSheetComponent } from './components/add-to-playlist-sheet/add-to-playlist-sheet.component';
import { BottomNavComponent } from './components/bottom-nav/bottom-nav.component';
import { CreatePlaylistSheetComponent } from './components/create-playlist-sheet/create-playlist-sheet.component';
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
import { CreatePlaylistStateService } from './core/state/create-playlist-state.service';
import { NavigationStateService } from './core/state/navigation-state.service';
import { TrackOptionsStateService } from './core/state/track-options-state.service';
import { BrowseStateService } from './core/state/browse-state.service';

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
    CreatePlaylistSheetComponent,
    AddToPlaylistSheetComponent,
    ToastComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  readonly player = inject(PlayerStateService);
  readonly trackOptions = inject(TrackOptionsStateService);
  readonly create = inject(CreatePlaylistStateService);
  readonly navigation = inject(NavigationStateService);

  private readonly spotifyAuth = inject(SpotifyAuthService);
  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly browse = inject(BrowseStateService);

  async ngOnInit(): Promise<void> {
    await this.spotifyAuth.initialize();

    if (this.spotifyAuth.isAuthenticated()) {
      const recentlyPlayedTracks = await this.browse.loadRecentlyPlayedTracks();

      this.player.setInitialTrack(recentlyPlayedTracks[0]);

      await this.browse.loadTopTracks();
      await this.spotifyPlayer.initialize();

      this.player.startPlaybackSync();
    }
  }
}
