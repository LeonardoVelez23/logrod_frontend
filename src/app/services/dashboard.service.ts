import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

// Interfaz para representar la estructura de los datos estadísticos del dashboard
export interface DashboardStats {
  totalOrders: number;
  totalRevenue: number;
  totalClients: number;
  orderStatusDistribution: {
    solicitado: number;
    confirmado: number;
    'en preparación': number;
    listo: number;
    entregado: number;
    cancelado: number;
  };
  modalityDistribution: {
    presencial: number;
    'en línea': number;
  };
  popularProducts: Array<{
    id: number;
    nombre: string;
    precio: number;
    totalVendido: number;
  }>;

}

@Injectable({
  providedIn: 'root'
})
export class DashboardService {
  private http = inject(HttpClient);

  // Obtener las estadísticas consolidadas del backend para el panel de administración.
  // desde/hasta son opcionales (formato YYYY-MM-DD); sin ellos trae el histórico completo.
  getStats(desde?: string, hasta?: string): Observable<{ success: boolean; data: DashboardStats }> {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return this.http.get<{ success: boolean; data: DashboardStats }>(`${API_BASE_URL}/pedidos/stats`, { params });
  }
}
