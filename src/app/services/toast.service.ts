import { Injectable, signal } from '@angular/core';

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'danger' | 'warning' | 'info';
}

@Injectable({
  providedIn: 'root'
})
export class ToastService {
  // Lista reactiva de notificaciones activas usando Signals
  toasts = signal<Toast[]>([]);
  private nextId = 0;

  // Mostrar una notificación toast en pantalla
  show(message: string, type: 'success' | 'danger' | 'warning' | 'info' = 'info', duration: number = 4000) {
    const id = this.nextId++;
    
    // Agregar la nueva notificación a la lista
    this.toasts.update(current => [...current, { id, message, type }]);

    // Configurar temporizador para removerla automáticamente
    setTimeout(() => {
      this.remove(id);
    }, duration);
  }

  // Métodos abreviados por tipo de alerta
  showSuccess(message: string, duration?: number) {
    this.show(message, 'success', duration);
  }

  showError(message: string, duration?: number) {
    this.show(message, 'danger', duration); // 'danger' mapea directamente con colores y clases Bootstrap
  }

  showWarning(message: string, duration?: number) {
    this.show(message, 'warning', duration);
  }

  showInfo(message: string, duration?: number) {
    this.show(message, 'info', duration);
  }

  // Remover notificación de la lista por su ID
  remove(id: number) {
    this.toasts.update(current => current.filter(t => t.id !== id));
  }
}
