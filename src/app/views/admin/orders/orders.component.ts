import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Pedido } from '../../../services/order.service';
import { EmployeeService, Empleado } from '../../../services/employee.service';
import { ClientService, Cliente } from '../../../services/client.service';
import { ProductService, Producto } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './orders.component.html',
  styleUrl: './orders.component.css'
})
export class OrdersComponent implements OnInit {
  private orderService = inject(OrderService);
  private employeeService = inject(EmployeeService);
  private clientService = inject(ClientService);
  private productService = inject(ProductService);
  public authService = inject(AuthService);

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
  newOrderItems: Array<{
    producto_id: number;
    producto: Producto;
    cantidad: number;
    precio_unitario: number;
    subtotal: number;
  }> = [];
  
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
          }
        },
        error: (err) => {
          console.error('Error al cargar empleados:', err);
        }
      });
    }
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

  // Iniciar la preparación del pedido (Mueve a 'en preparación' y auto-asigna al empleado actual si no hay)
  iniciarPreparacion(pedido: Pedido) {
    const payload: { estado: string; empleado_id?: number } = {
      estado: 'en preparación'
    };

    const currentUser = this.authService.currentUser();
    // Si no tiene empleado asignado y el usuario activo es empleado/admin, asignarlo
    if (!pedido.empleado_id && currentUser && (currentUser.rol === 'empleado' || currentUser.rol === 'admin')) {
      payload.empleado_id = currentUser.id;
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
          }
        },
        error: (err) => {
          alert('Error al iniciar preparación: ' + (err.error?.message || err.message));
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
          }
        },
        error: (err) => {
          alert('Error al marcar como listo: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Entregar el pedido (Mueve a 'entregado' y lo retira del Kanban)
  entregarPedido(pedido: Pedido) {
    if (pedido.id) {
      this.orderService.updatePedido(pedido.id, { estado: 'entregado' }).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadPedidos();
            this.closeDetail();
          }
        },
        error: (err) => {
          alert('Error al entregar pedido: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Cancelar el pedido
  cancelarPedido(pedido: Pedido) {
    if (confirm('¿Está seguro de que desea cancelar este pedido? Se devolverá el stock disponible.')) {
      if (pedido.id) {
        this.orderService.updatePedido(pedido.id, { estado: 'cancelado' }).subscribe({
          next: (response) => {
            if (response.success) {
              this.loadPedidos();
              this.closeDetail();
            }
          },
          error: (err) => {
            alert('Error al cancelar pedido: ' + (err.error?.message || err.message));
          }
        });
      }
    }
  }

  // Cambiar manualmente de empleado asignado desde el modal
  onEmpleadoChange(pedidoId: number, event: Event) {
    const select = event.target as HTMLSelectElement;
    const empleadoId = select.value ? parseInt(select.value, 10) : null;

    this.orderService.updatePedido(pedidoId, { empleado_id: empleadoId }).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadPedidos();
          this.selectedPedido = response.data;
        }
      },
      error: (err) => {
        alert('Error al asignar empleado: ' + (err.error?.message || err.message));
      }
    });
  }

  // Abrir modal de detalles
  openDetail(pedido: Pedido) {
    this.selectedPedido = pedido;
    this.showDetailModal = true;
  }

  // Cerrar modal de detalles
  closeDetail() {
    this.selectedPedido = null;
    this.showDetailModal = false;
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

    // Cargar Lista de Clientes
    this.clientService.getClientes().subscribe({
      next: (res) => {
        if (res.success) {
          this.clientes = res.data;
          if (this.clientes.length > 0) {
            this.newOrderClienteId = this.clientes[0].id;
          }
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
        }
      },
      error: (err) => console.error('Error al cargar productos:', err)
    });

    this.showCreateModal = true;
  }

  closeCreateModal() {
    this.showCreateModal = false;
  }

  addItemToNewOrder() {
    if (!this.selectedProductId) {
      alert('Seleccione un producto.');
      return;
    }
    if (this.selectedQuantity < 1) {
      alert('La cantidad debe ser al menos 1.');
      return;
    }

    const producto = this.productosDisponibles.find(p => p.id === Number(this.selectedProductId));
    if (!producto || !producto.id) {
      alert('Producto no válido.');
      return;
    }

    if (this.selectedQuantity > producto.cantidad_disponible) {
      alert(`La cantidad excede el stock disponible (${producto.cantidad_disponible}).`);
      return;
    }

    const indexExistente = this.newOrderItems.findIndex(item => item.producto_id === producto.id);
    const precioUnitario = Number(producto.precio);

    if (indexExistente !== -1) {
      const nuevaCantidad = this.newOrderItems[indexExistente].cantidad + Number(this.selectedQuantity);
      if (nuevaCantidad > producto.cantidad_disponible) {
        alert(`La cantidad total en el pedido (${nuevaCantidad}) excede el stock disponible (${producto.cantidad_disponible}).`);
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
  }

  removeItemFromNewOrder(index: number) {
    this.newOrderItems.splice(index, 1);
  }

  getNewOrderTotal(): number {
    return this.newOrderItems.reduce((acc, item) => acc + item.subtotal, 0);
  }

  guardarNuevoPedido() {
    if (!this.newOrderClienteId) {
      alert('Debe seleccionar un cliente.');
      return;
    }
    if (this.newOrderItems.length === 0) {
      alert('Debe agregar al menos un producto al pedido.');
      return;
    }

    this.isSubmittingOrder = true;
    const now = new Date();
    const fechaStr = now.toISOString().split('T')[0]; // YYYY-MM-DD
    const horaStr = now.toTimeString().split(' ')[0];  // HH:MM:SS

    const currentUser = this.authService.currentUser();
    let empleadoId: number | undefined = undefined;
    if (currentUser && (currentUser.rol === 'empleado' || currentUser.rol === 'admin')) {
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
          alert('¡Pedido registrado con éxito!');
          this.closeCreateModal();
          this.loadPedidos();
        }
      },
      error: (err) => {
        this.isSubmittingOrder = false;
        console.error('Error al registrar pedido:', err);
        alert('Error al registrar el pedido: ' + (err.error?.message || err.message));
      }
    });
  }
}
export { OrdersComponent as Orders };
