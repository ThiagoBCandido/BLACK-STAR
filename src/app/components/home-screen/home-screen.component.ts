import { CommonModule } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';
import { Playlist } from '../../core/models/music.model';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { LibraryStateService } from '../../core/state/library-state.service';
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
  readonly library = inject(LibraryStateService);

  readonly hasRequestedPlaylists = signal(false);

  readonly profileImage = computed(() => {
    return this.spotifyAuth.profile()?.images?.[0]?.url ?? null;
  });

  readonly profileName = computed(() => {
    return this.spotifyAuth.profile()?.display_name || 'Profile';
  });

  readonly featuredTrack = computed(() => {
    const currentTrack = this.player.currentTrack();

    if (currentTrack?.spotifyUri && !currentTrack.id.startsWith('mock')) {
      return currentTrack;
    }

    return this.browse.recentlyPlayedTracks()[0] ?? this.browse.topTracks()[0] ?? currentTrack;
  });

  readonly featuredDescription = computed(() => {
    const track = this.featuredTrack();

    return `${track.album} · ${track.duration}`;
  });

  readonly homePlaylists = computed(() => {
    return this.library.libraryPlaylists().slice(0, 4);
  });

  constructor() {
    effect(() => {
        const isAuthenticated = this.spotifyAuth.isAuthenticated();
        const hasPlaylists = this.library.libraryPlaylists().length > 0;
        const isLoading = this.library.isLoadingLibrary();
        const alreadyRequested = this.hasRequestedPlaylists();

        if (!isAuthenticated || hasPlaylists || isLoading || alreadyRequested) {
          return;
        }

        this.loadHomePlaylists();
      },{ allowSignalWrites: true }
    );
  }

  loadHomePlaylists(): void {
    if (!this.spotifyAuth.isAuthenticated() || this.library.isLoadingLibrary()) {
      return;
    }

    this.hasRequestedPlaylists.set(true);
    void this.library.loadLibraryPlaylists();
  }

  openPlaylist(playlist: Playlist): void {
    if (playlist.isAccessible === false) {
      return;
    }

    this.navigation.goLibrary();
    void this.library.selectPlaylist(playlist);
  }
}
