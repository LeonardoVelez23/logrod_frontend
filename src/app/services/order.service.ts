import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { Cliente } from './client.service';
import { Empleado } from './employee.service';

export interface DetallePedido {
  id?: number;
  pedido_id?: number;
  producto_id: number;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  producto?: {
    id: number;
    codigo: string;
    nombre: string;
    precio: number;
  };
}

export interface Pedido {
  id?: number;
  fecha: string;
  hora: string;
  modalidad: 'presencial' | 'en línea';
  estado: 'solicitado' | 'confirmado' | 'en preparación' | 'listo' | 'entregado' | 'cancelado';
  valor_total: number;
  cliente_id: number;
  empleado_id?: number | null;
  empleado_preparacion_id?: number | null;
  cliente?: Cliente;
  empleadoResponsable?: Empleado | null;
  empleadoPreparacion?: Empleado | null;
  detalles: DetallePedido[];
  createdAt?: string;
  updatedAt?: string;
  metodo_pago?: 'efectivo' | 'tarjeta' | 'transferencia' | null;
  numero_referencia?: string | null;
}


@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private http = inject(HttpClient);

  getPedidos(): Observable<{ success: boolean; data: Pedido[] }> {
    return this.http.get<{ success: boolean; data: Pedido[] }>(`${API_BASE_URL}/pedidos`);
  }

  getPedidoById(id: number): Observable<{ success: boolean; data: Pedido }> {
    return this.http.get<{ success: boolean; data: Pedido }>(`${API_BASE_URL}/pedidos/${id}`);
  }

  createPedido(pedido: Omit<Pedido, 'id'>): Observable<{ success: boolean; message: string; data: Pedido }> {
    return this.http.post<{ success: boolean; message: string; data: Pedido }>(`${API_BASE_URL}/pedidos`, pedido);
  }

  updatePedido(id: number, data: { estado?: string; empleado_id?: number | null; empleado_preparacion_id?: number | null; modalidad?: string }): Observable<{ success: boolean; message: string; data: Pedido }> {
    return this.http.put<{ success: boolean; message: string; data: Pedido }>(`${API_BASE_URL}/pedidos/${id}`, data);
  }

  deletePedido(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${API_BASE_URL}/pedidos/${id}`);
  }
}
