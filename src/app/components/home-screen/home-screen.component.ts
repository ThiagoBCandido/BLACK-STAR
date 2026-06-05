import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { Playlist, Track } from '../../core/models/music.model';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { LibraryStateService } from '../../core/state/library-state.service';
import { NavigationStateService } from '../../core/state/navigation-state.service';
import { PlayerStateService } from '../../core/services/player-state.service';
import { SpotifyAuthService } from '../../core/services/spotify-auth.service';
import { DemoModeService } from '../../core/services/demo-mode.service';

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
  readonly library = inject(LibraryStateService);
  readonly demo = inject(DemoModeService);

  readonly hasRequestedPlaylists = signal(false);
  readonly selectedFeaturedIndex = signal(0);

  readonly isMusicSourceReady = computed(() => {
    return this.spotifyAuth.isAuthenticated() || this.demo.isDemoMode();
  });

  readonly profileImage = computed(() => {
    if (this.demo.isDemoMode()) {
      return null;
    }

    return this.spotifyAuth.profile()?.images?.[0]?.url ?? null;
  });

  readonly profileName = computed(() => {
    if (this.demo.isDemoMode()) {
      return 'BLACK STAR Guest';
    }

    return this.spotifyAuth.profile()?.display_name || 'Profile';
  });

  readonly featuredTracks = computed(() => {
    const tracks = [
      ...this.browse.topTracks(),
      ...this.browse.recentlyPlayedTracks(),
      this.player.currentTrack(),
    ];

    return this.removeDuplicateTracks(tracks).filter((track) => Boolean(track.cover)).slice(0, 4);
  });

  readonly featuredTrack = computed(() => {
    const tracks = this.featuredTracks();
    const index = this.selectedFeaturedIndex();

    return tracks[index] ?? tracks[0] ?? this.player.currentTrack();
  });

  readonly featuredDescription = computed(() => {
    const track = this.featuredTrack();

    return `${track.album} - ${track.duration}`;
  });

  readonly homePlaylists = computed(() => {
    return this.library.libraryPlaylists().slice(0, 4);
  });

  readonly recentTracks = computed(() => {
    return this.browse.recentlyPlayedTracks().slice(0, 6);
  });

  constructor() {
    effect(
      () => {
        const isReady = this.isMusicSourceReady();
        const hasPlaylists = this.library.libraryPlaylists().length > 0;
        const isLoading = this.library.isLoadingLibrary();
        const alreadyRequested = this.hasRequestedPlaylists();

        if (!isReady || hasPlaylists || isLoading || alreadyRequested) {
          return;
        }

        this.loadHomePlaylists();
      },
      { allowSignalWrites: true }
    );

    effect(
      () => {
        const totalFeaturedTracks = this.featuredTracks().length;
        const currentIndex = this.selectedFeaturedIndex();

        if (totalFeaturedTracks > 0 && currentIndex > totalFeaturedTracks - 1) {
          this.selectedFeaturedIndex.set(0);
        }
      },
      { allowSignalWrites: true }
    );
  }

  loadHomePlaylists(): void {
    if (!this.isMusicSourceReady() || this.library.isLoadingLibrary()) {
      return;
    }

    this.hasRequestedPlaylists.set(true);
    void this.library.loadLibraryPlaylists();
  }

  selectFeaturedTrack(index: number): void {
    this.selectedFeaturedIndex.set(index);
  }

  handleConnectionAction(): void {
    if (this.demo.isDemoMode()) {
      this.demo.disableDemoMode();
      window.location.reload();
      return;
    }

    if (this.spotifyAuth.isAuthenticated()) {
      this.spotifyAuth.logout();
      return;
    }

    void this.spotifyAuth.login();
  }

  connectionLabel(): string {
    if (this.demo.isDemoMode()) {
      return 'Demo';
    }

    return this.spotifyAuth.isAuthenticated() ? 'Connected' : 'Spotify';
  }

  openPlaylist(playlist: Playlist): void {
    if (playlist.isAccessible === false) {
      return;
    }

    this.navigation.goLibrary();
    void this.library.selectPlaylist(playlist);
  }

  private removeDuplicateTracks(tracks: Track[]): Track[] {
    const seenTrackIds = new Set<string>();

    return tracks.filter((track) => {
      if (seenTrackIds.has(track.id)) {
        return false;
      }

      seenTrackIds.add(track.id);
      return true;
    });
  }
}
