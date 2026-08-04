import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ForgotPasswordComponent } from './forgot-password.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

describe('ForgotPasswordComponent', () => {
  let component: ForgotPasswordComponent;
  let fixture: ComponentFixture<ForgotPasswordComponent>;
  let authServiceSpy: any;
  let toastServiceSpy: any;

  beforeEach(async () => {
    authServiceSpy = {
      forgotPassword: vi.fn(),
      resetPassword: vi.fn()
    };
    toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ForgotPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ForgotPasswordComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse e iniciar en el Paso 1', () => {
    expect(component).toBeTruthy();
    expect(component.step()).toBe(1);
  });

  it('togglePasswordVisibility debe alternar el estado del signal showPassword', () => {
    expect(component.showPassword()).toBe(false);
    component.togglePasswordVisibility();
    expect(component.showPassword()).toBe(true);
  });

  it('checklist de contraseña (allValid) debe evaluar los requisitos correctamente', () => {
    component.newPassword.set('Pass123!');
    component.confirmPassword.set('Pass123!');

    expect(component.pwdHasMinLength()).toBe(true);
    expect(component.pwdHasUppercase()).toBe(true);
    expect(component.pwdHasNumber()).toBe(true);
    expect(component.pwdHasSpecial()).toBe(true);
    expect(component.pwdMatch()).toBe(true);
    expect(component.allValid()).toBe(true);
  });

  it('allValid() debe retornar false si las contraseñas no coinciden', () => {
    component.newPassword.set('Pass123!');
    component.confirmPassword.set('Pass1234');
    expect(component.allValid()).toBe(false);
  });

  it('onSendOtp debe avanzar al Paso 2 cuando el envío es exitoso', () => {
    component.email.set('test@domain.com');
    authServiceSpy.forgotPassword.mockReturnValue(of({ success: true }));

    component.onSendOtp();

    expect(authServiceSpy.forgotPassword).toHaveBeenCalledWith('test@domain.com');
    expect(component.step()).toBe(2);
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('Código enviado. Revisa tu correo.');
  });

  it('onSendOtp debe mostrar mensaje de error si falla la petición', () => {
    component.email.set('test@domain.com');
    authServiceSpy.forgotPassword.mockReturnValue(throwError(() => ({ error: { message: 'Correo no registrado' } })));

    component.onSendOtp();

    expect(component.step()).toBe(1);
    expect(component.errorMessage()).toBe('Correo no registrado');
  });

  it('onResetPassword debe validar longitud del OTP (6 dígitos)', () => {
    component.email.set('test@domain.com');
    component.otp.set('123'); // Solo 3 dígitos
    component.newPassword.set('Pass123!');
    component.confirmPassword.set('Pass123!');

    component.onResetPassword();

    expect(component.errorMessage()).toBe('El código debe tener exactamente 6 dígitos.');
  });

  it('onResetPassword debe validar que todos los requisitos de contraseña se cumplan', () => {
    component.email.set('test@domain.com');
    component.otp.set('123456');
    component.newPassword.set('simple'); // No cumple mayúscula, número, especial
    component.confirmPassword.set('simple');

    component.onResetPassword();

    expect(component.errorMessage()).toBe('Completa todos los requisitos de la contraseña.');
  });

  it('onResetPassword debe avanzar al Paso 3 en éxito', () => {
    component.email.set('test@domain.com');
    component.otp.set('123456');
    component.newPassword.set('Pass123!');
    component.confirmPassword.set('Pass123!');

    authServiceSpy.resetPassword.mockReturnValue(of({ success: true }));

    component.onResetPassword();

    expect(authServiceSpy.resetPassword).toHaveBeenCalledWith('test@domain.com', '123456', 'Pass123!');
    expect(component.step()).toBe(3);
    expect(toastServiceSpy.showSuccess).toHaveBeenCalledWith('¡Contraseña restablecida con éxito!');
  });

  it('goBackToStep1 debe reiniciar los campos y volver al Paso 1', () => {
    component.step.set(2);
    component.otp.set('123456');
    component.newPassword.set('Pass123!');

    component.goBackToStep1();

    expect(component.step()).toBe(1);
    expect(component.otp()).toBe('');
    expect(component.newPassword()).toBe('');
    expect(component.errorMessage()).toBeNull();
  });
});
