import { Component, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
  styleUrl: '../login/login.component.css'
})
export class ResetPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);

  token = signal<string>('');
  newPassword = signal<string>('');
  confirmPassword = signal<string>('');
  showPassword = signal<boolean>(false);

  isLoading = signal<boolean>(false);
  isSuccess = signal<boolean>(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    this.route.queryParams.subscribe(params => {
      if (params['token']) {
        this.token.set(params['token']);
      } else {
        this.errorMessage.set('El enlace de restablecimiento es inválido o faltan parámetros.');
      }
    });
  }

  togglePasswordVisibility() {
    this.showPassword.update(v => !v);
  }

  validatePassword(password: string): { isValid: boolean; message?: string } {
    if (password.length < 8) {
      return { isValid: false, message: 'La contraseña debe tener al menos 8 caracteres.' };
    }
    if (!/[A-Z]/.test(password)) {
      return { isValid: false, message: 'La contraseña debe incluir al menos una letra mayúscula.' };
    }
    if (!/[0-9]/.test(password)) {
      return { isValid: false, message: 'La contraseña debe incluir al menos un número.' };
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      return { isValid: false, message: 'La contraseña debe incluir al menos un carácter especial (ej: @, #, $, !, %).' };
    }
    return { isValid: true };
  }

  onSubmit() {
    if (!this.token()) {
      this.errorMessage.set('Token no encontrado en la dirección URL.');
      return;
    }

    const passwordCheck = this.validatePassword(this.newPassword());
    if (!passwordCheck.isValid) {
      this.errorMessage.set(passwordCheck.message!);
      return;
    }

    if (this.newPassword() !== this.confirmPassword()) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set(null);

    this.authService.resetPassword(this.token(), this.newPassword()).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.toastService.showSuccess('¡Contraseña restablecida con éxito!');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          err.error?.message || 'Error al restablecer la contraseña. El enlace puede haber expirado.'
        );
      }
    });
  }
}
export { ResetPasswordComponent as ResetPassword };
