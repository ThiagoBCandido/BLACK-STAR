import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { BrowseStateService } from '../../core/state/browse-state.service';
import { TrackOptionsStateService } from '../../core/state/track-options-state.service';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.css',
})
export class FullPlayerComponent {
  readonly player = inject(PlayerStateService);
  readonly browse = inject(BrowseStateService);
  readonly options = inject(TrackOptionsStateService);
}
