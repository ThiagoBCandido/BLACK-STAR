import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { TrackListItemComponent } from "../track-list-item/track-list-item.component";
import { TrackListSkeletonComponent } from "../track-list-skeleton/track-list-skeleton.component";
import { PlayerStateService } from "../../core/services/player-state.service";

@Component({
  selector: 'app-recently-played-screen',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent, TrackListSkeletonComponent],
  templateUrl: './recently-played-screen.component.html',
  styleUrl: './recently-played-screen.component.css'
})
export class RecentlyPlayedScreenComponent {
  readonly player = inject(PlayerStateService);
}