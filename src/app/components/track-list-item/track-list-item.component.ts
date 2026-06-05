import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';
import { Track } from '../../core/models/music.model';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackOptionsStateService } from '../../core/state/track-options-state.service';

type TrackListItemSize = 'compact' | 'regular';
type TrackListItemVariant = 'default' | 'queue';

@Component({
  selector: 'app-track-list-item',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-list-item.component.html',
  styleUrl: './track-list-item.component.css',
})
export class TrackListItemComponent {
  @Input({ required: true }) track!: Track;
  @Input() subtitle?: string;
  @Input() size: TrackListItemSize = 'regular';
  @Input() variant: TrackListItemVariant = 'default';
  @Input() showAlbum = false;
  @Input() showOptions = true;
  @Input() queueContext: Track[] = [];
  @Input() queueName = 'Queue';

  readonly player = inject(PlayerStateService);
  readonly options = inject(TrackOptionsStateService);

  get isCurrentTrack(): boolean {
    return this.track.id === this.player.currentTrack().id;
  }

  get isCurrentTrackPlaying(): boolean {
    return this.isCurrentTrack && this.player.isPlaying();
  }

  get isQueueVariant(): boolean {
    return this.variant === 'queue';
  }

  get resolvedSubtitle(): string {
    if (this.subtitle) {
      return this.subtitle;
    }

    if (this.showAlbum) {
      return `${this.track.artist} · ${this.track.album}`;
    }

    return this.track.artist;
  }

  selectTrack(): void {
    if (this.queueContext.length) {
      void this.player.selectTrackFromQueue(
        this.track,
        this.queueContext,
        this.queueName
      );

      return;
    }

    void this.player.selectTrack(this.track);
  }

  togglePlayback(event: Event): void {
    event.stopPropagation();

    if (this.isCurrentTrack) {
      void this.player.togglePlay(event);
      return;
    }

    if (this.queueContext.length) {
      void this.player.selectTrackFromQueue(
        this.track,
        this.queueContext,
        this.queueName
      );

      return;
    }

    void this.player.selectTrack(this.track);
  }

  openOptions(event: Event): void {
    this.options.openTrackOptions(this.track, event);
  }

  handleKeyboardSelect(event: Event): void {
    event.preventDefault();
    this.selectTrack();
  }
}
