import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
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
});
