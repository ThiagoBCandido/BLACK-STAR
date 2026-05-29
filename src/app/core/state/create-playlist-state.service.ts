import { Injectable, inject, signal } from "@angular/core";
import { SpotifyApiService } from "../services/spotify-api.service";
import { ToastService } from "../services/toast.service";
import { LibraryStateService } from "./library-state.service";

@Injectable({
  providedIn: 'root'
})
export class CreatePlaylistStateService {
  private readonly spotifyApi = inject(SpotifyApiService);
  private readonly toast = inject(ToastService);
  private readonly libraryState = inject(LibraryStateService);

  readonly isCreatePlaylistOpen = signal(false);
  readonly createPlaylistName = signal('');
  readonly createPlaylistDescription = signal('');
  readonly createPlaylistIsPublic = signal(false);
  readonly isCreatingPlaylist = signal(false);

  openCreatePlaylist(): void {
    this.createPlaylistName.set('');
    this.createPlaylistDescription.set('');
    this.createPlaylistIsPublic.set(false);
    this.isCreatePlaylistOpen.set(true);
  }

  closeCreatePlaylist(): void {
    if (this.isCreatingPlaylist()) {
      return;
    }
    this.isCreatePlaylistOpen.set(false);
  }

  updateCreatePlaylistName(name: string): void {
    this.createPlaylistName.set(name);
  }

  updateCreatePlaylistDescription(description: string): void {
    this.createPlaylistDescription.set(description);
  }

  toggleCreatePlaylistVisibility(): void {
    this.createPlaylistIsPublic.update((value) => !value);
  }

  async createSpotifyPlaylist(): Promise<void> {
    const name = this.createPlaylistName().trim();
    const description = this.createPlaylistDescription().trim();
    const isPublic = this.createPlaylistIsPublic();

    if(!name) {
      this.toast.warning('Playlist name Is required');
      return;
    }

    this.isCreatingPlaylist.set(true);
    try{
      const playlist = await this.spotifyApi.createPlaylist({
        name, description,
        public: isPublic,
        collaborative: false
      });

      if(!playlist) {
        this.toast.error('Could not create playlist.');
        return;
      }

      this.libraryState.addPlaylistToLibrary(playlist);
      this.toast.success(`Playlist "${playlist.title}" created.`);
      this.isCreatePlaylistOpen.set(false);
    } catch(error) {
      console.error('Could not create spotify playlist: ', error);
    } finally{
      this.isCreatingPlaylist.set(false);
    }
  }
}
