import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { PlayerStateService } from '../../core/services/player-state.service';
import { TrackListItemComponent } from '../track-list-item/track-list-item.component';
import { TrackListSkeletonComponent } from '../track-list-skeleton/track-list-skeleton.component';

@Component({
  selector: 'app-library-screen',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent, TrackListSkeletonComponent],
  templateUrl: './library-screen.component.html',
  styleUrl: './library-screen.component.css',
})
export class LibraryScreenComponent {
  readonly player = inject(PlayerStateService);
}
