import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.css'
})
export class ModalComponent {
  // Estado de visibilidad del modal
  @Input() isOpen: boolean = false;

  // Título que se muestra en la cabecera
  @Input() title: string = '';

  // Tamaño del modal: sm (pequeño/alertas), md (estándar), lg (formulario grande/detalles)
  @Input() size: 'sm' | 'md' | 'lg' = 'md';

  // Evento que se dispara al cerrar el modal (clic en X, Cancelar, o Backdrop)
  @Output() onClose = new EventEmitter<void>();

  // Cerrar el modal emitiendo el evento al componente padre
  close() {
    this.onClose.emit();
  }
}
