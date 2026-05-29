import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { NavigationStateService } from '../../core/state/navigation-state.service';

@Component({
  selector: 'app-bottom-nav',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './bottom-nav.component.html',
  styleUrl: './bottom-nav.component.css',
})
export class BottomNavComponent {
  readonly navigation = inject(NavigationStateService);
}
