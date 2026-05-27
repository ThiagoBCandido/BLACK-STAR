import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { TrackListItemComponent } from "../track-list-item/track-list-item.component";
import { TrackListSkeletonComponent } from "../track-list-skeleton/track-list-skeleton.component";
import { PlayerStateService } from "../../core/services/player-state.service";
import { ScreenHeaderComponent } from "../screen-header/screen-header.component";

@Component({
  selector: 'app-top-tracks-screen',
  standalone: true,
  imports: [CommonModule, TrackListItemComponent, TrackListSkeletonComponent, ScreenHeaderComponent],
  templateUrl: './top-tracks-screen.component.html',
  styleUrl: './top-tracks-screen.component.css'
})
export class TopTracksScreenComponent {
  readonly player = inject(PlayerStateService);
}