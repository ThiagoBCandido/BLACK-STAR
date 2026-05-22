import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FullPlayerComponent } from './components/full-player/full-player.component';
import { HomeScreenComponent } from './components/home-screen/home-screen.component';
import { MiniPlayerComponent } from './components/mini-player/mini-player.component';
import { PlayerStateService } from './core/services/player-state.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HomeScreenComponent, MiniPlayerComponent, FullPlayerComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly player = inject(PlayerStateService);
}