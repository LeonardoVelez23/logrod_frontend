import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { DashboardComponent } from './dashboard.component';
import { OrderService } from '../../../services/order.service';
import { ProductService } from '../../../services/product.service';
import { DashboardService } from '../../../services/dashboard.service';

describe('DashboardComponent (Admin)', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let orderServiceSpy: any;
  let productServiceSpy: any;
  let dashboardServiceSpy: any;

  const mockStats = {
    success: true,
    data: {
      totalOrders: 10,
      totalRevenue: 500,
      totalClients: 5,
      orderStatusDistribution: {
        solicitado: 2,
        confirmado: 3,
        'en preparación': 1,
        listo: 1,
        entregado: 2,
        cancelado: 1
      },
      modalityDistribution: {
        presencial: 6,
        'en línea': 4
      },
      popularProducts: [
        { id: 1, nombre: 'Pan de Queso', precio: 1.5, totalVendido: 20 }
      ]
    }
  };

  beforeEach(async () => {
    orderServiceSpy = {
      getPedidos: vi.fn().mockReturnValue(of({ success: true, data: [{ id: 1 }, { id: 2 }] }))
    };
    productServiceSpy = {
      getProductos: vi.fn().mockReturnValue(of({ success: true, data: [{ id: 1 }, { id: 2 }, { id: 3 }] }))
    };
    dashboardServiceSpy = {
      getStats: vi.fn().mockReturnValue(of(mockStats))
    };

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        { provide: OrderService, useValue: orderServiceSpy },
        { provide: ProductService, useValue: productServiceSpy },
        { provide: DashboardService, useValue: dashboardServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar datos al inicializarse', () => {
    expect(component).toBeTruthy();
    expect(dashboardServiceSpy.getStats).toHaveBeenCalled();
    expect(orderServiceSpy.getPedidos).toHaveBeenCalled();
    expect(productServiceSpy.getProductos).toHaveBeenCalled();
    expect(component.totalSales).toBe(500);
    expect(component.totalOrdersCount).toBe(10);
    expect(component.pendingOrdersCount).toBe(7); // 2+3+1+1
    expect(component.totalProductsCount).toBe(3);
  });

  it('cambiarFiltroFecha debe actualizar las fechas y llamar a loadStats', () => {
    component.cambiarFiltroFecha('hoy');
    expect(component.filtroFecha).toBe('hoy');
    expect(component.fechaDesde).not.toBe('');

    component.cambiarFiltroFecha('todo');
    expect(component.filtroFecha).toBe('todo');
    expect(component.fechaDesde).toBe('');
  });

  it('aplicarRangoPersonalizado debe llamar a loadStats solo si hay fechas', () => {
    component.fechaDesde = '';
    component.fechaHasta = '';
    component.aplicarRangoPersonalizado();

    component.filtroFecha = 'rango';
    component.fechaDesde = '2026-08-01';
    component.fechaHasta = '2026-08-04';
    component.aplicarRangoPersonalizado();
    expect(dashboardServiceSpy.getStats).toHaveBeenCalledWith('2026-08-01', '2026-08-04');
  });

  it('getPercent debe calcular los porcentajes correctamente evitando división por cero', () => {
    expect(component.getPercent(5, 10)).toBe(50);
    expect(component.getPercent(5, 0)).toBe(0);
  });

  it('debe manejar errores de carga de datos sin romper el componente', () => {
    dashboardServiceSpy.getStats.mockReturnValue(throwError(() => new Error('Err')));
    orderServiceSpy.getPedidos.mockReturnValue(throwError(() => new Error('Err')));
    productServiceSpy.getProductos.mockReturnValue(throwError(() => new Error('Err')));

    component.loadData();
    expect(component).toBeTruthy();
  });
});
