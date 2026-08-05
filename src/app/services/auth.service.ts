import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { API_BASE_URL } from '../config/api.config';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private http = inject(HttpClient);
  
  // WritableSignal para rastrear los detalles del usuario logueado actualmente
  public currentUser: WritableSignal<any> = signal(null);

  constructor() {
    this.loadUserFromStorage();
  }

  // Restaurar de forma segura los detalles del usuario desde localStorage (evitando fallos de SSR)
  private loadUserFromStorage() {
    if (typeof window !== 'undefined') {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        try {
          this.currentUser.set(JSON.parse(userStr));
        } catch (e) {
          localStorage.removeItem('user');
        }
      }
    }
  }

  // Llamar al endpoint de login del backend y guardar las credenciales
  login(credentials: { email: string; password: string }): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/auth/login`, credentials).pipe(
      tap(response => {
        if (response.success && response.token) {
          if (typeof window !== 'undefined') {
            localStorage.setItem('token', response.token);
            localStorage.setItem('user', JSON.stringify(response.user));
          }
          this.currentUser.set(response.user);
        }
      })
    );
  }

  // Llamar al endpoint del backend para registrar un nuevo cliente
  register(clientData: any): Observable<any> {
    return this.http.post<any>(`${API_BASE_URL}/clientes`, clientData);
  }

  // Solicitar enlace de recuperación de contraseña por correo
  forgotPassword(email: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/forgot-password`, { email });
  }

  // Restablecer contraseña con el OTP recibido por correo
  resetPassword(email: string, otp: string, newPassword: string): Observable<{ success: boolean; message: string }> {
    return this.http.post<{ success: boolean; message: string }>(`${API_BASE_URL}/auth/reset-password`, { email, otp, newPassword });
  }

  // Limpiar credenciales y cerrar sesión
  logout() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    }
    this.currentUser.set(null);
  }

  // Verificar si el usuario está actualmente autenticado
  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem('token');
  }

  // Actualizar datos del usuario actual en memoria y localStorage
  updateCurrentUser(updatedData: any) {
    if (typeof window !== 'undefined') {
      const current = this.currentUser();
      const newUserData = { ...current, ...updatedData };
      localStorage.setItem('user', JSON.stringify(newUserData));
      this.currentUser.set(newUserData);
    }
  }

  // Obtener el rol del usuario actual
  getCurrentRole(): 'cliente' | 'empleado' | 'mesero' | 'cajero' | 'cocinero' | 'admin' | null {
    const user = this.currentUser();
    return user ? user.rol : null;
  }
}

