import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { OrdersComponent } from './orders.component';
import { OrderService, Pedido } from '../../../services/order.service';
import { EmployeeService } from '../../../services/employee.service';
import { ClientService } from '../../../services/client.service';
import { ProductService, Producto } from '../../../services/product.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';
import { PagoService } from '../../../services/pago.service';

describe('OrdersComponent (Admin)', () => {
  let component: OrdersComponent;
  let fixture: ComponentFixture<OrdersComponent>;
  let orderServiceSpy: any;
  let employeeServiceSpy: any;
  let clientServiceSpy: any;
  let productServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let pagoServiceSpy: any;

  const mockPedidos: Pedido[] = [
    { id: 1, fecha: new Date().toISOString().split('T')[0], hora: '10:00', modalidad: 'presencial', estado: 'solicitado', valor_total: 15, cliente_id: 1, detalles: [] },
    { id: 2, fecha: new Date().toISOString().split('T')[0], hora: '10:15', modalidad: 'en línea', estado: 'en preparación', valor_total: 25, cliente_id: 2, detalles: [] }
  ];

  const mockProducto: Producto = { id: 101, codigo: 'P01', nombre: 'Café', precio: 2.0, cantidad_disponible: 50, estado: 'disponible', categoria_id: 1, categoria: { id: 1, nombre: 'Bebidas' } };

  beforeEach(async () => {
    orderServiceSpy = {
      getPedidos: vi.fn().mockReturnValue(of({ success: true, data: mockPedidos })),
      getPedidoById: vi.fn().mockReturnValue(of({ success: true, data: mockPedidos[0] })),
      createPedido: vi.fn(),
      updatePedido: vi.fn()
    };
    employeeServiceSpy = {
      getEmpleados: vi.fn().mockReturnValue(of({ success: true, data: [{ id: 10, nombres: 'Cocinero 1', cargo: 'Cocinero' }, { id: 11, nombres: 'Mesero 1', cargo: 'Mesero' }] }))
    };
    clientServiceSpy = {
      getClientes: vi.fn().mockReturnValue(of({ success: true, data: [{ id: 1, nombres: 'Cliente 1' }] }))
    };
    productServiceSpy = {
      getProductos: vi.fn().mockReturnValue(of({ success: true, data: [mockProducto] }))
    };
    authServiceSpy = {
      getCurrentRole: vi.fn().mockReturnValue('admin'),
      currentUser: vi.fn().mockReturnValue({ id: 99, rol: 'admin' })
    };
    toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn(),
      showInfo: vi.fn()
    };
    pagoServiceSpy = {
      getPagoByPedido: vi.fn(),
      createPago: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OrdersComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: EmployeeService, useValue: employeeServiceSpy },
        { provide: ClientService, useValue: clientServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: PagoService, useValue: pagoServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrdersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar los pedidos e inicializar el tablero', () => {
    expect(component).toBeTruthy();
    expect(orderServiceSpy.getPedidos).toHaveBeenCalled();
    expect(component.pedidos.length).toBe(2);
  });

  it('getPedidosPorEstados debe filtrar los pedidos por estado y fecha', () => {
    const solicitados = component.getPedidosPorEstados(['solicitado']);
    expect(solicitados.length).toBe(1);
    expect(solicitados[0].id).toBe(1);
  });

  it('iniciarPreparacion debe actualizar el estado del pedido a "en preparación"', () => {
    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true, data: { ...mockPedidos[0], estado: 'en preparación' } }));

    component.iniciarPreparacion(mockPedidos[0]);
    expect(orderServiceSpy.updatePedido).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Pedido en preparación.');
  });

  it('marcarListo debe actualizar el estado del pedido a "listo"', () => {
    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true, data: { ...mockPedidos[0], estado: 'listo' } }));

    component.marcarListo(mockPedidos[0]);
    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { estado: 'listo' });
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Pedido marcado como listo.');
  });

  it('solicitarCancelacion, confirmarCancelacion y cerrarCancelConfirm deben manejar el flujo de cancelación', () => {
    component.solicitarCancelacion(mockPedidos[0]);
    expect(component.showCancelConfirmModal).toBe(true);

    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true }));
    component.confirmarCancelacion();

    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { estado: 'cancelado' });
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Pedido cancelado correctamente.');

    component.cerrarCancelConfirm();
    expect(component.showCancelConfirmModal).toBe(false);
  });

  it('entregarPedido con pago ya aprobado debe ejecutar la entrega directa', () => {
    pagoServiceSpy.getPagoByPedido.mockReturnValue(of({ success: true, data: { estado: 'aprobado' } }));
    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true }));

    component.entregarPedido(mockPedidos[0]);

    expect(pagoServiceSpy.getPagoByPedido).toHaveBeenCalledWith(1);
    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { estado: 'entregado' });
  });

  it('entregarPedido sin pago aprobado debe abrir la pasarela de cobro', () => {
    pagoServiceSpy.getPagoByPedido.mockReturnValue(throwError(() => ({ status: 404 })));

    component.entregarPedido(mockPedidos[0]);

    expect(component.showPaymentModal).toBe(true);
    expect(component.pedidoPorPagar).toEqual(mockPedidos[0]);
  });

  it('procesarPagoYEntregar debe requerir número de referencia para tarjeta/transferencia', () => {
    component.abrirModalPago(mockPedidos[0]);
    component.paymentMethod = 'tarjeta';
    component.paymentReference = '';

    component.procesarPagoYEntregar();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Debe ingresar un número de referencia para este método de pago.');
  });

  it('procesarPagoYEntregar debe registrar el pago y luego marcar el pedido como entregado', () => {
    component.abrirModalPago(mockPedidos[0]);
    component.paymentMethod = 'efectivo';
    pagoServiceSpy.createPago.mockReturnValue(of({ success: true }));
    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true }));

    component.procesarPagoYEntregar();

    expect(pagoServiceSpy.createPago).toHaveBeenCalled();
    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { estado: 'entregado' });
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();
  });

  it('openCreateModal, closeCreateModal y manipulación de ítems del nuevo pedido', () => {
    component.openCreateModal();
    expect(component.showCreateModal).toBe(true);

    expect(component.getCategoriasDisponibles().length).toBe(1);
    expect(component.getProductosDisponiblesFiltrados().length).toBe(1);

    component.seleccionarProductoNuevoPedido(mockProducto);
    expect(component.selectedProductId).toBe(101);

    component.selectedQuantity = 2;
    component.addItemToNewOrder();
    expect(component.newOrderItems.length).toBe(1);
    expect(component.getNewOrderTotal()).toBe(4.0);

    component.removeItemFromNewOrder(0);
    expect(component.newOrderItems.length).toBe(0);

    component.closeCreateModal();
    expect(component.showCreateModal).toBe(false);
  });

  it('guardarNuevoPedido debe validar cliente e ítems y llamar a createPedido', () => {
    component.newOrderClienteId = null;
    component.guardarNuevoPedido();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Debe seleccionar un cliente.');

    component.newOrderClienteId = 1;
    component.newOrderItems = [];
    component.guardarNuevoPedido();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Debe agregar al menos un producto al pedido.');

    component.newOrderItems = [{ producto_id: 101, producto: mockProducto, cantidad: 1, precio_unitario: 2.0, subtotal: 2.0 }];
    orderServiceSpy.createPedido.mockReturnValue(of({ success: true }));

    component.guardarNuevoPedido();
    expect(orderServiceSpy.createPedido).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();
  });

  it('guardarAsignacion debe actualizar los empleados asignados', () => {
    component.selectedPedido = mockPedidos[0];
    component.tempEmpleadoId = '10';
    component.tempEmpleadoPreparacionId = '11';

    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true, data: { id: 1, empleado_id: 10, empleado_preparacion_id: 11 } }));

    component.guardarAsignacion();
    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { empleado_id: 10, empleado_preparacion_id: 11 });
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Asignación de personal guardada correctamente.');
  });

  it('helpers de tiempo e iniciales y roles', () => {
    expect(component.getInitials('Carlos', 'López')).toBe('CL');
    expect(component.getMinutosTranscurridos(new Date().toISOString())).toBe(0);
    expect(component.getTiempoTranscurrido(new Date().toISOString())).toBe('Hace un momento');
    expect(component.getProgreso(new Date().toISOString())).toBe(0);
    expect(component.getCocineros().length).toBeGreaterThan(0);
    expect(component.getMeserosYCajeros().length).toBeGreaterThan(0);

    component.irAHoy();
    expect(component.verTodosLosDias).toBe(false);

    component.toggleVerTodosLosDias();
    expect(component.verTodosLosDias).toBe(true);

    component.cambiarFecha('2026-08-01');
    expect(component.selectedFecha).toBe('2026-08-01');
  });
});
