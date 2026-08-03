import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Función auxiliar para decodificar la carga útil (payload) del JWT de forma segura en Angular (evitando fallos de SSR)
function decodeToken(token: string): any {
  try {
    if (typeof window === 'undefined') return null;
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

// Auth Guard: Verifica si el usuario ha iniciado sesión
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token) {
    return true;
  }

  // Redirigir al login si no está autenticado
  router.navigate(['/login']);
  return false;
};

// Role Guard: Verifica si el usuario tiene uno de los roles permitidos
export const roleGuard: (allowedRoles: string[]) => CanActivateFn = (allowedRoles) => {
  return (route, state) => {
    const router = inject(Router);
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

    if (!token) {
      router.navigate(['/login']);
      return false;
    }

    const decoded = decodeToken(token);
    const userRole = decoded?.rol;

    if (userRole && allowedRoles.includes(userRole)) {
      return true;
    }

    // Redirigir a la vista correspondiente si no está autorizado
    alert('No tienes permisos para acceder a esta sección.');
    if (userRole === 'mesero' || userRole === 'cocinero') {
      router.navigate(['/admin/orders']);
    } else if (userRole === 'cliente') {
      router.navigate(['/catalog']);
    } else {
      router.navigate(['/admin/dashboard']);
    }
    return false;
  };
};
