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
    this.loading = true;

    // 1. Intentar obtener la lista completa del servidor
    this.orderService.getPedidos().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.pedidos = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
          if (typeof window !== 'undefined') {
            localStorage.setItem('my_orders', JSON.stringify(this.pedidos));
          }
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
        // 2. Si GET /pedidos devuelve 403 en Railway, consultar en vivo cada pedido por su ID (GET /pedidos/:id)
        if (typeof window !== 'undefined') {
          const localSaved = localStorage.getItem('my_orders');
          if (localSaved) {
            try {
              const savedList: Pedido[] = JSON.parse(localSaved);
              if (savedList.length > 0) {
                this.refreshOrdersById(savedList);
                return;
              }
            } catch (e) {}
          }
        }
        this.loading = false;
        this.pedidos = [];
        this.cdr.detectChanges();
      }
    });
  }

  // Consultar en vivo el estado actualizado de cada pedido por su ID desde el backend (GET /api/v1/pedidos/:id)
  refreshOrdersById(orderList: Pedido[]) {
    let completedCount = 0;
    const updatedList: Pedido[] = [...orderList];

    orderList.forEach((ord, index) => {
      if (ord.id) {
        this.orderService.getPedidoById(ord.id).subscribe({
          next: (res) => {
            if (res.success && res.data) {
              updatedList[index] = res.data;
            }
            completedCount++;
            if (completedCount === orderList.length) {
              this.finalizeOrderRefresh(updatedList);
            }
          },
          error: () => {
            completedCount++;
            if (completedCount === orderList.length) {
              this.finalizeOrderRefresh(updatedList);
            }
          }
        });
      } else {
        completedCount++;
        if (completedCount === orderList.length) {
          this.finalizeOrderRefresh(updatedList);
        }
      }
    });
  }

  finalizeOrderRefresh(updatedList: Pedido[]) {
    this.loading = false;
    this.pedidos = updatedList.sort((a, b) => (b.id || 0) - (a.id || 0));
    if (typeof window !== 'undefined') {
      localStorage.setItem('my_orders', JSON.stringify(this.pedidos));
    }
    this.cdr.detectChanges();
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

