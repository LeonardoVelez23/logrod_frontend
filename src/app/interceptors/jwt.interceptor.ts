import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';
import { ToastService } from '../services/toast.service';

export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const toastService = inject(ToastService);

  // Check if we are running in the browser before accessing localStorage (prevents SSR errors)
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const cloned = token
    ? req.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
    : req;

  return next(cloned).pipe(
    catchError((error: HttpErrorResponse) => {
      // Solo tratamos como "sesión expirada" si veníamos con un token adjunto
      // (evita disparar esto en el propio login con credenciales inválidas)
      if (error.status === 401 && token) {
        authService.logout();
        toastService.showWarning('Tu sesión ha expirado. Inicia sesión de nuevo.');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
