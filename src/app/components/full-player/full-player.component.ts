import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';

@Component({
  selector: 'app-full-player',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './full-player.component.html',
  styleUrl: './full-player.component.css',
})
export class FullPlayerComponent {
  readonly player = inject(PlayerStateService);
}