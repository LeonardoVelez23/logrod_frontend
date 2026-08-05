import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { jwtInterceptor } from './jwt.interceptor';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

describe('jwtInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let routerSpy: any;

  beforeEach(() => {
    localStorage.clear();

    authServiceSpy = { logout: vi.fn() };
    toastServiceSpy = { showWarning: vi.fn() };
    routerSpy = { navigate: vi.fn() };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([jwtInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy },
        { provide: Router, useValue: routerSpy }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe agregar el header Authorization Bearer si existe un token', () => {
    localStorage.setItem('token', 'my-test-jwt');

    httpClient.get('/api/test-data').subscribe();

    const req = httpMock.expectOne('/api/test-data');
    expect(req.request.headers.has('Authorization')).toBe(true);
    expect(req.request.headers.get('Authorization')).toBe('Bearer my-test-jwt');
    req.flush({});
  });

  it('no debe agregar el header Authorization si no hay token', () => {
    httpClient.get('/api/test-data').subscribe();

    const req = httpMock.expectOne('/api/test-data');
    expect(req.request.headers.has('Authorization')).toBe(false);
    req.flush({});
  });

  it('debe manejar 401 llamando a logout y redirigiendo a /login si había token guardado', () => {
    localStorage.setItem('token', 'expired-token');

    httpClient.get('/api/protected').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/protected');
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Tu sesión ha expirado. Inicia sesión de nuevo.');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('no debe forzar logout en 401 si no existía token previo (ej. credenciales inválidas en login)', () => {
    httpClient.get('/api/auth/login').subscribe({
      error: (err) => {
        expect(err.status).toBe(401);
      }
    });

    const req = httpMock.expectOne('/api/auth/login');
    req.flush('Invalid credentials', { status: 401, statusText: 'Unauthorized' });

    expect(authServiceSpy.logout).not.toHaveBeenCalled();
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });
});
