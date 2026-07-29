import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Empleado {
  id: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  telefono?: string;
  cargo?: string;
  turno_trabajo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EmployeeService {
  private http = inject(HttpClient);

  getEmpleados(): Observable<{ success: boolean; data: Empleado[] }> {
    return this.http.get<{ success: boolean; data: Empleado[] }>(`${API_BASE_URL}/empleados`);
  }

  getEmpleadoById(id: number): Observable<{ success: boolean; data: Empleado }> {
    return this.http.get<{ success: boolean; data: Empleado }>(`${API_BASE_URL}/empleados/${id}`);
  }
}
