import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { OrderHistoryComponent } from './order-history.component';
import { OrderService, Pedido } from '../../../services/order.service';
import { PagoService } from '../../../services/pago.service';
import { ToastService } from '../../../services/toast.service';

describe('OrderHistoryComponent (Admin)', () => {
  let component: OrderHistoryComponent;
  let fixture: ComponentFixture<OrderHistoryComponent>;
  let orderServiceSpy: any;
  let pagoServiceSpy: any;
  let toastServiceSpy: any;

  const mockPedidos: Pedido[] = [
    { id: 1, fecha: '2026-08-04', hora: '10:00', modalidad: 'presencial', valor_total: 10, estado: 'entregado', cliente_id: 1, detalles: [] },
    { id: 2, fecha: '2026-08-04', hora: '11:00', modalidad: 'en línea', valor_total: 20, estado: 'entregado', cliente_id: 2, detalles: [] }
  ];

  const mockPagos = [
    { id: 10, pedido_id: 1, valor: 10, metodo_pago: 'efectivo', estado: 'aprobado' },
    { id: 11, pedido_id: 2, valor: 20, metodo_pago: 'tarjeta', estado: 'aprobado' }
  ];

  beforeEach(async () => {
    orderServiceSpy = {
      getPedidos: vi.fn().mockReturnValue(of({ success: true, data: mockPedidos })),
      getPedidoById: vi.fn().mockReturnValue(of({ success: true, data: mockPedidos[0] }))
    };
    pagoServiceSpy = {
      getAllPagos: vi.fn().mockReturnValue(of({ success: true, data: mockPagos }))
    };
    toastServiceSpy = {
      showError: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [OrderHistoryComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: PagoService, useValue: pagoServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(OrderHistoryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y generar el calendario con datos', () => {
    expect(component).toBeTruthy();
    expect(orderServiceSpy.getPedidos).toHaveBeenCalled();
    expect(pagoServiceSpy.getAllPagos).toHaveBeenCalled();
    expect(component.calendarDays.length).toBeGreaterThan(0);
  });

  it('selectDate debe filtrar pedidos y calcular ingresos por método de pago', () => {
    component.selectDate('2026-08-04');
    expect(component.pedidosFiltrados.length).toBe(2);
    expect(component.totalRevenueToday).toBe(30);
    expect(component.revenueByMethod.efectivo).toBe(10);
    expect(component.revenueByMethod.tarjeta).toBe(20);
  });

  it('changeMonth debe cambiar el mes e invocar la generación del calendario', () => {
    const initialMonth = component.selectedMonth;
    component.changeMonth(1);
    expect(component.selectedMonth).not.toBe(initialMonth);
  });

  it('openDetail y closeDetail deben controlar el modal de detalle', () => {
    component.openDetail(mockPedidos[0]);
    expect(orderServiceSpy.getPedidoById).toHaveBeenCalledWith(1);
    expect(component.showDetailModal).toBe(true);

    component.closeDetail();
    expect(component.showDetailModal).toBe(false);
    expect(component.selectedPedido).toBeNull();
  });

  it('openDetail no debe llamar al backend si el pedido no tiene id', () => {
    component.openDetail({ ...mockPedidos[0], id: undefined });
    expect(orderServiceSpy.getPedidoById).not.toHaveBeenCalled();
  });

  it('openDetail debe notificar error si falla la carga del detalle', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    orderServiceSpy.getPedidoById.mockReturnValue(throwError(() => new Error('fallo')));

    component.openDetail(mockPedidos[0]);

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('No se pudo cargar la información detallada del pedido.');
    consoleErrorSpy.mockRestore();
  });

  it('loadData debe notificar error si falla la carga de pedidos', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    orderServiceSpy.getPedidos.mockReturnValue(throwError(() => new Error('fallo')));

    component.loadData();

    expect(component.loadingData).toBe(false);
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al cargar el historial de pedidos.');
    consoleErrorSpy.mockRestore();
  });

  it('loadData debe notificar error si falla la carga de pagos', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    pagoServiceSpy.getAllPagos.mockReturnValue(throwError(() => new Error('fallo')));

    component.loadData();

    expect(component.loadingData).toBe(false);
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al cargar la información de pagos.');
    consoleErrorSpy.mockRestore();
  });

  it('selectDate debe calcular ingresos por transferencia y excluir pedidos cancelados', () => {
    component.pedidos = [
      { id: 3, fecha: '2026-08-05', hora: '09:00', modalidad: 'presencial', valor_total: 15, estado: 'entregado', cliente_id: 1, detalles: [], metodo_pago: 'transferencia' },
      { id: 4, fecha: '2026-08-05', hora: '09:30', modalidad: 'presencial', valor_total: 100, estado: 'cancelado', cliente_id: 1, detalles: [], metodo_pago: 'efectivo' }
    ];

    component.selectDate('2026-08-05');

    expect(component.pedidosFiltrados.length).toBe(2);
    expect(component.totalRevenueToday).toBe(15);
    expect(component.revenueByMethod.transferencia).toBe(15);
    expect(component.revenueByMethod.efectivo).toBe(0);
  });

  it('changeMonth debe retroceder de enero a diciembre del año anterior', () => {
    component.selectedMonth = 0;
    component.selectedYear = 2026;

    component.changeMonth(-1);

    expect(component.selectedMonth).toBe(11);
    expect(component.selectedYear).toBe(2025);
  });

  it('changeMonth debe avanzar de diciembre a enero del año siguiente', () => {
    component.selectedMonth = 11;
    component.selectedYear = 2026;

    component.changeMonth(1);

    expect(component.selectedMonth).toBe(0);
    expect(component.selectedYear).toBe(2027);
  });

  it('formatDate debe rellenar con ceros mes y día', () => {
    expect(component.formatDate(2026, 0, 5)).toBe('2026-01-05');
    expect(component.formatDate(2026, 11, 25)).toBe('2026-12-25');
  });

  it('getSelectedDateLabel debe formatear la fecha seleccionada y estar vacío si no hay fecha', () => {
    component.selectedDate = '2026-08-04';
    expect(component.getSelectedDateLabel()).toBe('04 de Agosto, 2026');

    component.selectedDate = '';
    expect(component.getSelectedDateLabel()).toBe('');
  });

  it('checkSalesForDate debe ignorar pedidos cancelados', () => {
    component.pedidos = [
      { id: 5, fecha: '2026-08-10', hora: '09:00', modalidad: 'presencial', valor_total: 10, estado: 'cancelado', cliente_id: 1, detalles: [] }
    ];
    expect(component.checkSalesForDate('2026-08-10')).toBe(false);

    component.pedidos = [
      { id: 6, fecha: '2026-08-10', hora: '09:00', modalidad: 'presencial', valor_total: 10, estado: 'entregado', cliente_id: 1, detalles: [] }
    ];
    expect(component.checkSalesForDate('2026-08-10')).toBe(true);
  });

  it('getInitials debe devolver iniciales o "E" por defecto', () => {
    expect(component.getInitials('Carlos', 'López')).toBe('CL');
    expect(component.getInitials()).toBe('E');
  });
});
