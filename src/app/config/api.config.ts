import { isDevMode } from '@angular/core';

// Si la aplicación se está ejecutando localmente (desarrollo), apunta al localhost.
// Si se compila para producción (despliegue final), se utilizará la URL pública de Railway.
export const API_BASE_URL = isDevMode()
  ? 'http://localhost:3000/api/v1'
  : 'https://logrodbackend-production.up.railway.app/api/v1';
