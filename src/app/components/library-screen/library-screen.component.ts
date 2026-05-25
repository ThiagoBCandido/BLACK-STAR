import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';

@Component({
  selector: 'app-library-screen',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './library-screen.component.html',
  styleUrl: './library-screen.component.css',
})
export class LibraryScreenComponent {
  readonly player = inject(PlayerStateService);
}