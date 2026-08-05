import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Pedido } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
  selector: 'app-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './tracking.component.html',
  styleUrl: './tracking.component.css'
})
export class TrackingComponent implements OnInit {
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  pedidos: Pedido[] = [];
  loading: boolean = true;
  searchTerm: string = '';
  statusFilter: string = '';

  // Control de Modal de Detalle
  selectedPedido: Pedido | null = null;
  showDetailModal: boolean = false;

  // Control de Cancelación
  cancellingId: number | null = null;

  ngOnInit() {
    this.loadPedidos();
  }

  loadPedidos() {
    const currentUser = this.authService.currentUser();
    if (!currentUser || !currentUser.id) {
      this.loading = false;
      return;
    }

    this.loading = true;
    this.orderService.getPedidos().subscribe({
      next: (response) => {
        this.loading = false;
        if (response.success) {
          // Filtrar los pedidos del cliente autenticado y ordenar descendente
          this.pedidos = response.data
            .filter(p => p.cliente_id === currentUser.id || p.cliente?.id === currentUser.id)
            .sort((a, b) => (b.id || 0) - (a.id || 0));
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Error al cargar pedidos:', err);
        this.toastService.showError('No se pudieron cargar tus pedidos.');
      }
    });
  }

  get pedidosFiltrados(): Pedido[] {
    return this.pedidos.filter(p => {
      const matchSearch = !this.searchTerm.trim() ||
        p.id?.toString().includes(this.searchTerm) ||
        p.modalidad.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        p.estado.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchStatus = !this.statusFilter || p.estado === this.statusFilter;

      return matchSearch && matchStatus;
    });
  }

  // Obtener el índice del paso según el estado del pedido (0 a 4)
  getStepIndex(estado: string): number {
    switch (estado) {
      case 'solicitado': return 0;
      case 'confirmado': return 1;
      case 'en preparación': return 2;
      case 'listo': return 3;
      case 'entregado': return 4;
      default: return -1;
    }
  }

  // Abrir Modal de Detalle
  openDetailModal(pedido: Pedido) {
    this.selectedPedido = pedido;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedPedido = null;
  }

  // Cancelar pedido si está en estado 'solicitado'
  cancelPedido(pedidoId: number | undefined) {
    if (!pedidoId) return;

    if (!confirm('¿Estás seguro de que deseas cancelar este pedido?')) return;

    this.cancellingId = pedidoId;
    this.orderService.updatePedido(pedidoId, { estado: 'cancelado' }).subscribe({
      next: (response) => {
        this.cancellingId = null;
        if (response.success) {
          this.toastService.showSuccess('Pedido cancelado correctamente.');
          this.loadPedidos();
          if (this.selectedPedido && this.selectedPedido.id === pedidoId) {
            this.closeDetailModal();
          }
        }
      },
      error: (err) => {
        this.cancellingId = null;
        console.error('Error al cancelar pedido:', err);
        this.toastService.showError(err.error?.message || 'No se pudo cancelar el pedido.');
      }
    });
  }

  // Badge class según estado
  getStatusBadgeClass(estado: string): string {
    switch (estado) {
      case 'solicitado': return 'bg-warning text-dark';
      case 'confirmado': return 'bg-info text-white';
      case 'en preparación': return 'bg-primary text-white';
      case 'listo': return 'bg-success text-white';
      case 'entregado': return 'bg-secondary text-white';
      case 'cancelado': return 'bg-danger text-white';
      default: return 'bg-light text-dark';
    }
  }
}
export { TrackingComponent as Tracking };

