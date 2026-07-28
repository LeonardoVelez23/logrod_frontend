import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MainLayout } from '../main-layout/main-layout.component';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent {
  // Toggle between Login and Register tabs
  isLoginMode = signal(true);
  
  // Toggle password visibility
  showPassword = signal(false);

  // Login form models (No role selection, detected by backend)
  loginData = {
    email: '',
    password: ''
  };

  // Register form models
  registerData = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    contrasenia: '',
    confirmarContrasenia: ''
  };

  constructor(private router: Router) {}

  toggleMode(login: boolean) {
    this.isLoginMode.set(login);
  }

  togglePasswordVisibility() {
    this.showPassword.update(val => !val);
  }

  onLoginSubmit() {
    console.log('Iniciando sesión...', this.loginData);
    
    // Default role simulation (backend will detect role based on credentials)
    MainLayout.userRole.set('cliente');
    this.router.navigate(['/catalog']);
  }

  onRegisterSubmit() {
    console.log('Registrando usuario...', this.registerData);
    
    alert('¡Registro exitoso! Ahora puedes iniciar sesión con tus credenciales.');
    this.isLoginMode.set(true);
    this.loginData.email = this.registerData.correo_electronico;
  }
}
export { LoginComponent as Login };
