import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export interface Categoria {
  id: number;
  nombre: string;
}

export interface Producto {
  id?: number;
  codigo: string;
  nombre: string;
  descripcion?: string;
  precio: number;
  cantidad_disponible: number;
  estado: 'disponible' | 'no disponible';
  categoria_id: number;
  categoria?: Categoria;
  imagen_url?: string;
  createdAt?: string;
  updatedAt?: string;
}

@Injectable({
  providedIn: 'root'
})
export class ProductService {
  private http = inject(HttpClient);

  getProductos(): Observable<{ success: boolean; data: Producto[] }> {
    return this.http.get<{ success: boolean; data: Producto[] }>(`${API_BASE_URL}/productos`);
  }

  getProductoById(id: number): Observable<{ success: boolean; data: Producto }> {
    return this.http.get<{ success: boolean; data: Producto }>(`${API_BASE_URL}/productos/${id}`);
  }

  createProducto(producto: Producto): Observable<{ success: boolean; message: string; data: Producto }> {
    return this.http.post<{ success: boolean; message: string; data: Producto }>(
      `${API_BASE_URL}/productos`,
      producto
    );
  }

  updateProducto(id: number, producto: Partial<Producto>): Observable<{ success: boolean; message: string; data: Producto }> {
    return this.http.put<{ success: boolean; message: string; data: Producto }>(
      `${API_BASE_URL}/productos/${id}`,
      producto
    );
  }

  deleteProducto(id: number): Observable<{ success: boolean; message: string }> {
    return this.http.delete<{ success: boolean; message: string }>(`${API_BASE_URL}/productos/${id}`);
  }

  uploadImagen(id: number, file: File): Observable<{ success: boolean; message: string; data: Producto }> {
    const formData = new FormData();
    formData.append('imagen', file);
    return this.http.post<{ success: boolean; message: string; data: Producto }>(
      `${API_BASE_URL}/productos/${id}/imagen`,
      formData
    );
  }

  getCategorias(): Observable<{ success: boolean; data: Categoria[] }> {
    return this.http.get<{ success: boolean; data: Categoria[] }>(`${API_BASE_URL}/categorias`);
  }
}
