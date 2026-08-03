import { Component, signal, WritableSignal, inject } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { ToastComponent } from '../../components/toast/toast.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule, ToastComponent],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})

export class MainLayoutComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  // WritableSignal estático heredado del maquetado para compatibilidad y enrutamiento
  public static userRole: WritableSignal<'cliente' | 'empleado' | 'admin'> = signal('cliente');
  
  constructor() {
    // Sincronizar el rol del servicio de autenticación con el rol del layout al iniciar
    const role = this.authService.getCurrentRole();
    if (role) {
      MainLayoutComponent.userRole.set(role);
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


  // Cerrar sesión limpiando el almacenamiento local
  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
export { MainLayoutComponent as MainLayout };
