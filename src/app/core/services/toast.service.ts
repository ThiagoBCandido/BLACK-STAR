import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  readonly toasts = signal<ToastMessage[]>([]);

  private nextId = 1;

  success(message: string): void {
    this.show(message, 'success');
  }

  error(message: string): void {
    this.show(message, 'error');
  }

  info(message: string): void {
    this.show(message, 'info');
  }

  warning(message: string): void {
    this.show(message, 'warning');
  }

  show(message: string, type: ToastType = 'info'): void {
    const toast: ToastMessage = {
      id: this.nextId++, type, message
    };

    this.toasts.update((items) => [...items, toast]);

    setTimeout(() => {
      this.remove(toast.id);
    }, 3200);
  }

  remove(id: number): void {
    this.toasts.update((items) => items.filter((toast) => toast.id !== id));
  }

  clear(): void {
    this.toasts.set([]);
  }
}