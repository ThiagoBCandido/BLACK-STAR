import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { LibraryStateService } from "../../core/state/library-state.service";
import { TrackOptionsStateService } from "../../core/state/track-options-state.service";

@Component({
  selector: 'app-add-to-playlist-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './add-to-playlist-sheet.component.html',
  styleUrl: './add-to-playlist-sheet.component.css'
})
export class AddToPlaylistSheetComponent {
  readonly library = inject(LibraryStateService);
  readonly options = inject(TrackOptionsStateService);
}