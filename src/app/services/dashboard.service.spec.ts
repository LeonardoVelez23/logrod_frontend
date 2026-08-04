import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { DashboardService } from './dashboard.service';
import { API_BASE_URL } from '../config/api.config';

describe('DashboardService', () => {
  let service: DashboardService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        DashboardService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(DashboardService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getStats() sin parámetros debe realizar GET a /pedidos/stats sin query params', () => {
    const mockData = {
      success: true,
      data: {
        totalOrders: 10,
        totalRevenue: 150.0,
        totalClients: 5,
        orderStatusDistribution: { solicitado: 1, confirmado: 2, 'en preparación': 3, listo: 1, entregado: 2, cancelado: 1 },
        modalityDistribution: { presencial: 7, 'en línea': 3 },
        popularProducts: []
      }
    };

    service.getStats().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos/stats`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.has('desde')).toBe(false);
    expect(req.request.params.has('hasta')).toBe(false);
    req.flush(mockData);
  });

  it('getStats() con desde y hasta debe incluir query params', () => {
    const mockData = {
      success: true,
      data: {
        totalOrders: 5,
        totalRevenue: 80.0,
        totalClients: 3,
        orderStatusDistribution: { solicitado: 0, confirmado: 1, 'en preparación': 1, listo: 1, entregado: 2, cancelado: 0 },
        modalityDistribution: { presencial: 3, 'en línea': 2 },
        popularProducts: []
      }
    };

    service.getStats('2026-08-01', '2026-08-04').subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(request => 
      request.url === `${API_BASE_URL}/pedidos/stats` &&
      request.params.get('desde') === '2026-08-01' &&
      request.params.get('hasta') === '2026-08-04'
    );
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
