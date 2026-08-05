import { TestBed } from '@angular/core/testing';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { vi, describe, beforeEach, it, expect } from 'vitest';
import { authGuard, roleGuard } from './auth.guard';

describe('authGuard', () => {
  let routerSpy = { navigate: vi.fn() };

  beforeEach(() => {
    // Limpiar localStorage
    localStorage.clear();
    
    // Configurar TestBed con el Router mockeado
    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });

    routerSpy.navigate.mockClear();
  });

  it('should allow activation when token is present (CP-01)', () => {
    // Simular que existe un token en localStorage
    localStorage.setItem('token', 'fake-valid-jwt-token');

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should block activation and redirect to login when token is absent (CP-02)', () => {
    // Asegurar que no hay token
    localStorage.removeItem('token');

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('roleGuard', () => {
  let routerSpy = { navigate: vi.fn() };
  let alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});

  beforeEach(() => {
    localStorage.clear();
    routerSpy.navigate.mockClear();
    alertSpy.mockClear();

    TestBed.configureTestingModule({
      providers: [
        { provide: Router, useValue: routerSpy }
      ]
    });
  });

  // Utilidad para crear un token JWT simulado con la firma base64 correcta para el payload
  const createMockToken = (payloadObj: object) => {
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify(payloadObj));
    const signature = 'fake-signature';
    return `${header}.${payload}.${signature}`;
  };

  it('should allow activation when user role is allowed', () => {
    const mockToken = createMockToken({ rol: 'admin' });
    localStorage.setItem('token', mockToken);

    // Creamos la función guard para el rol 'admin'
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(true);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('should block activation, alert, and redirect to catalog when user role is not allowed', () => {
    const mockToken = createMockToken({ rol: 'cliente' });
    localStorage.setItem('token', mockToken);

    // Creamos la función guard para el rol 'admin' (el usuario es cliente)
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(alertSpy).toHaveBeenCalledWith('No tienes permisos para acceder a esta sección.');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/catalog']);
  });

  it('should block activation and redirect to login when token is absent', () => {
    localStorage.removeItem('token');
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('should redirect mesero/cocinero to /admin/orders when role is not allowed', () => {
    const mockToken = createMockToken({ rol: 'mesero' });
    localStorage.setItem('token', mockToken);
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/orders']);
  });

  it('should redirect to /admin/dashboard for other internal roles when role is not allowed', () => {
    const mockToken = createMockToken({ rol: 'cajero' });
    localStorage.setItem('token', mockToken);
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('should redirect to /admin/dashboard when the token cannot be decoded', () => {
    localStorage.setItem('token', 'token-malformado-no-jwt');
    const guard = roleGuard(['admin']);

    const result = TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot)
    );

    expect(result).toBe(false);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin/dashboard']);
  });
});
