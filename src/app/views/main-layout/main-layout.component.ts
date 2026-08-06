import { Component, signal, WritableSignal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ClientService } from '../../services/client.service';
import { EmployeeService } from '../../services/employee.service';
import { ToastService } from '../../services/toast.service';
import { ToastComponent } from '../../components/toast/toast.component';
import { ModalComponent } from '../../components/modal/modal.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    ToastComponent,
    ModalComponent
  ],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})

export class MainLayoutComponent {
  private authService = inject(AuthService);
  private clientService = inject(ClientService);
  private employeeService = inject(EmployeeService);
  private toastService = inject(ToastService);
  private router = inject(Router);

  // WritableSignal estático heredado del maquetado para compatibilidad y enrutamiento
  public static userRole: WritableSignal<'cliente' | 'empleado' | 'mesero' | 'cajero' | 'cocinero' | 'admin'> = signal('cliente');

  // Estado de colapso del sidebar
  sidebarCollapsed: WritableSignal<boolean> = signal(false);

  // Estado del Modal "Mi Perfil"
  showProfileModal: boolean = false;
  savingProfile: boolean = false;
  activeProfileTab: 'datos' | 'seguridad' = 'datos';

  // Estado para verificación OTP al cambiar clave
  sendingOtp: boolean = false;
  otpSent: boolean = false;
  otpCode: string = '';

