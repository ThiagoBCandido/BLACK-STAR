import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { TrackOptionsStateService } from '../../core/state/track-options-state.service';

type PlayerPanel = 'queue' | 'details';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent],
  templateUrl: './full-player.component.html',
  styleUrls: ['./full-player.component.css', './full-player-turntable.component.css'],
})
export class FullPlayerComponent {
  readonly player = inject(PlayerStateService);
  readonly browse = inject(BrowseStateService);
  readonly options = inject(TrackOptionsStateService);

  readonly activePanel = signal<PlayerPanel>('queue');

  readonly currentQueue = computed(() => {
    return this.player.queueTracks().length ? this.player.queueTracks() : this.browse.recentlyPlayedTracks();
  });

  readonly queueTitle = computed(() => {
    return this.player.queueName() || 'Recently Played';
  });

  readonly currentQueueTrack = computed(() => {
    const currentTrack = this.player.currentTrack();
    return this.currentQueue().find((track) => track.id === currentTrack.id) ?? currentTrack;
  });

  readonly upNextTracks = computed(() => {
    const queue = this.currentQueue();
    const currentTrack = this.player.currentTrack();
    const currentIndex = queue.findIndex((track) => track.id === currentTrack.id);

    if (currentIndex < 0) {
      return queue.filter((track) => track.id !== currentTrack.id).slice(0, 10);
    }

    return queue.slice(currentIndex + 1, currentIndex + 11);
  });

  setPanel(panel: PlayerPanel): void {
    this.activePanel.set(panel);
  }

  openSpotifyTrack(): void {
    const url = this.player.currentTrack().spotifyUrl;
    if (!url) {
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  }
}
