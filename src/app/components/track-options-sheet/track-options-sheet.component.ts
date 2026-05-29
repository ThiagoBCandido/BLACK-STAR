import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackOptionsStateService } from '../../core/state/track-options-state.service';

@Component({
  selector: 'app-track-options-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-options-sheet.component.html',
  styleUrl: './track-options-sheet.component.css',
})
export class TrackOptionsSheetComponent {
  readonly player = inject(PlayerStateService);
  readonly options = inject(TrackOptionsStateService);

  async playNow(): Promise<void> {
    const track = this.options.selectedOptionsTrack();

    if (!track) {
      return;
    }

    await this.player.selectTrack(track);
    this.options.closeTrackOptions();
  }
}