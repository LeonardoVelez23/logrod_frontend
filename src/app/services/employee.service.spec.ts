import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { EmployeeService, Empleado } from './employee.service';
import { API_BASE_URL } from '../config/api.config';

describe('EmployeeService', () => {
  let service: EmployeeService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        EmployeeService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(EmployeeService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getEmpleados() debe realizar GET a /empleados', () => {
    const mockData = { success: true, data: [{ id: 1, identificacion: '11111', nombres: 'Luis', apellidos: 'Mendoza', correo_electronico: 'luis@test.com' }] };

    service.getEmpleados().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/empleados`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getEmpleadoById() debe realizar GET a /empleados/:id', () => {
    const mockData = { success: true, data: { id: 1, identificacion: '11111', nombres: 'Luis', apellidos: 'Mendoza', correo_electronico: 'luis@test.com' } };

    service.getEmpleadoById(1).subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/empleados/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('createEmpleado() debe realizar POST a /empleados', () => {
    const newEmp: Omit<Empleado, 'id'> = { identificacion: '22222', nombres: 'Maria', apellidos: 'López', correo_electronico: 'maria@test.com' };
    const mockRes = { success: true, message: 'Creado', data: { id: 2, ...newEmp } };

    service.createEmpleado(newEmp).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/empleados`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newEmp);
    req.flush(mockRes);
  });

  it('updateEmpleado() debe realizar PUT a /empleados/:id', () => {
    const updateData = { cargo: 'Cajero' };
    const mockRes = { success: true, message: 'Actualizado', data: { id: 1, identificacion: '11111', nombres: 'Luis', apellidos: 'Mendoza', correo_electronico: 'luis@test.com', cargo: 'Cajero' } };

    service.updateEmpleado(1, updateData).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/empleados/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(mockRes);
  });

  it('deleteEmpleado() debe realizar DELETE a /empleados/:id', () => {
    const mockRes = { success: true, message: 'Eliminado' };

    service.deleteEmpleado(1).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/empleados/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRes);
  });
});
