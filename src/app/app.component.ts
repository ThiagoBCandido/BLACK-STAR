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
import { DemoModeService } from './core/services/demo-mode.service';
import { CreatePlaylistStateService } from './core/state/create-playlist-state.service';
import { NavigationStateService } from './core/state/navigation-state.service';
import { TrackOptionsStateService } from './core/state/track-options-state.service';
import { BrowseStateService } from './core/state/browse-state.service';
import { LibraryStateService } from './core/state/library-state.service';

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
  readonly spotifyAuth = inject(SpotifyAuthService);
  readonly demo = inject(DemoModeService);

  private readonly spotifyPlayer = inject(SpotifyPlayerService);
  private readonly browse = inject(BrowseStateService);
  private readonly library = inject(LibraryStateService);

  async ngOnInit(): Promise<void> {
    await this.spotifyAuth.initialize();

    if (this.demo.isDemoMode()) {
      await this.loadDemoData();
      return;
    }

    if (this.spotifyAuth.isAuthenticated()) {
      const recentlyPlayedTracks = await this.browse.loadRecentlyPlayedTracks();

      this.player.setInitialTrack(recentlyPlayedTracks[0]);

      await this.browse.loadTopTracks();
      await this.library.loadLibraryPlaylists();
      await this.spotifyPlayer.initialize();
    }
  }

  async startDemoMode(): Promise<void> {
    this.demo.enableDemoMode();
    this.navigation.goHome();
    await this.loadDemoData();
  }

  exitDemoMode(): void {
    this.demo.disableDemoMode();
    window.location.reload();
  }

  private async loadDemoData(): Promise<void> {
    const recentlyPlayedTracks = await this.browse.loadRecentlyPlayedTracks();

    this.player.setInitialTrack(recentlyPlayedTracks[0]);

    await this.browse.loadTopTracks();
    await this.library.loadLibraryPlaylists();
  }
}