  profileForm = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    tipo_cliente: 'Estudiante' as 'Estudiante' | 'Docente' | 'Personal Administrativo' | 'Persona externa',
    nuevaContrasenia: '',
    confirmarContrasenia: ''
  };

  constructor() {
    // Sincronizar el rol del servicio de autenticación con el rol del layout al iniciar
    const role = this.authService.getCurrentRole();
    if (role) {
      MainLayoutComponent.userRole.set(role);
    }

    if (typeof window !== 'undefined') {
      this.sidebarCollapsed.set(localStorage.getItem('sidebarCollapsed') === 'true');
    }
  }

  // Alternar el sidebar entre expandido (iconos + texto) y colapsado (solo iconos)
  toggleSidebar() {
    const nuevoValor = !this.sidebarCollapsed();
    this.sidebarCollapsed.set(nuevoValor);
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarCollapsed', String(nuevoValor));
    }
  }

  // Obtener los datos del usuario logueado actualmente
  get currentUser() {
    return this.authService.currentUser();
  }

  // Obtener las iniciales del usuario para el avatar
  get userInitials(): string {
    const user = this.currentUser;
    if (!user) return 'U';
    const nombres = user.nombres || '';
    const apellidos = user.apellidos || '';
    const i1 = nombres[0] ? nombres[0].toUpperCase() : '';
    const i2 = apellidos[0] ? apellidos[0].toUpperCase() : '';
    return i1 + i2 || 'U';
  }

  // Obtener el rol actual para la visualización del menú
  get currentRole() {
    return MainLayoutComponent.userRole();
  }

  // Etiqueta legible del rol para el encabezado del sidebar
  get panelTitle(): string {
    const etiquetas: Record<string, string> = {
      admin: 'Admin',
      empleado: 'Empleado',
      mesero: 'Mesero',
      cajero: 'Cajero',
      cocinero: 'Cocinero'
    };
    return etiquetas[this.currentRole] || 'Empleado';
  }

  // Validaciones de contraseña
  pwdHasMinLength(): boolean {
    return (this.profileForm.nuevaContrasenia || '').length >= 8;
  }

  pwdHasUppercase(): boolean {
    return /[A-Z]/.test(this.profileForm.nuevaContrasenia || '');
  }

  pwdHasNumber(): boolean {
    return /[0-9]/.test(this.profileForm.nuevaContrasenia || '');
  }

  pwdHasSpecial(): boolean {
    return /[^A-Za-z0-9]/.test(this.profileForm.nuevaContrasenia || '');
  }

  pwdMatch(): boolean {
    return !!this.profileForm.nuevaContrasenia && this.profileForm.nuevaContrasenia === this.profileForm.confirmarContrasenia;
  }

  allPwdValid(): boolean {
    return this.pwdHasMinLength() && this.pwdHasUppercase() && this.pwdHasNumber() && this.pwdHasSpecial() && this.pwdMatch();
  }

  canSubmitPasswordChange(): boolean {
    return this.allPwdValid() && !!this.otpCode && this.otpCode.trim().length === 6;
  }

  // Enviar código OTP por correo electrónico al usuario autenticado
  sendOtpCode() {
    if (!this.profileForm.correo_electronico) return;
    this.sendingOtp = true;
    this.authService.forgotPassword(this.profileForm.correo_electronico).subscribe({
      next: () => {
        this.sendingOtp = false;
        this.otpSent = true;
        this.toastService.showSuccess('Código de verificación OTP enviado a tu correo electrónico.');
      },
      error: (err) => {
        this.sendingOtp = false;
        this.toastService.showError(err.error?.message || 'Error al enviar el código de verificación.');
      }
    });
  }

  // Abrir Modal de Mi Perfil con los datos del usuario logueado
  openProfileModal() {
    const user = this.currentUser;
    if (!user) return;

    this.profileForm = {
      identificacion: user.identificacion || '',
      nombres: user.nombres || '',
      apellidos: user.apellidos || '',
      correo_electronico: user.correo_electronico || '',
      telefono: user.telefono || '',
      tipo_cliente: user.tipo_cliente || 'Estudiante',
      nuevaContrasenia: '',
      confirmarContrasenia: ''
    };

    this.otpCode = '';
    this.otpSent = false;
    this.sendingOtp = false;
    this.activeProfileTab = 'datos';
    this.showProfileModal = true;
  }

  // Cerrar Modal de Perfil
  closeProfileModal() {
    this.showProfileModal = false;
    this.savingProfile = false;
    this.profileForm.nuevaContrasenia = '';
    this.profileForm.confirmarContrasenia = '';
    this.otpCode = '';
    this.otpSent = false;
    this.sendingOtp = false;
  }

  // Guardar cambios en el Perfil
  onSubmitProfile() {
    const user = this.currentUser;
    if (!user || !user.id) return;

    const isChangingPassword = !!(this.profileForm.nuevaContrasenia || this.profileForm.confirmarContrasenia);

    if (isChangingPassword) {
      if (!this.allPwdValid()) {
        this.toastService.showError('La nueva contraseña no cumple con todos los requisitos de seguridad.');
        return;
      }
      if (!this.otpSent) {
        this.toastService.showError('Primero debes hacer clic en "Enviar código al correo" para recibir tu código OTP.');
        return;
      }
      if (!this.otpCode || this.otpCode.trim().length !== 6) {
        this.toastService.showError('Debe ingresar el código OTP de 6 dígitos recibido en su correo.');
        return;
      }
    }

    this.savingProfile = true;

    const payload: any = {
      nombres: this.profileForm.nombres,
      apellidos: this.profileForm.apellidos,
      telefono: this.profileForm.telefono
    };

    if (this.currentRole === 'cliente') {
      payload.tipo_cliente = this.profileForm.tipo_cliente;
    }

    if (isChangingPassword) {
      payload.contrasenia = this.profileForm.nuevaContrasenia;
      payload.otp = this.otpCode.trim();
    }

    if (this.currentRole === 'cliente') {
      this.clientService.updateCliente(user.id, payload).subscribe({
        next: (response) => {
          this.savingProfile = false;
          if (response.success) {
            this.authService.updateCurrentUser({
              nombres: this.profileForm.nombres,
              apellidos: this.profileForm.apellidos,
              telefono: this.profileForm.telefono,
              tipo_cliente: this.profileForm.tipo_cliente
            });
            this.toastService.showSuccess('¡Perfil actualizado con éxito!');
            this.closeProfileModal();
          }
        },
        error: (err) => {
          this.savingProfile = false;
          console.error('Error actualizando perfil de cliente:', err);
          this.toastService.showError(err.error?.message || 'Error al actualizar el perfil.');
        }
      });
    } else {
      this.employeeService.updateEmpleado(user.id, payload).subscribe({
        next: (response) => {
          this.savingProfile = false;
          if (response.success) {
            this.authService.updateCurrentUser({
              nombres: this.profileForm.nombres,
              apellidos: this.profileForm.apellidos,
              telefono: this.profileForm.telefono
            });
            this.toastService.showSuccess('¡Perfil de empleado actualizado con éxito!');
            this.closeProfileModal();
          }
        },
        error: (err) => {
          this.savingProfile = false;
          console.error('Error actualizando perfil de empleado:', err);
          this.toastService.showError(err.error?.message || 'Error al actualizar el perfil.');
        }
      });
    }
  }

  // Cerrar sesión limpiando el almacenamiento local
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
export { MainLayoutComponent as MainLayout };

