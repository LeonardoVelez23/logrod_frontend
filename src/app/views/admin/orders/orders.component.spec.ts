import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { OrdersComponent } from './orders.component';
import { OrderService, Pedido } from '../../../services/order.service';
import { EmployeeService, Empleado } from '../../../services/employee.service';
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

  it('getters de permisos deben reflejar las restricciones por rol', () => {
    authServiceSpy.getCurrentRole.mockReturnValue('mesero');
    expect(component.puedeGestionarEstado).toBe(false);
    expect(component.puedeEntregar).toBe(false);
    expect(component.puedeCrearPedidos).toBe(true);
    expect(component.puedeCancelar).toBe(true);
    expect(component.esCocinero).toBe(false);

    authServiceSpy.getCurrentRole.mockReturnValue('cocinero');
    expect(component.puedeGestionarEstado).toBe(true);
    expect(component.puedeEntregar).toBe(false);
    expect(component.puedeCrearPedidos).toBe(false);
    expect(component.puedeCancelar).toBe(false);
    expect(component.esCocinero).toBe(true);

    authServiceSpy.getCurrentRole.mockReturnValue('admin');
    expect(component.puedeGestionarEstado).toBe(true);
    expect(component.puedeEntregar).toBe(true);
    expect(component.puedeCrearPedidos).toBe(true);
    expect(component.puedeCancelar).toBe(true);
    expect(component.esCocinero).toBe(false);
  });

  it('loadPedidos debe manejar errores y detener el estado de carga', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    orderServiceSpy.getPedidos.mockReturnValue(throwError(() => new Error('fallo')));

    component.loadPedidos();

    expect(component.isLoadingPedidos).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('loadEmpleados no debe cargar empleados si el rol no es admin', () => {
    authServiceSpy.getCurrentRole.mockReturnValue('mesero');
    employeeServiceSpy.getEmpleados.mockClear();

    component.loadEmpleados();

    expect(employeeServiceSpy.getEmpleados).not.toHaveBeenCalled();
  });

  it('loadEmpleados debe manejar errores al cargar empleados', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    authServiceSpy.getCurrentRole.mockReturnValue('admin');
    employeeServiceSpy.getEmpleados.mockReturnValue(throwError(() => new Error('fallo')));

    component.loadEmpleados();

    expect(consoleErrorSpy).toHaveBeenCalled();
    consoleErrorSpy.mockRestore();
  });

  it('openDetail debe abrir el modal con datos parciales y refrescarlos desde el servidor', () => {
    const pedidoCompleto = { ...mockPedidos[0], empleado_id: 10, empleado_preparacion_id: 11 };
    orderServiceSpy.getPedidoById.mockReturnValue(of({ success: true, data: pedidoCompleto }));

    component.openDetail(mockPedidos[0]);

    expect(component.showDetailModal).toBe(true);
    expect(orderServiceSpy.getPedidoById).toHaveBeenCalledWith(1);
    expect(component.selectedPedido).toEqual(pedidoCompleto);
    expect(component.tempEmpleadoId).toBe('10');
    expect(component.tempEmpleadoPreparacionId).toBe('11');

    component.closeDetail();
    expect(component.selectedPedido).toBeNull();
    expect(component.showDetailModal).toBe(false);
  });

  it('iniciarPreparacion debe notificar error si falla la actualización', () => {
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.iniciarPreparacion(mockPedidos[0]);

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al iniciar preparación: fallo');
  });

  it('marcarListo debe notificar error si falla la actualización', () => {
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.marcarListo(mockPedidos[0]);

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al marcar como listo: fallo');
  });

  it('confirmarCancelacion debe notificar error si falla la actualización', () => {
    component.solicitarCancelacion(mockPedidos[0]);
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.confirmarCancelacion();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al cancelar pedido: fallo');
    expect(component.isCancellingOrder).toBe(false);
  });

  it('entregarPedido debe notificar error cuando la verificación de pago falla con un error distinto a 404', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    pagoServiceSpy.getPagoByPedido.mockReturnValue(throwError(() => ({ status: 500 })));

    component.entregarPedido(mockPedidos[0]);

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al verificar el estado de pago del pedido.');
    expect(component.showPaymentModal).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('ejecutarEntregaDirecta debe marcar el pedido como entregado y cerrar el detalle', () => {
    component.selectedPedido = mockPedidos[0];
    orderServiceSpy.updatePedido.mockReturnValue(of({ success: true }));

    component.ejecutarEntregaDirecta(mockPedidos[0]);

    expect(orderServiceSpy.updatePedido).toHaveBeenCalledWith(1, { estado: 'entregado' });
    expect(component.selectedPedido).toBeNull();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Pedido entregado correctamente (Pago ya aprobado).');
  });

  it('ejecutarEntregaDirecta debe notificar error si falla la actualización', () => {
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.ejecutarEntregaDirecta(mockPedidos[0]);

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al entregar pedido: fallo');
  });

  it('closePaymentModal debe cerrar la pasarela y limpiar el pedido por pagar', () => {
    component.abrirModalPago(mockPedidos[0]);

    component.closePaymentModal();

    expect(component.showPaymentModal).toBe(false);
    expect(component.pedidoPorPagar).toBeNull();
  });

  it('procesarPagoYEntregar debe notificar error si falla el registro del pago', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    component.abrirModalPago(mockPedidos[0]);
    component.paymentMethod = 'efectivo';
    pagoServiceSpy.createPago.mockReturnValue(throwError(() => ({ error: { message: 'fallo pago' } })));

    component.procesarPagoYEntregar();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al procesar pago: fallo pago');
    expect(component.isProcessingPayment).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('procesarPagoYEntregar debe notificar error si el pago se registra pero falla la actualización del pedido', () => {
    component.abrirModalPago(mockPedidos[0]);
    component.paymentMethod = 'efectivo';
    pagoServiceSpy.createPago.mockReturnValue(of({ success: true }));
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo actualizar' } })));

    component.procesarPagoYEntregar();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Pago registrado, pero falló al actualizar el pedido: fallo actualizar');
    expect(component.isProcessingPayment).toBe(false);
  });

  it('guardarAsignacion debe notificar error si falla la actualización', () => {
    component.selectedPedido = mockPedidos[0];
    orderServiceSpy.updatePedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.guardarAsignacion();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al guardar asignación: fallo');
    expect(component.isSavingAsignacion).toBe(false);
  });

  it('guardarNuevoPedido debe notificar error si falla la creación del pedido', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    component.newOrderClienteId = 1;
    component.newOrderItems = [{ producto_id: 101, producto: mockProducto, cantidad: 1, precio_unitario: 2.0, subtotal: 2.0 }];
    orderServiceSpy.createPedido.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.guardarNuevoPedido();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al registrar el pedido: fallo');
    expect(component.isSubmittingOrder).toBe(false);
    consoleErrorSpy.mockRestore();
  });

  it('addItemToNewOrder debe validar producto seleccionado, cantidad mínima, producto inválido y stock disponible', () => {
    component.openCreateModal();

    component.selectedProductId = null;
    component.addItemToNewOrder();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Seleccione un producto.');

    component.selectedProductId = 101;
    component.selectedQuantity = 0;
    component.addItemToNewOrder();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La cantidad debe ser al menos 1.');

    component.selectedProductId = 999;
    component.selectedQuantity = 1;
    component.addItemToNewOrder();
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Producto no válido.');

    component.selectedProductId = 101;
    component.selectedQuantity = 51;
    component.addItemToNewOrder();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La cantidad excede el stock disponible (50).');

    component.selectedQuantity = 40;
    component.addItemToNewOrder();
    expect(component.newOrderItems.length).toBe(1);

    component.selectedQuantity = 20;
    component.addItemToNewOrder();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La cantidad total en el pedido (60) excede el stock disponible (50).');
    expect(component.newOrderItems[0].cantidad).toBe(40);
  });

  it('getCategoriasDisponibles y getProductosDisponiblesFiltrados deben filtrar por categoría y por búsqueda', () => {
    const mockProducto2: Producto = { id: 102, codigo: 'P02', nombre: 'Té', precio: 1.5, cantidad_disponible: 30, estado: 'disponible', categoria_id: 2, categoria: { id: 2, nombre: 'Infusiones' } };
    productServiceSpy.getProductos.mockReturnValue(of({ success: true, data: [mockProducto, mockProducto2] }));

    component.openCreateModal();

    expect(component.getCategoriasDisponibles().length).toBe(2);
    expect(component.getProductosDisponiblesFiltrados().length).toBe(2);

    component.newOrderCategoriaId = '2';
    expect(component.getProductosDisponiblesFiltrados()).toEqual([mockProducto2]);

    component.newOrderCategoriaId = '';
    component.newOrderProductSearch = 'caf';
    expect(component.getProductosDisponiblesFiltrados()).toEqual([mockProducto]);
  });

  it('getInitials sin nombres ni apellidos debe devolver "E" por defecto', () => {
    expect(component.getInitials()).toBe('E');
  });

  it('getTiempoTranscurrido debe mostrar horas cuando pasa más de una hora', () => {
    const fecha = new Date(Date.now() - 90 * 60000).toISOString();
    expect(component.getTiempoTranscurrido(fecha)).toBe('Hace 1 h');
  });

  it('getProgreso no debe superar el 100%', () => {
    const fecha = new Date(Date.now() - 40 * 60000).toISOString();
    expect(component.getProgreso(fecha)).toBe(100);
  });

  it('getCocineros y getMeserosYCajeros deben usar el listado completo como fallback si no hay coincidencias por cargo', () => {
    const empleadoSinCargoConocido: Empleado = { id: 1, identificacion: '001', nombres: 'Ana', apellidos: 'Ruiz', correo_electronico: 'ana@test.com', cargo: 'Gerente' };
    component.empleados = [empleadoSinCargoConocido];

    expect(component.getCocineros()).toEqual(component.empleados);
    expect(component.getMeserosYCajeros()).toEqual(component.empleados);
  });

  it('ngOnDestroy debe limpiar el temporizador de actualización', () => {
    const clearIntervalSpy = vi.spyOn(window, 'clearInterval');

    component.ngOnDestroy();

    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
