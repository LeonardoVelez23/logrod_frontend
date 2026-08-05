import { Component, signal, WritableSignal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ClientService } from '../../services/client.service';
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

  profileForm = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    tipo_cliente: 'Estudiante' as 'Estudiante' | 'Docente' | 'Personal Administrativo' | 'Persona externa',
    contraseniaActual: '',
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
      contraseniaActual: '',
      nuevaContrasenia: '',
      confirmarContrasenia: ''
    };

    this.activeProfileTab = 'datos';
    this.showProfileModal = true;
  }

  // Cerrar Modal de Perfil
  closeProfileModal() {
    this.showProfileModal = false;
    this.savingProfile = false;
    this.profileForm.contraseniaActual = '';
    this.profileForm.nuevaContrasenia = '';
    this.profileForm.confirmarContrasenia = '';
  }

  // Guardar cambios en el Perfil del Cliente
  onSubmitProfile() {
    const user = this.currentUser;
    if (!user || !user.id) return;

    // Si está intentando cambiar contraseña
    if (this.profileForm.nuevaContrasenia || this.profileForm.confirmarContrasenia) {
      if (this.profileForm.nuevaContrasenia !== this.profileForm.confirmarContrasenia) {
        this.toastService.showError('Las nuevas contraseñas no coinciden.');
        return;
      }
      if (this.profileForm.nuevaContrasenia.length < 6) {
        this.toastService.showError('La nueva contraseña debe tener al menos 6 caracteres.');
        return;
      }
    }

    this.savingProfile = true;

    const payload: any = {
      nombres: this.profileForm.nombres,
      apellidos: this.profileForm.apellidos,
      telefono: this.profileForm.telefono,
      tipo_cliente: this.profileForm.tipo_cliente
    };

    if (this.profileForm.nuevaContrasenia) {
      payload.contrasenia = this.profileForm.nuevaContrasenia;
    }

    // Actualizar en el Backend (si es cliente)
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
          console.error('Error actualizando perfil:', err);
          this.toastService.showError(err.error?.message || 'Error al actualizar el perfil.');
        }
      });
    } else {
      // Para roles administrativos/empleados
      this.savingProfile = false;
      this.authService.updateCurrentUser({
        nombres: this.profileForm.nombres,
        apellidos: this.profileForm.apellidos,
        telefono: this.profileForm.telefono
      });
      this.toastService.showSuccess('Perfil actualizado localmente.');
      this.closeProfileModal();
    }
  }

  // Cerrar sesión limpiando el almacenamiento local
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
export { MainLayoutComponent as MainLayout };

