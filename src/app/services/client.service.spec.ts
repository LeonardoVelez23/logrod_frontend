import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { ClientService, Cliente } from './client.service';
import { API_BASE_URL } from '../config/api.config';

describe('ClientService', () => {
  let service: ClientService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ClientService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ClientService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getClientes() debe realizar GET a /clientes', () => {
    const mockData = { success: true, data: [{ id: 1, identificacion: '1234567890', nombres: 'Carlos', apellidos: 'Pérez', correo_electronico: 'carlos@test.com' }] };

    service.getClientes().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getClienteById() debe realizar GET a /clientes/:id', () => {
    const mockData = { success: true, data: { id: 1, identificacion: '1234567890', nombres: 'Carlos', apellidos: 'Pérez', correo_electronico: 'carlos@test.com' } };

    service.getClienteById(1).subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('createCliente() debe realizar POST a /clientes', () => {
    const newClient: Omit<Cliente, 'id'> = { identificacion: '0987654321', nombres: 'Ana', apellidos: 'Gómez', correo_electronico: 'ana@test.com' };
    const mockRes = { success: true, message: 'Cliente creado', data: { id: 2, ...newClient } };

    service.createCliente(newClient).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newClient);
    req.flush(mockRes);
  });

  it('updateCliente() debe realizar PUT a /clientes/:id', () => {
    const updateData = { nombres: 'Carlos Alberto' };
    const mockRes = { success: true, message: 'Actualizado', data: { id: 1, identificacion: '1234567890', nombres: 'Carlos Alberto', apellidos: 'Pérez', correo_electronico: 'carlos@test.com' } };

    service.updateCliente(1, updateData).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(mockRes);
  });

  it('deleteCliente() debe realizar DELETE a /clientes/:id', () => {
    const mockRes = { success: true, message: 'Cliente eliminado' };

    service.deleteCliente(1).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRes);
  });
});
