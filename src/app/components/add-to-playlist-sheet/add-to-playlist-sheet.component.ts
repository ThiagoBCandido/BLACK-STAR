import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { PlayerStateService } from "../../core/services/player-state.service";

@Component({
  selector: 'app-add-to-playlist-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-to-playlist-sheet.component.html',
  styleUrl: './add-to-playlist-sheet.component.css'
})
export class AddToPlaylistSheetComponent {
  readonly player = inject(PlayerStateService);
}