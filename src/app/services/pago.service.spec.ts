import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { PagoService, Pago } from './pago.service';
import { API_BASE_URL } from '../config/api.config';

describe('PagoService', () => {
  let service: PagoService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        PagoService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(PagoService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('createPago() debe realizar POST a /pagos', () => {
    const newPago: Pago = { pedido_id: 1, fecha: '2026-08-04', valor: 15.5, metodo_pago: 'efectivo' };
    const mockRes = { success: true, message: 'Pago registrado', data: { id: 1, ...newPago } };

    service.createPago(newPago).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pagos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newPago);
    req.flush(mockRes);
  });

  it('getAllPagos() debe realizar GET a /pagos', () => {
    const mockData = { success: true, data: [{ id: 1, pedido_id: 1, fecha: '2026-08-04', valor: 15.5, metodo_pago: 'efectivo' as const }] };

    service.getAllPagos().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pagos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getPagoByPedido() debe realizar GET a /pagos/pedido/:pedidoId', () => {
    const mockData = { success: true, data: { id: 1, pedido_id: 5, fecha: '2026-08-04', valor: 20, metodo_pago: 'tarjeta' as const } };

    service.getPagoByPedido(5).subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pagos/pedido/5`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });
});
