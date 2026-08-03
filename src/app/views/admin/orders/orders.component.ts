import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Pedido } from '../../../services/order.service';
import { EmployeeService, Empleado } from '../../../services/employee.service';
import { ClientService, Cliente } from '../../../services/client.service';
import { ProductService, Producto, Categoria } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { ToastService } from '../../../services/toast.service';
import { PagoService } from '../../../services/pago.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})

export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private employeeService = inject(EmployeeService);
  private clientService = inject(ClientService);
  private cdr = inject(ChangeDetectorRef);
  private productService = inject(ProductService);
  public authService = inject(AuthService);
  private toastService = inject(ToastService);
  private pagoService = inject(PagoService);


  pedidos: Pedido[] = [];
  empleados: Empleado[] = [];
  clientes: Cliente[] = [];
  productosDisponibles: Producto[] = [];
  searchTerm: string = '';
  
  selectedPedido: Pedido | null = null;
  showDetailModal: boolean = false;

  // Control del Modal de Creación de Pedido
  showCreateModal: boolean = false;
  isSubmittingOrder: boolean = false;
  newOrderClienteId: number | null = null;
  newOrderModalidad: 'presencial' | 'en línea' = 'presencial';
  selectedProductId: number | null = null;
  selectedQuantity: number = 1;
  newOrderCategoriaId: string = '';
  newOrderProductSearch: string = '';
  newOrderItems: Array<{
    producto_id: number;
    producto: Producto;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }> = [];

  // Variables para la pasarela de cobro del pedido
  showPaymentModal: boolean = false;
  pedidoPorPagar: Pedido | null = null;
  paymentMethod: 'efectivo' | 'tarjeta' | 'transferencia' = 'efectivo';
  paymentReference: string = '';
  isProcessingPayment: boolean = false;
  isSavingAsignacion: boolean = false;

  // Variables temporales para la asignación de empleados (string para compatibilidad con ngModel en select)
  tempEmpleadoId: string = '';
  tempEmpleadoPreparacionId: string = '';

  // Modal de confirmación para cancelar pedido
  showCancelConfirmModal: boolean = false;
  pedidoPorCancelar: Pedido | null = null;
  
  // Para registrar un timer que actualice los minutos transcurridos en tiempo real
  private timerId: any;

  ngOnInit() {
    this.loadPedidos();
    this.loadEmpleados();

    // Actualizar los contadores visuales cada minuto
    if (typeof window !== 'undefined') {
      this.timerId = setInterval(() => {
        // Esto fuerza a Angular a ejecutar el change detection y recalcular los tiempos
        this.pedidos = [...this.pedidos];
        this.cdr.detectChanges();
      }, 60000);
    }
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  loadPedidos() {
    this.orderService.getPedidos().subscribe({
      next: (response) => {
        if (response.success) {
          this.pedidos = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar pedidos:', err);
      }
    });
  }

  loadEmpleados() {
    // Solo cargamos si el usuario actual es admin (por la restricción de rol en backend)
    const role = this.authService.getCurrentRole();
    if (role === 'admin') {
      this.employeeService.getEmpleados().subscribe({
        next: (response) => {
          if (response.success) {
            this.empleados = response.data;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Error al cargar empleados:', err);
        }
      });
    }
  }

  // El mesero solo puede ver el tablero y crear pedidos, no mover el estado de un pedido
  get puedeGestionarEstado(): boolean {
    return this.authService.getCurrentRole() !== 'mesero';
  }

  // Filtrar pedidos por estado y término de búsqueda
  getPedidosPorEstados(estados: string[]): Pedido[] {
    return this.pedidos.filter(pedido => {
      const coincideEstado = estados.includes(pedido.estado);
      if (!coincideEstado) return false;

      if (!this.searchTerm.trim()) return true;

      const term = this.searchTerm.toLowerCase();
      const clientName = `${pedido.cliente?.nombres} ${pedido.cliente?.apellidos}`.toLowerCase();
      const orderId = pedido.id?.toString() || '';
      const dni = pedido.cliente?.identificacion || '';

      return clientName.includes(term) || orderId.includes(term) || dni.includes(term);
    });
  }

  // Iniciar la preparación del pedido (Mueve a 'en preparación' y auto-asigna al cocinero actual si no hay)
  iniciarPreparacion(pedido: Pedido) {
    const payload: { estado: string; empleado_id?: number; empleado_preparacion_id?: number } = {
      estado: 'en preparación'
    };

    const currentUser = this.authService.currentUser();
    // Si no tiene cocinero asignado y el usuario activo es personal interno, asignarlo a la preparación
    const rolesInternos = ['empleado', 'admin', 'cajero', 'cocinero'];
    if (!pedido.empleado_preparacion_id && currentUser && rolesInternos.includes(currentUser.rol)) {
      payload.empleado_preparacion_id = currentUser.id;
    }

    if (pedido.id) {
      this.orderService.updatePedido(pedido.id, payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPedidos();
            // Actualizar modal si está abierto
            if (this.selectedPedido && this.selectedPedido.id === pedido.id) {
              this.selectedPedido = response.data;
            }
            this.toastService.showSuccess('Pedido en preparación.');
          }
        },
        error: (err) => {
          this.toastService.showError('Error al iniciar preparación: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Marcar el pedido como listo (Mueve a 'listo')
  marcarListo(pedido: Pedido) {
    if (pedido.id) {
      this.orderService.updatePedido(pedido.id, { estado: 'listo' }).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPedidos();
            if (this.selectedPedido && this.selectedPedido.id === pedido.id) {
              this.selectedPedido = response.data;
            }
            this.toastService.showSuccess('Pedido marcado como listo.');
          }
        },
        error: (err) => {
          this.toastService.showError('Error al marcar como listo: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Entregar el pedido (Mueve a 'entregado' y lo retira del Kanban, previa verificación/registro de pago)
  entregarPedido(pedido: Pedido) {
    if (!pedido.id) return;

    // Verificar si ya existe un pago aprobado para este pedido
    this.pagoService.getPagoByPedido(pedido.id).subscribe({
      next: (response) => {
        if (response.success && response.data && response.data.estado === 'aprobado') {
          // Ya tiene pago aprobado, entregar directamente
          this.ejecutarEntregaDirecta(pedido);
        } else {
          // El pago no está aprobado. Abrir pasarela de cobro
          this.abrirModalPago(pedido);
        }
      },
      error: (err) => {
        // Si no existe pago (devuelve 404), abrimos el modal de cobro
        if (err.status === 404) {
          this.abrirModalPago(pedido);
        } else {
          console.error('Error al verificar pago:', err);
          this.toastService.showError('Error al verificar el estado de pago del pedido.');
        }
      }
    });
  }

  // Cancelar el pedido
  // Paso 1: Mostrar modal de confirmación
  solicitarCancelacion(pedido: Pedido) {
    this.pedidoPorCancelar = pedido;
    this.showCancelConfirmModal = true;
    this.cdr.detectChanges();
  }

  // Paso 2: Confirmar y ejecutar la cancelación
  confirmarCancelacion() {
    const pedido = this.pedidoPorCancelar;
    if (!pedido?.id) return;

    this.orderService.updatePedido(pedido.id, { estado: 'cancelado' }).subscribe({
      next: (response) => {
        if (response.success) {
          this.showCancelConfirmModal = false;
          this.pedidoPorCancelar = null;
          this.loadPedidos();
          this.closeDetail();
          this.toastService.showSuccess('Pedido cancelado correctamente.');
        }
      },
      error: (err) => {
        this.toastService.showError('Error al cancelar pedido: ' + (err.error?.message || err.message));
      }
    });
  }

  cerrarCancelConfirm() {
    this.showCancelConfirmModal = false;
    this.pedidoPorCancelar = null;
    this.cdr.detectChanges();
  }

  // Guardar ambas asignaciones de empleados en una sola llamada
  guardarAsignacion() {
    if (!this.selectedPedido?.id) return;
    this.isSavingAsignacion = true;

    const empleadoId = this.tempEmpleadoId ? parseInt(this.tempEmpleadoId, 10) : null;
    const empleadoPrepId = this.tempEmpleadoPreparacionId ? parseInt(this.tempEmpleadoPreparacionId, 10) : null;

    this.orderService.updatePedido(this.selectedPedido.id, {
      empleado_id: empleadoId,
      empleado_preparacion_id: empleadoPrepId
    }).subscribe({
      next: (response) => {
        this.isSavingAsignacion = false;
        if (response.success) {
          // Refrescar el pedido directamente desde el servidor para tener datos completos
          this.orderService.getPedidoById(response.data.id!).subscribe({
            next: (res) => {
              if (res.success) {
                this.selectedPedido = res.data;
                this.tempEmpleadoId = res.data.empleado_id?.toString() ?? '';
                this.tempEmpleadoPreparacionId = res.data.empleado_preparacion_id?.toString() ?? '';
                this.cdr.detectChanges();
              }
            }
          });
          this.loadPedidos();
          this.toastService.showSuccess('Asignación de personal guardada correctamente.');
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isSavingAsignacion = false;
        this.toastService.showError('Error al guardar asignación: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  // Abrir modal de detalles
  openDetail(pedido: Pedido) {
    // Abrir con datos parciales primero (UX rápida), luego refrescar desde servidor
    this.selectedPedido = pedido;
    this.tempEmpleadoId = pedido.empleado_id?.toString() ?? '';
    this.tempEmpleadoPreparacionId = pedido.empleado_preparacion_id?.toString() ?? '';
    this.showDetailModal = true;
    this.cdr.detectChanges();

    // Traer datos completos del servidor (con objetos empleadoResponsable y empleadoPreparacion)
    if (pedido.id) {
      this.orderService.getPedidoById(pedido.id).subscribe({
        next: (res) => {
          if (res.success) {
            this.selectedPedido = res.data;
            this.tempEmpleadoId = res.data.empleado_id?.toString() ?? '';
            this.tempEmpleadoPreparacionId = res.data.empleado_preparacion_id?.toString() ?? '';
            this.cdr.detectChanges();
          }
        }
      });
    }
  }

  // Cerrar modal de detalles
  closeDetail() {
    this.selectedPedido = null;
    this.showDetailModal = false;
    this.cdr.detectChanges();
  }

  // Helper: Obtener iniciales para el avatar
  getInitials(nombres?: string, apellidos?: string): string {
    const n = nombres || '';
    const a = apellidos || '';
    const i1 = n[0] ? n[0].toUpperCase() : '';
    const i2 = a[0] ? a[0].toUpperCase() : '';
    return i1 + i2 || 'E';
  }

  // Helper: Minutos transcurridos desde la creación
  getMinutosTranscurridos(createdAt?: string): number {
    if (!createdAt) return 0;
    const created = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const diffMs = now - created;
    return Math.floor(diffMs / 60000);
  }

  // Helper: Obtener texto amigable de tiempo transcurrido
  getTiempoTranscurrido(createdAt?: string): string {
    const mins = this.getMinutosTranscurridos(createdAt);
    if (mins < 1) return 'Hace un momento';
    if (mins < 60) return `Hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    return `Hace ${hours} h`;
  }

  // Helper: Calcular porcentaje de progreso para la barra en preparación (target 20 minutos)
  getProgreso(createdAt?: string): number {
    const mins = this.getMinutosTranscurridos(createdAt);
    const target = 20; // 20 minutos es el objetivo
    return Math.min(100, Math.round((mins / target) * 100));
  }

  // --- Lógica del Modal para Crear Nuevo Pedido (Empleado / Admin) ---
  openCreateModal() {
    this.newOrderClienteId = null;
    this.newOrderModalidad = 'presencial';
    this.selectedProductId = null;
    this.selectedQuantity = 1;
    this.newOrderItems = [];
    this.isSubmittingOrder = false;
    this.newOrderCategoriaId = '';
    this.newOrderProductSearch = '';

    // Cargar Lista de Clientes
    this.clientService.getClientes().subscribe({
      next: (res) => {
        if (res.success) {
          this.clientes = res.data;
          if (this.clientes.length > 0) {
            this.newOrderClienteId = this.clientes[0].id;
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error al cargar clientes:', err)
    });

    // Cargar Lista de Productos Disponibles
    this.productService.getProductos().subscribe({
      next: (res) => {
        if (res.success) {
          this.productosDisponibles = res.data.filter(p => p.estado === 'disponible' && p.cantidad_disponible > 0);
          if (this.productosDisponibles.length > 0 && this.productosDisponibles[0].id) {
            this.selectedProductId = this.productosDisponibles[0].id;
          }
          this.cdr.detectChanges();
        }
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });

    this.showCreateModal = true;
    this.cdr.detectChanges();
  }

  closeCreateModal() {
    this.showCreateModal = false;
    this.cdr.detectChanges();
  }

  // Categorías presentes entre los productos disponibles (para los chips del selector, como en el Catálogo)
  getCategoriasDisponibles(): Categoria[] {
    const vistas = new Map<number, Categoria>();
    for (const p of this.productosDisponibles) {
      if (p.categoria && !vistas.has(p.categoria.id)) {
        vistas.set(p.categoria.id, p.categoria);
      }
    }
    return Array.from(vistas.values());
  }

  // Productos disponibles filtrados por categoría/búsqueda, para la mini-vista tipo Catálogo
  getProductosDisponiblesFiltrados(): Producto[] {
    return this.productosDisponibles.filter(p => {
      const matchCategoria = !this.newOrderCategoriaId || p.categoria_id === parseInt(this.newOrderCategoriaId, 10);
      const term = this.newOrderProductSearch.trim().toLowerCase();
      const matchBusqueda = !term || p.nombre.toLowerCase().includes(term);
      return matchCategoria && matchBusqueda;
    });
  }

  // Seleccionar un producto desde la tarjeta (reemplaza al select plano)
  seleccionarProductoNuevoPedido(producto: Producto) {
    this.selectedProductId = producto.id ?? null;
  }

  addItemToNewOrder() {
    if (!this.selectedProductId) {
      this.toastService.showWarning('Seleccione un producto.');
      return;
    }
    if (this.selectedQuantity < 1) {
      this.toastService.showWarning('La cantidad debe ser al menos 1.');
      return;
    }

    const producto = this.productosDisponibles.find(p => p.id === Number(this.selectedProductId));
    if (!producto || !producto.id) {
      this.toastService.showError('Producto no válido.');
      return;
    }

    if (this.selectedQuantity > producto.cantidad_disponible) {
      this.toastService.showWarning(`La cantidad excede el stock disponible (${producto.cantidad_disponible}).`);
      return;
    }

    const indexExistente = this.newOrderItems.findIndex(item => item.producto_id === producto.id);
    const precioUnitario = Number(producto.precio);

    if (indexExistente !== -1) {
      const nuevaCantidad = this.newOrderItems[indexExistente].cantidad + Number(this.selectedQuantity);
      if (nuevaCantidad > producto.cantidad_disponible) {
        this.toastService.showWarning(`La cantidad total en el pedido (${nuevaCantidad}) excede el stock disponible (${producto.cantidad_disponible}).`);
        return;
      }
      this.newOrderItems[indexExistente].cantidad = nuevaCantidad;
      this.newOrderItems[indexExistente].subtotal = nuevaCantidad * precioUnitario;
    } else {
      const cant = Number(this.selectedQuantity);
      this.newOrderItems.push({
        producto_id: producto.id,
        producto,
        cantidad: cant,
        precio_unitario: precioUnitario,
        subtotal: cant * precioUnitario
      });
    }

    this.selectedQuantity = 1;
    this.toastService.showSuccess('Producto agregado al borrador.');
  }

  removeItemFromNewOrder(index: number) {
    this.newOrderItems.splice(index, 1);
    this.toastService.showInfo('Producto removido del borrador.');
  }

  getNewOrderTotal(): number {
    return this.newOrderItems.reduce((acc, item) => acc + item.subtotal, 0);
  }

  guardarNuevoPedido() {
    if (!this.newOrderClienteId) {
      this.toastService.showWarning('Debe seleccionar un cliente.');
      return;
    }
    if (this.newOrderItems.length === 0) {
      this.toastService.showWarning('Debe agregar al menos un producto al pedido.');
      return;
    }

    this.isSubmittingOrder = true;
    const now = new Date();
    const fechaStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaStr = now.toTimeString().split(' ')[0];  // HH:MM:SS

    const currentUser = this.authService.currentUser();
    let empleadoId: number | undefined = undefined;
    const rolesInternos = ['empleado', 'admin', 'cajero', 'cocinero', 'mesero'];
    if (currentUser && rolesInternos.includes(currentUser.rol)) {
      empleadoId = currentUser.id;
    }

    const payload = {
      fecha: fechaStr,
      hora: horaStr,
      modalidad: this.newOrderModalidad,
      cliente_id: Number(this.newOrderClienteId),
      empleado_id: empleadoId,
      estado: 'solicitado' as const,
      valor_total: this.getNewOrderTotal(),
      detalles: this.newOrderItems.map(item => ({
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario,
        subtotal: item.subtotal
      }))
    };

    this.orderService.createPedido(payload).subscribe({
      next: (res) => {
        this.isSubmittingOrder = false;
        if (res.success) {
          this.toastService.showSuccess('¡Pedido registrado con éxito!');
          this.closeCreateModal();
          this.loadPedidos();
        }
      },
      error: (err) => {
        this.isSubmittingOrder = false;
        console.error('Error al registrar pedido:', err);
        this.toastService.showError('Error al registrar el pedido: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  // Abrir pasarela de cobro
  abrirModalPago(pedido: Pedido) {
    this.pedidoPorPagar = pedido;
    this.paymentMethod = 'efectivo';
    this.paymentReference = '';
    this.showPaymentModal = true;
    this.cdr.detectChanges();
  }

  // Cerrar pasarela de cobro
  closePaymentModal() {
    this.showPaymentModal = false;
    this.pedidoPorPagar = null;
    this.cdr.detectChanges();
  }

  // Entrega directa de pedidos ya cobrados
  ejecutarEntregaDirecta(pedido: Pedido) {
    if (pedido.id) {
      this.orderService.updatePedido(pedido.id, { estado: 'entregado' }).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPedidos();
            this.closeDetail();
            this.toastService.showSuccess('Pedido entregado correctamente (Pago ya aprobado).');
          }
        },
        error: (err) => {
          this.toastService.showError('Error al entregar pedido: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Procesar cobro y transición de estado del pedido a entregado
  procesarPagoYEntregar() {
    if (!this.pedidoPorPagar || !this.pedidoPorPagar.id) return;

    if ((this.paymentMethod === 'tarjeta' || this.paymentMethod === 'transferencia') && !this.paymentReference.trim()) {
      this.toastService.showWarning('Debe ingresar un número de referencia para este método de pago.');
      return;
    }

    this.isProcessingPayment = true;
    const nowStr = new Date().toISOString();

    const payloadPago = {
      pedido_id: this.pedidoPorPagar.id,
      fecha: nowStr,
      valor: Number(this.pedidoPorPagar.valor_total),
      metodo_pago: this.paymentMethod,
      numero_referencia: this.paymentReference.trim() || null,
      estado: 'aprobado' as const
    };

    // 1. Crear el registro del Pago
    this.pagoService.createPago(payloadPago).subscribe({
      next: (resPago) => {
        if (resPago.success) {
          // 2. Transicionar el pedido a 'entregado'
          this.orderService.updatePedido(this.pedidoPorPagar!.id!, { estado: 'entregado' }).subscribe({
            next: (resPedido) => {
              this.isProcessingPayment = false;
              if (resPedido.success) {
                this.toastService.showSuccess('¡Cobro registrado y pedido entregado con éxito!');
                this.closePaymentModal();
                this.closeDetail();
                this.loadPedidos();
              }
            },
            error: (err) => {
              this.isProcessingPayment = false;
              this.toastService.showError('Pago registrado, pero falló al actualizar el pedido: ' + (err.error?.message || err.message));
              this.cdr.detectChanges();
            }
          });
        }
      },
      error: (err) => {
        this.isProcessingPayment = false;
        console.error('Error al procesar pago:', err);
        this.toastService.showError('Error al procesar pago: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  // Filtrar empleados con cargos de Cocina/Preparación
  getCocineros(): Empleado[] {
    const list = this.empleados.filter(e => {
      const cargo = (e.cargo || '').toLowerCase();
      return cargo.includes('cocinero') || cargo.includes('cocina') || cargo.includes('chef') || cargo.includes('preparaci');
    });
    return list.length > 0 ? list : this.empleados;
  }

  // Filtrar empleados con cargos de Atención (Meseros, Cajeros, Repartidores)
  getMeserosYCajeros(): Empleado[] {
    const list = this.empleados.filter(e => {
      const cargo = (e.cargo || '').toLowerCase();
      return cargo.includes('mesero') || cargo.includes('cajero') || cargo.includes('atencion') || cargo.includes('repartidor') || cargo.includes('mesera');
    });
    if (list.length === 0) {
      // Fallback: Cualquier empleado que no sea de cocina
      return this.empleados.filter(e => {
        const cargo = (e.cargo || '').toLowerCase();
        return !(cargo.includes('cocinero') || cargo.includes('cocina') || cargo.includes('chef'));
      });
    }
    return list;
  }
}
export { OrdersComponent as Orders };
