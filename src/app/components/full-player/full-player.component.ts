import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.css',
})
export class FullPlayerComponent {
  readonly player = inject(PlayerStateService);
}