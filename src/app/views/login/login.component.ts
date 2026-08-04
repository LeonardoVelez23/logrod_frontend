import { Component, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MainLayout } from '../main-layout/main-layout.component';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  private authService = inject(AuthService);
  private router = inject(Router);
  private toastService = inject(ToastService);


  // Controlar el cambio de pestaña (Login / Registro)
  isLoginMode = signal(true);
  
  // Controlar la visibilidad de la contraseña
  showPassword = signal(false);

  // Almacenar mensajes de error de la API
  errorMessage = signal<string | null>(null);

  // Modelo de datos para iniciar sesión
  loginData = {
    email: '',
    password: ''
  };

  // Modelo de datos para crear cuenta de cliente
  registerData = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    contrasenia: '',
    confirmarContrasenia: '',
    tipo_cliente: 'cliente' // Por defecto (compatible con ENUM de base de datos)
  };

  // Alternar entre login y registro
  toggleMode(login: boolean) {
    this.isLoginMode.set(login);
    this.errorMessage.set(null); // Limpiar errores al cambiar
  }

  // Alternar visualización del campo de contraseña
  togglePasswordVisibility() {
    this.showPassword.update(val => !val);
  }

  // Enviar formulario de inicio de sesión al backend
  onLoginSubmit() {
    this.errorMessage.set(null);

    this.authService.login(this.loginData).subscribe({
      next: (response) => {
        if (response.success) {
          // Asignar el rol global en el MainLayout para la barra de navegación
          MainLayout.userRole.set(response.user.rol);
          
          // Redirigir según el rol del usuario de la base de datos
          if (response.user.rol === 'cliente') {
            this.router.navigate(['/catalog']);
          } else if (response.user.rol === 'mesero' || response.user.rol === 'cocinero') {
            // El mesero y el cocinero no tienen acceso al Dashboard, su vista principal es Gestión de Pedidos
            this.router.navigate(['/admin/orders']);
          } else {
            this.router.navigate(['/admin/dashboard']);
          }
        }
      },
      error: (err) => {
        console.error('Error de login:', err);
        this.errorMessage.set(
          err.error?.message || 'Error al iniciar sesión. Verifique sus credenciales.'
        );
      }
    });
  }

  // Validar requisitos de contraseña (mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial)
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

  // Enviar formulario de registro de cliente al backend
  onRegisterSubmit() {
    this.errorMessage.set(null);

    // Validar fortaleza de la contraseña
    const passwordCheck = this.validatePassword(this.registerData.contrasenia);
    if (!passwordCheck.isValid) {
      this.errorMessage.set(passwordCheck.message!);
      return;
    }

    // Validar que las contraseñas coincidan antes de enviar
    if (this.registerData.contrasenia !== this.registerData.confirmarContrasenia) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    // Desestructurar para omitir confirmarContrasenia
    const { confirmarContrasenia, ...clientPayload } = this.registerData;

    this.authService.register(clientPayload).subscribe({
      next: (response) => {
        if (response.success) {
          this.toastService.showSuccess('¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.');
          this.isLoginMode.set(true);
          this.loginData.email = this.registerData.correo_electronico;
          this.errorMessage.set(null);
        }
      },
      error: (err) => {
        console.error('Error de registro:', err);
        this.errorMessage.set(
          err.error?.message || 'Error al registrar la cuenta. Intente nuevamente.'
        );
      }
    });
  }
}
export { LoginComponent as Login };
