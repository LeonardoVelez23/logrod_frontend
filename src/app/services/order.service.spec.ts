import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { OrderService, Pedido } from './order.service';
import { API_BASE_URL } from '../config/api.config';

describe('OrderService', () => {
  let service: OrderService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        OrderService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(OrderService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getPedidos() debe realizar GET a /pedidos', () => {
    const mockData = { success: true, data: [{ id: 1, fecha: '2026-08-04', hora: '10:00', modalidad: 'presencial' as const, estado: 'solicitado' as const, valor_total: 10, cliente_id: 1, detalles: [] }] };

    service.getPedidos().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getPedidoById() debe realizar GET a /pedidos/:id', () => {
    const mockData = { success: true, data: { id: 1, fecha: '2026-08-04', hora: '10:00', modalidad: 'presencial' as const, estado: 'solicitado' as const, valor_total: 10, cliente_id: 1, detalles: [] } };

    service.getPedidoById(1).subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('createPedido() debe realizar POST a /pedidos', () => {
    const newPedido: Omit<Pedido, 'id'> = { fecha: '2026-08-04', hora: '11:00', modalidad: 'en línea', estado: 'solicitado', valor_total: 25, cliente_id: 2, detalles: [] };
    const mockRes = { success: true, message: 'Pedido registrado', data: { id: 2, ...newPedido } };

    service.createPedido(newPedido).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newPedido);
    req.flush(mockRes);
  });

  it('updatePedido() debe realizar PUT a /pedidos/:id', () => {
    const updateData = { estado: 'confirmado' };
    const mockRes = { success: true, message: 'Actualizado', data: { id: 1, fecha: '2026-08-04', hora: '10:00', modalidad: 'presencial' as const, estado: 'confirmado' as const, valor_total: 10, cliente_id: 1, detalles: [] } };

    service.updatePedido(1, updateData).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(mockRes);
  });

  it('deletePedido() debe realizar DELETE a /pedidos/:id', () => {
    const mockRes = { success: true, message: 'Pedido eliminado' };

    service.deletePedido(1).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/pedidos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRes);
  });
});
