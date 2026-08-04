import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { describe, beforeEach, afterEach, it, expect } from 'vitest';
import { ProductService, Producto } from './product.service';
import { API_BASE_URL } from '../config/api.config';

describe('ProductService', () => {
  let service: ProductService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProductService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ProductService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
  });

  it('getProductos() debe realizar GET a /productos', () => {
    const mockData = { success: true, data: [{ id: 1, codigo: 'P01', nombre: 'Pan', precio: 1.5, cantidad_disponible: 10, estado: 'disponible' as const, categoria_id: 1 }] };

    service.getProductos().subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('getProductoById() debe realizar GET a /productos/:id', () => {
    const mockData = { success: true, data: { id: 1, codigo: 'P01', nombre: 'Pan', precio: 1.5, cantidad_disponible: 10, estado: 'disponible' as const, categoria_id: 1 } };

    service.getProductoById(1).subscribe(res => {
      expect(res).toEqual(mockData);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos/1`);
    expect(req.request.method).toBe('GET');
    req.flush(mockData);
  });

  it('createProducto() debe realizar POST a /productos', () => {
    const newProduct: Producto = { codigo: 'P02', nombre: 'Torta', precio: 15, cantidad_disponible: 5, estado: 'disponible', categoria_id: 2 };
    const mockRes = { success: true, message: 'Creado', data: { ...newProduct, id: 2 } };

    service.createProducto(newProduct).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(newProduct);
    req.flush(mockRes);
  });

  it('updateProducto() debe realizar PUT a /productos/:id', () => {
    const updateData = { precio: 2.0 };
    const mockRes = { success: true, message: 'Actualizado', data: { id: 1, codigo: 'P01', nombre: 'Pan', precio: 2.0, cantidad_disponible: 10, estado: 'disponible' as const, categoria_id: 1 } };

    service.updateProducto(1, updateData).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos/1`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(updateData);
    req.flush(mockRes);
  });

  it('deleteProducto() debe realizar DELETE a /productos/:id', () => {
    const mockRes = { success: true, message: 'Eliminado' };

    service.deleteProducto(1).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(mockRes);
  });

  it('uploadImagen() debe enviar FormData vía POST a /productos/:id/imagen', () => {
    const mockFile = new File(['dummy content'], 'test.png', { type: 'image/png' });
    const mockRes = { success: true, message: 'Imagen subida', data: { id: 1, codigo: 'P01', nombre: 'Pan', precio: 1.5, cantidad_disponible: 10, estado: 'disponible' as const, categoria_id: 1, imagen_url: 'http://img.com/test.png' } };

    service.uploadImagen(1, mockFile).subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/productos/1/imagen`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body instanceof FormData).toBe(true);
    req.flush(mockRes);
  });

  it('getCategorias() debe realizar GET a /categorias', () => {
    const mockRes = { success: true, data: [{ id: 1, nombre: 'Panadería' }] };

    service.getCategorias().subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/categorias`);
    expect(req.request.method).toBe('GET');
    req.flush(mockRes);
  });

  it('createCategoria() debe realizar POST a /categorias', () => {
    const mockRes = { success: true, message: 'Creada', data: { id: 2, nombre: 'Pastelería' } };

    service.createCategoria('Pastelería').subscribe(res => {
      expect(res).toEqual(mockRes);
    });

    const req = httpMock.expectOne(`${API_BASE_URL}/categorias`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ nombre: 'Pastelería' });
    req.flush(mockRes);
  });
});
