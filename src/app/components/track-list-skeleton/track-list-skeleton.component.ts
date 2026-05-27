import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";

@Component({
  selector: 'app-track-list-skeleton',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './track-list-skeleton.component.html',
  styleUrl: './track-list-skeleton.component.css'
})
export class TrackListSkeletonComponent {
  @Input() items = 6;
}