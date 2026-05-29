import { Injectable, inject, signal } from "@angular/core";
import { LibraryStateService } from "./library-state.service";
import { ToastService } from "../services/toast.service";
import { BrowserPlatformLocation } from "@angular/common";

export type AppScreen = | 'home' | 'search' | 'library' | 'profile' | 'recentlyPlayed' | 'topTracks';

@Injectable({providedIn: 'root'})
export class NavigationStateService {
  private readonly libraryState = inject(LibraryStateService);
  private readonly toast = inject(ToastService);

  readonly activeScreen = signal<AppScreen>('home');

  setActiveScreen(screen: AppScreen): void {
    this.activeScreen.set(screen);
    switch(screen){
      case 'library':
        if(!this.libraryState.libraryPlaylists().length){
          void this.libraryState.loadLibraryPlaylists();
        }
        break;
        default: break;
    }
  }
  goHome(): void{
    this.setActiveScreen('home');
  }
  goSearch(): void{
    this.setActiveScreen('search');
  }
  goLibrary(): void{
    this.setActiveScreen('library');
  }
  goProfile(): void{
    this.setActiveScreen('profile')
  }
  goRecentlyPlayed(): void{
    this.setActiveScreen('recentlyPlayed');
  }
  goTopTracks(): void{
    this.setActiveScreen('topTracks')
  }
}