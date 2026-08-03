import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Pago {
  id?: number;
  pedido_id: number;
  fecha: string;
  valor: number;
  metodo_pago: 'efectivo' | 'tarjeta' | 'transferencia';
  numero_referencia?: string | null;
  estado?: 'pendiente' | 'aprobado' | 'rechazado';
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PagoService {
  private http = inject(HttpClient);

  // Registrar un nuevo pago en el sistema
  createPago(pago: Pago): Observable<{ success: boolean; message: string; data: Pago }> {
    return this.http.post<{ success: boolean; message: string; data: Pago }>(`${API_BASE_URL}/pagos`, pago);
  }

  // Obtener la información del pago de un pedido específico
  getPagoByPedido(pedidoId: number): Observable<{ success: boolean; data: Pago }> {
    return this.http.get<{ success: boolean; data: Pago }>(`${API_BASE_URL}/pagos/pedido/${pedidoId}`);
  }
}
