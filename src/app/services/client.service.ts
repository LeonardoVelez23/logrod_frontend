import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Cliente {
  id: number;
  identificacion: string;
  nombres: string;
  apellidos: string;
  correo_electronico: string;
  telefono?: string;
  tipo_cliente?: 'cliente' | 'empleado' | 'administrador';
  contrasenia?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  private http = inject(HttpClient);

  getClientes(): Observable<{ success: boolean; data: Cliente[] }> {
    return this.http.get<{ success: boolean; data: Cliente[] }>(`${API_BASE_URL}/clientes`);
  }

  getClienteById(id: number): Observable<{ success: boolean; data: Cliente }> {
    return this.http.get<{ success: boolean; data: Cliente }>(`${API_BASE_URL}/clientes/${id}`);
  }

  createCliente(cliente: Omit<Cliente, 'id'>): Observable<{ success: boolean; message: string; data: Cliente }> {
    return this.http.post<{ success: boolean; message: string; data: Cliente }>(
      `${API_BASE_URL}/clientes`,
      cliente
    );
  }

  updateCliente(id: number, cliente: Partial<Cliente>): Observable<{ success: boolean; message: string; data: Cliente }> {
    return this.http.put<{ success: boolean; message: string; data: Cliente }>(
      `${API_BASE_URL}/clientes/${id}`,
      cliente
    );
  }

  deleteCliente(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${API_BASE_URL}/clientes/${id}`);
  }
}
