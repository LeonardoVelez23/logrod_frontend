import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
  styleUrl: '../login/login.component.css'
})
export class ForgotPasswordComponent {
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  // Paso actual: 1 = ingresar correo, 2 = ingresar OTP + nueva contraseña, 3 = éxito
  step = signal<1 | 2 | 3>(1);

  // Datos del formulario
  email = signal<string>('');
  otp = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  showPassword = signal<boolean>(false);

  isLoading = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  // ─── Checklist de contraseña ───────────────────────────────
  pwdHasMinLength(): boolean { return this.newPassword().length >= 8; }
  pwdHasUppercase(): boolean { return /[A-Z]/.test(this.newPassword()); }
  pwdHasNumber(): boolean    { return /[0-9]/.test(this.newPassword()); }
  pwdHasSpecial(): boolean   { return /[^A-Za-z0-9]/.test(this.newPassword()); }
  pwdMatch(): boolean {
    return this.newPassword().length > 0 &&
           this.confirmPassword().length > 0 &&
           this.newPassword() === this.confirmPassword();
  }
  allValid(): boolean {
    return this.pwdHasMinLength() && this.pwdHasUppercase() &&
           this.pwdHasNumber() && this.pwdHasSpecial() && this.pwdMatch();
  }

  // ─── Paso 1: Enviar OTP al correo ──────────────────────────
  onSendOtp() {
    if (!this.email().trim()) return;
    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.forgotPassword(this.email().trim()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set(2);
        this.toastService.showSuccess('Código enviado. Revisa tu correo.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Error al enviar el código. Intenta de nuevo.');
      }
    });
  }

  // Reenviar OTP sin cambiar de paso
  onResendOtp() {
    this.otp.set('');
    this.errorMessage.set(null);
    this.isLoading.set(true);

    this.authService.forgotPassword(this.email().trim()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.toastService.showSuccess('Nuevo código enviado. Revisa tu correo.');
      },
      error: () => {
        this.isLoading.set(false);
        this.toastService.showSuccess('Código reenviado.'); // seguridad: no revelar
      }
    });
  }

  // ─── Paso 2: Verificar OTP y cambiar contraseña ────────────
  onResetPassword() {
    this.errorMessage.set(null);

    if (this.otp().trim().length !== 6) {
      this.errorMessage.set('El código debe tener exactamente 6 dígitos.');
      return;
    }
    if (!this.allValid()) {
      this.errorMessage.set('Completa todos los requisitos de la contraseña.');
      return;
    }

    this.isLoading.set(true);

    this.authService.resetPassword(this.email().trim(), this.otp().trim(), this.newPassword()).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.step.set(3);
        this.toastService.showSuccess('¡Contraseña restablecida con éxito!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(err.error?.message || 'Código incorrecto o expirado. Solicita uno nuevo.');
      }
    });
  }

  goBackToStep1() {
    this.step.set(1);
    this.otp.set('');
    this.newPassword.set('');
    this.confirmPassword.set('');
    this.errorMessage.set(null);
  }
}
export { ForgotPasswordComponent as ForgotPassword };
