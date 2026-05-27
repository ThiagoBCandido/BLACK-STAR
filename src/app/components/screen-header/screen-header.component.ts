import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-screen-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './screen-header.component.html',
  styleUrl: './screen-header.component.css',
})
export class ScreenHeaderComponent {
  @Input() title = '';
  @Input() eyebrow = 'Spotify';
  @Input() heading = '';
  @Input() description = '';
  @Input() showBackButton = false;
  @Input() showLogo = true;
  @Input() actionLabel = '';
  @Input() actionIcon = '';
  @Input() actionTitle = '';
  @Output() back = new EventEmitter<void>();
  @Output() action = new EventEmitter<void>();
}