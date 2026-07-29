import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

// Helper to decode JWT payload safely in Angular (including SSR checks)
function decodeToken(token: string): any {
  try {
    if (typeof window === 'undefined') return null;
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload));
  } catch (e) {
    return null;
  }
}

// Auth Guard: Verifies the user is logged in
export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  if (token) {
    return true;
  }

  // Redirect to login if not authenticated
  router.navigate(['/login']);
  return false;
};

// Role Guard: Verifies the user has one of the allowed roles
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

    // Redirect to home/catalog if unauthorized
    alert('No tienes permisos para acceder a esta sección.');
    router.navigate(['/catalog']);
    return false;
  };
};
