import { Component, signal, WritableSignal } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, CommonModule, FormsModule],
  templateUrl: './main-layout.component.html',
  styleUrl: './main-layout.component.css'
})
export class MainLayoutComponent {
  // Signal to store current user role: 'cliente', 'empleado', 'admin'
  public static userRole: WritableSignal<'cliente' | 'empleado' | 'admin'> = signal('cliente');
  
  constructor(private router: Router) {}

  get currentRole() {
    return MainLayoutComponent.userRole();
  }

  setRole(role: 'cliente' | 'empleado' | 'admin') {
    MainLayoutComponent.userRole.set(role);
    if (role === 'cliente') {
      this.router.navigate(['/catalog']);
    } else {
      this.router.navigate(['/admin/dashboard']);
    }
  }

  logout() {
    this.router.navigate(['/login']);
  }
}
export { MainLayoutComponent as MainLayout };
