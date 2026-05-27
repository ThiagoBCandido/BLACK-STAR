import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { ToastService, ToastType } from '../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  readonly toast = inject(ToastService);

  getToastClasses(type: ToastType): string {
    const baseClasses = 'border bg-black/90 text-white shadow-[0_18px_50px_rgba(0,0,0,0.75)] backdrop-blur-xl';
    const typeClasses: Record<ToastType, string> = {
      success: 'border-white/20',
      error: 'border-red-400/35',
      info: 'border-white/15',
      warning: 'border-yellow-400/35',
    };

    return `${baseClasses} ${typeClasses[type]}`;
  }

  getToastLabel(type: ToastType): string {
    const labels: Record<ToastType, string> = {
      success: 'Done',
      error: 'Error',
      info: 'Info',
      warning: 'Warning',
    };

    return labels[type];
  }
}
