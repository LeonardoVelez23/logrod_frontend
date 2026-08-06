import { Component, OnInit, OnDestroy, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Pedido } from '../../services/order.service';
import { PagoService, Pago } from '../../services/pago.service';
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
export class TrackingComponent implements OnInit, OnDestroy {
  private orderService = inject(OrderService);
  private pagoService = inject(PagoService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private cdr = inject(ChangeDetectorRef);

  pedidos: Pedido[] = [];
  loading: boolean = true;
  searchTerm: string = '';
  statusFilter: string = '';

  // IDs de pedidos que ya tienen pago registrado
  pedidosPagados = new Set<number>();

  // Control de Modal de Detalle
  selectedPedido: Pedido | null = null;
  showDetailModal: boolean = false;

  // Control de Cancelación
  cancellingId: number | null = null;

  // Pestaña Activa: 'en_curso' (seguimiento activo) o 'historial' (pedidos entregados/cancelados)
  activeTab: 'en_curso' | 'historial' = 'en_curso';

  // Control de Pasarela de Pago Simulada (Sabor Politécnico Pay)
  showPaymentModal: boolean = false;
  submittingPayment: boolean = false;
  pedidoPorPagar: Pedido | null = null;
  cardForm = {
    numeroTarjeta: '',
    nombreTitular: '',
    expiracion: '',
    cvv: ''
  };

  // Temporizador para Polling en Tiempo Real
  private pollingTimerId: any = null;

  ngOnInit() {
    this.loadPedidos(false);
    this.startRealtimePolling();
  }

  ngOnDestroy() {
    this.stopRealtimePolling();
  }

  startRealtimePolling() {
    if (typeof window !== 'undefined') {
      this.stopRealtimePolling();
      // Consultar silenciosamente el backend cada 3 segundos para actualización en vivo
      this.pollingTimerId = setInterval(() => {
        this.loadPedidos(true);
      }, 3000);
    }
  }

  stopRealtimePolling() {
    if (this.pollingTimerId) {
      clearInterval(this.pollingTimerId);
      this.pollingTimerId = null;
    }
  }

  loadPedidos(isSilent: boolean = false) {
    if (!isSilent) {
      this.loading = true;
    }

    // 1. Intentar obtener la lista completa del servidor
    this.orderService.getPedidos().subscribe({
      next: (response) => {
        if (response.success && Array.isArray(response.data)) {
          this.pedidos = response.data.sort((a, b) => (b.id || 0) - (a.id || 0));
          // Marcar pedidos que ya tienen pago registrado en el backend
          this.pedidos.forEach(p => {
            if (p.id && p.metodo_pago) {
              this.pedidosPagados.add(p.id);
            }
          });
          if (typeof window !== 'undefined') {
            localStorage.setItem('my_orders', JSON.stringify(this.pedidos));
          }
          if (this.selectedPedido) {
            const updated = this.pedidos.find(p => p.id === this.selectedPedido?.id);
            if (updated) {
              this.selectedPedido = updated;
            }
          }
          this.loading = false;
          this.cdr.detectChanges();
        }
      },
      error: () => {
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

  get pedidosEnCurso(): Pedido[] {
    return this.pedidos.filter(p => {
      const isEnCurso = p.estado !== 'entregado' && p.estado !== 'cancelado';
      const term = this.searchTerm.trim().toLowerCase();
      const matchSearch = !term ||
        p.id?.toString().includes(term) ||
        p.modalidad.toLowerCase().includes(term) ||
        p.estado.toLowerCase().includes(term);
      return isEnCurso && matchSearch;
    });
  }

  get pedidosHistorial(): Pedido[] {
    return this.pedidos.filter(p => {
      const isHistorial = p.estado === 'entregado' || p.estado === 'cancelado';
      const term = this.searchTerm.trim().toLowerCase();
      const matchSearch = !term ||
        p.id?.toString().includes(term) ||
        p.modalidad.toLowerCase().includes(term) ||
        p.estado.toLowerCase().includes(term);
      return isHistorial && matchSearch;
    });
  }

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

  openDetailModal(pedido: Pedido) {
    this.selectedPedido = pedido;
    this.showDetailModal = true;
  }

  closeDetailModal() {
    this.showDetailModal = false;
    this.selectedPedido = null;
  }

  // Abrir Pasarela de Pago Simulada
  openPaymentGatewayModal(pedido: Pedido) {
    if (pedido.estado === 'cancelado') {
      this.toastService.showError('Los pedidos cancelados no requieren pago.');
      return;
    }
    if (pedido.estado === 'solicitado') {
      this.toastService.showWarning('El pedido debe ser confirmado antes de realizar el pago en línea.');
      return;
    }
    if (!pedido.id) return;

    this.pedidoPorPagar = pedido;
    this.cardForm = {
      numeroTarjeta: '',
      nombreTitular: '',
      expiracion: '',
      cvv: ''
    };
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  closePaymentModal() {
    this.showPaymentModal = false;
    this.submittingPayment = false;
    this.pedidoPorPagar = null;
    this.cdr.detectChanges();
  }

  fillTestCardData() {
    const user = this.authService.currentUser();
    const nombreDefecto = user ? `${user.nombres} ${user.apellidos}`.toUpperCase() : 'ESTUDIANTE POLITÉCNICO';

    this.cardForm = {
      numeroTarjeta: '4532 8899 1234 5678',
      nombreTitular: nombreDefecto,
      expiracion: '12/28',
      cvv: '789'
    };
    this.toastService.showInfo('Datos de tarjeta de prueba cargados.');
    this.cdr.detectChanges();
  }

  onCardNumberInput(event: any) {
    let val = event.target.value.replace(/\D/g, '');
    if (val.length > 16) val = val.substring(0, 16);
    const matches = val.match(/.{1,4}/g);
    this.cardForm.numeroTarjeta = matches ? matches.join(' ') : val;
  }

  onExpiryInput(event: any) {
    let val = event.target.value.replace(/\D/g, '');
    if (val.length > 4) val = val.substring(0, 4);
    if (val.length >= 3) {
      this.cardForm.expiracion = `${val.substring(0, 2)}/${val.substring(2)}`;
    } else {
      this.cardForm.expiracion = val;
    }
  }

  submitSimulatedPayment() {
    if (!this.pedidoPorPagar || !this.pedidoPorPagar.id) {
      this.toastService.showError('Pedido no válido.');
      return;
    }

    const numLimpio = this.cardForm.numeroTarjeta.replace(/\s/g, '');
    if (numLimpio.length < 16) {
      this.toastService.showWarning('Ingrese un número de tarjeta válido de 16 dígitos.');
      return;
    }
    if (!this.cardForm.nombreTitular.trim()) {
      this.toastService.showWarning('Ingrese el nombre del titular de la tarjeta.');
      return;
    }
    if (!this.cardForm.expiracion.trim() || this.cardForm.expiracion.length < 5) {
      this.toastService.showWarning('Ingrese la fecha de expiración válida (MM/YY).');
      return;
    }
    if (!this.cardForm.cvv.trim() || this.cardForm.cvv.length < 3) {
      this.toastService.showWarning('Ingrese un código CVV válido de 3 dígitos.');
      return;
    }

    this.submittingPayment = true;
    const pedidoId = this.pedidoPorPagar.id;
    const valor = Number(this.pedidoPorPagar.valor_total);
    const refSimulada = `PAY-SIM-${Math.floor(100000 + Math.random() * 900000)}`;

    setTimeout(() => {
      const nowStr = new Date().toISOString();

      const payload: Pago = {
        pedido_id: pedidoId,
        fecha: nowStr,
        valor: valor,
        metodo_pago: 'tarjeta',
        numero_referencia: refSimulada,
        estado: 'aprobado'
      };

      // Guardar el registro del Pago Aprobado en la BD (el pedido ya está confirmado)
      this.pagoService.createPago(payload).subscribe({
        next: (response) => {
          this.pedidosPagados.add(pedidoId);
          this.finalizarPagoSimuladoExitoso(valor, refSimulada);
        },
        error: (err) => {
          console.warn('Nota al registrar pago en backend:', err);
          this.pedidosPagados.add(pedidoId);
          this.finalizarPagoSimuladoExitoso(valor, refSimulada);
        }
      });
    }, 1200);
  }

  private finalizarPagoSimuladoExitoso(valor: number, ref: string) {
    this.submittingPayment = false;
    this.toastService.showSuccess(`¡Pago en línea de $${valor.toFixed(2)} APROBADO por la Pasarela! Ref: ${ref}`);
    this.closePaymentModal();
    this.loadPedidos();
  }

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

