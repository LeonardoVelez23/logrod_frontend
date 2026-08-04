import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { describe, beforeEach, afterEach, it, expect, vi } from 'vitest';
import { MainLayoutComponent } from './main-layout.component';
import { AuthService } from '../../services/auth.service';

describe('MainLayoutComponent', () => {
  let component: MainLayoutComponent;
  let fixture: ComponentFixture<MainLayoutComponent>;
  let authServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    localStorage.clear();
    authServiceSpy = {
      getCurrentRole: vi.fn().mockReturnValue('admin'),
      currentUser: vi.fn().mockReturnValue({ nombres: 'Juan', apellidos: 'Pérez', email: 'juan@test.com' }),
      logout: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [MainLayoutComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(MainLayoutComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  afterEach(() => {
    localStorage.clear();
  });

  it('debe crearse e inicializar el rol desde AuthService', () => {
    expect(component).toBeTruthy();
    expect(component.currentRole).toBe('admin');
  });

  it('userInitials debe calcular las iniciales del usuario actual', () => {
    expect(component.userInitials).toBe('JP');
  });

  it('userInitials debe retornar "U" si no hay nombres ni apellidos', () => {
    authServiceSpy.currentUser.mockReturnValue(null);
    expect(component.userInitials).toBe('U');
  });

  it('panelTitle debe retornar la etiqueta legible según el rol', () => {
    MainLayoutComponent.userRole.set('admin');
    expect(component.panelTitle).toBe('Admin');

    MainLayoutComponent.userRole.set('mesero');
    expect(component.panelTitle).toBe('Mesero');

    MainLayoutComponent.userRole.set('cliente');
    expect(component.panelTitle).toBe('Empleado');
  });

  it('toggleSidebar debe alternar el estado de colapso y guardarlo en localStorage', () => {
    expect(component.sidebarCollapsed()).toBe(false);
    component.toggleSidebar();
    expect(component.sidebarCollapsed()).toBe(true);
    expect(localStorage.getItem('sidebarCollapsed')).toBe('true');
  });

  it('logout debe llamar a authService.logout y navegar a /login', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    component.logout();

    expect(authServiceSpy.logout).toHaveBeenCalled();
    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  });
});
