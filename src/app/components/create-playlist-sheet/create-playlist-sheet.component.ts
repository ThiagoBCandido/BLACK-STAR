import { CommonModule } from "@angular/common";
import { Component, inject } from "@angular/core";
import { PlayerStateService } from "../../core/services/player-state.service";

@Component({
  selector: 'app-create-playlist-sheet',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './create-playlist-sheet.component.html',
  styleUrl: './create-playlist-sheet.component.css'
})
export class CreatePlaylistSheetComponent {
  readonly player = inject(PlayerStateService);
  onNameInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.player.updateCreatePlaylistName(input.value);
  }
  onDescriptionInput(event: Event): void {
    const textarea = event.target as HTMLTextAreaElement;
    this.player.updateCreatePlaylistDescription(textarea.value);
  }
  
  async onSubmit(event: Event): Promise<void> {
    event.preventDefault();
    await this.player.createSpotifyPlaylist();
  }
}