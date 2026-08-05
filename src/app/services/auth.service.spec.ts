import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { AuthService } from './auth.service';
import { API_BASE_URL } from '../config/api.config';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();

    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });

    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('debe cargar usuario desde localStorage al inicializarse si existe', () => {
    const mockUser = { id: 1, email: 'test@example.com', rol: 'admin' };
    localStorage.setItem('user', JSON.stringify(mockUser));

    // Instanciar un nuevo servicio dentro del contexto de inyección
    const newService = TestBed.runInInjectionContext(() => new AuthService());
    expect(newService.currentUser()).toEqual(mockUser);
  });

  it('debe manejar JSON inválido en localStorage al inicializar sin fallar', () => {
    localStorage.setItem('user', 'invalid-json-{');
    
    const newService = TestBed.runInInjectionContext(() => new AuthService());
    expect(newService.currentUser()).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
  });

  it('login() debe realizar petición POST y guardar usuario y token en éxito', () => {
    const mockResponse = {
      success: true,
      token: 'jwt-mock-token',
      user: { id: 2, email: 'user@test.com', rol: 'cliente' }
    };

    service.login({ email: 'user@test.com', password: '123' }).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email: 'user@test.com', password: '123' });
    req.flush(mockResponse);

    expect(localStorage.getItem('token')).toBe('jwt-mock-token');
    expect(localStorage.getItem('user')).toBe(JSON.stringify(mockResponse.user));
    expect(service.currentUser()).toEqual(mockResponse.user);
  });

  it('login() no debe guardar credenciales si la respuesta indica success: false', () => {
    const mockResponse = { success: false, message: 'Credenciales inválidas' };

    service.login({ email: 'user@test.com', password: 'wrong' }).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/login`);
    req.flush(mockResponse);

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('register() debe realizar petición POST a /clientes', () => {
    const clientData = { nombre: 'Juan', email: 'juan@test.com' };
    const mockResponse = { success: true, message: 'Cliente registrado' };

    service.register(clientData).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/clientes`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(clientData);
    req.flush(mockResponse);
  });

  it('forgotPassword() debe enviar correo al backend', () => {
    const email = 'user@test.com';
    const mockResponse = { success: true, message: 'OTP enviado' };

    service.forgotPassword(email).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/forgot-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email });
    req.flush(mockResponse);
  });

  it('resetPassword() debe enviar credenciales y OTP al backend', () => {
    const email = 'user@test.com';
    const otp = '123456';
    const newPassword = 'newPassword123';
    const mockResponse = { success: true, message: 'Contraseña restablecida' };

    service.resetPassword(email, otp, newPassword).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/auth/reset-password`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ email, otp, newPassword });
    req.flush(mockResponse);
  });

  it('logout() debe limpiar localStorage y resetear currentUser', () => {
    localStorage.setItem('token', 'fake-token');
    localStorage.setItem('user', JSON.stringify({ email: 'a@b.com' }));
    service.currentUser.set({ email: 'a@b.com' });

    service.logout();

    expect(localStorage.getItem('token')).toBeNull();
    expect(localStorage.getItem('user')).toBeNull();
    expect(service.currentUser()).toBeNull();
  });

  it('isAuthenticated() debe retornar true solo si existe token en localStorage', () => {
    expect(service.isAuthenticated()).toBe(false);
    localStorage.setItem('token', 'test-token');
    expect(service.isAuthenticated()).toBe(true);
  });

  it('getCurrentRole() debe retornar el rol del usuario o null', () => {
    expect(service.getCurrentRole()).toBeNull();
    service.currentUser.set({ id: 1, rol: 'admin' });
    expect(service.getCurrentRole()).toBe('admin');
  });
});
