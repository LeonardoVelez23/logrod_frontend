import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { LoginComponent } from './login.component';
import { MainLayout } from '../main-layout/main-layout.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('LoginComponent', () => {
  let component: LoginComponent;
  let fixture: ComponentFixture<LoginComponent>;
  let authServiceSpy: any;
  let toastServiceSpy: any;
  let router: Router;

  beforeEach(async () => {
    authServiceSpy = {
      login: vi.fn(),
      register: vi.fn()
    };
    toastServiceSpy = {
      showSuccess: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    fixture.detectChanges();
  });

  it('debe crearse e iniciar en modo login por defecto', () => {
    expect(component).toBeTruthy();
    expect(component.isLoginMode()).toBe(true);
  });

  it('toggleMode debe cambiar entre login y registro y limpiar mensajes de error', () => {
    component.errorMessage.set('Error previo');
    component.toggleMode(false);
    expect(component.isLoginMode()).toBe(false);
    expect(component.errorMessage()).toBeNull();
  });

  it('togglePasswordVisibility debe alternar la visibilidad de la contraseña', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
  });

  it('onLoginSubmit debe redirigir a /catalog si el rol es cliente y actualizar el rol global', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    authServiceSpy.login.mockReturnValue(of({ success: true, user: { rol: 'cliente' } }));

    component.loginData = { email: 'client@test.com', password: '123' };
    component.onLoginSubmit();

    expect(authServiceSpy.login).toHaveBeenCalledWith({ email: 'client@test.com', password: '123' });
    expect(navigateSpy).toHaveBeenCalledWith(['/catalog']);
    expect(MainLayout.userRole()).toBe('cliente');
  });

  it('onLoginSubmit debe redirigir a /admin/orders si el rol es mesero o cocinero', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    authServiceSpy.login.mockReturnValue(of({ success: true, user: { rol: 'mesero' } }));

    component.onLoginSubmit();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/orders']);
  });

  it('onLoginSubmit debe redirigir a /admin/dashboard si el rol es admin u otro', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    authServiceSpy.login.mockReturnValue(of({ success: true, user: { rol: 'admin' } }));

    component.onLoginSubmit();
    expect(navigateSpy).toHaveBeenCalledWith(['/admin/dashboard']);
  });

  it('onLoginSubmit debe capturar errores y setear errorMessage en fallo', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: { message: 'Credenciales inválidas' } })));

    component.onLoginSubmit();
    expect(component.errorMessage()).toBe('Credenciales inválidas');
  });

  it('onLoginSubmit debe usar un mensaje por defecto cuando el error no trae mensaje', () => {
    authServiceSpy.login.mockReturnValue(throwError(() => ({ error: {} })));

    component.onLoginSubmit();
    expect(component.errorMessage()).toBe('Error al iniciar sesión. Verifique sus credenciales.');
  });

  it('onLoginSubmit no debe navegar si la respuesta indica success: false', () => {
    const navigateSpy = vi.spyOn(router, 'navigate');
    authServiceSpy.login.mockReturnValue(of({ success: false, user: null }));

    component.onLoginSubmit();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('validatePassword debe verificar longitud, mayúsculas, números y caracteres especiales', () => {
    expect(component.validatePassword('short').isValid).toBe(false);
    expect(component.validatePassword('alllowercase1!').isValid).toBe(false);
    expect(component.validatePassword('NoNumbers!').isValid).toBe(false);
    expect(component.validatePassword('NoSpecial123').isValid).toBe(false);
    expect(component.validatePassword('ValidPass1!').isValid).toBe(true);
  });

  it('checklist en tiempo real para registro debe evaluar correctamente', () => {
    component.registerData.contrasenia = 'Valid123!';
    component.registerData.confirmarContrasenia = 'Valid123!';

    expect(component.pwdHasMinLength()).toBe(true);
    expect(component.pwdHasUppercase()).toBe(true);
    expect(component.pwdHasNumber()).toBe(true);
    expect(component.pwdHasSpecialChar()).toBe(true);
    expect(component.pwdMatch()).toBe(true);
  });

  it('pwdMatch debe ser falso si alguna de las contraseñas está vacía', () => {
    component.registerData.contrasenia = '';
    component.registerData.confirmarContrasenia = '';
    expect(component.pwdMatch()).toBe(false);

    component.registerData.contrasenia = 'Valid123!';
    component.registerData.confirmarContrasenia = '';
    expect(component.pwdMatch()).toBe(false);
  });

  it('onRegisterSubmit debe fallar si las contraseñas no coinciden', () => {
    component.registerData.contrasenia = 'Valid123!';
    component.registerData.confirmarContrasenia = 'Different123!';

    component.onRegisterSubmit();
    expect(component.errorMessage()).toBe('Las contraseñas no coinciden.');
  });

  it('onRegisterSubmit debe rechazar contraseñas débiles sin llamar al backend', () => {
    component.registerData.contrasenia = 'weak';
    component.registerData.confirmarContrasenia = 'weak';

    component.onRegisterSubmit();

    expect(component.errorMessage()).toBe('La contraseña debe tener al menos 8 caracteres.');
    expect(authServiceSpy.register).not.toHaveBeenCalled();
  });

  it('onRegisterSubmit debe capturar errores del backend y setear errorMessage', () => {
    component.registerData.contrasenia = 'Valid123!';
    component.registerData.confirmarContrasenia = 'Valid123!';
    authServiceSpy.register.mockReturnValue(throwError(() => ({ error: { message: 'Correo ya registrado' } })));

    component.onRegisterSubmit();

    expect(component.errorMessage()).toBe('Correo ya registrado');
  });

  it('onRegisterSubmit debe usar un mensaje por defecto cuando el error no trae mensaje', () => {
    component.registerData.contrasenia = 'Valid123!';
    component.registerData.confirmarContrasenia = 'Valid123!';
    authServiceSpy.register.mockReturnValue(throwError(() => ({ error: {} })));

    component.onRegisterSubmit();

    expect(component.errorMessage()).toBe('Error al registrar la cuenta. Intente nuevamente.');
  });

  it('onRegisterSubmit debe enviar registro y cambiar a modo login al tener éxito', () => {
    component.registerData = {
      identificacion: '1234567890',
      nombres: 'Pedro',
      apellidos: 'Ramírez',
      correo_electronico: 'pedro@test.com',
      telefono: '0999999999',
      contrasenia: 'Valid123!',
      confirmarContrasenia: 'Valid123!',
      tipo_cliente: 'cliente'
    };

    authServiceSpy.register.mockReturnValue(of({ success: true }));

    component.onRegisterSubmit();

    expect(authServiceSpy.register).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();
    expect(component.isLoginMode()).toBe(true);
    expect(component.loginData.email).toBe('pedro@test.com');
  });
});
