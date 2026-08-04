import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { CatalogComponent } from './catalog.component';
import { ProductService } from '../../services/product.service';

describe('CatalogComponent', () => {
  let component: CatalogComponent;
  let fixture: ComponentFixture<CatalogComponent>;
  let productServiceSpy: any;

  beforeEach(async () => {
    productServiceSpy = {
      getProductos: vi.fn(),
      getCategorias: vi.fn()
    };

    productServiceSpy.getProductos.mockReturnValue(of({
      success: true,
      data: [
        { id: 1, codigo: 'P01', nombre: 'Pan de Queso', descripcion: 'Delicioso', precio: 1.5, cantidad_disponible: 10, estado: 'disponible', categoria_id: 1 },
        { id: 2, codigo: 'P02', nombre: 'Torta de Chocolate', descripcion: 'Dulce', precio: 15, cantidad_disponible: 5, estado: 'disponible', categoria_id: 2 },
        { id: 3, codigo: 'P03', nombre: 'Galleta de Avena', descripcion: 'Saludable', precio: 0.8, cantidad_disponible: 0, estado: 'no disponible', categoria_id: 1 }
      ]
    }));

    productServiceSpy.getCategorias.mockReturnValue(of({
      success: true,
      data: [
        { id: 1, nombre: 'Panadería' },
        { id: 2, nombre: 'Pastelería' }
      ]
    }));

    await TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CatalogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar productos y categorías al inicializarse', () => {
    expect(component).toBeTruthy();
    expect(productServiceSpy.getProductos).toHaveBeenCalled();
    expect(productServiceSpy.getCategorias).toHaveBeenCalled();
    expect(component.productos.length).toBe(3);
    expect(component.categorias.length).toBe(2);
  });

  it('getProductosFiltrados debe excluir productos no disponibles', () => {
    const filtrados = component.getProductosFiltrados();
    expect(filtrados.length).toBe(2);
    expect(filtrados.some(p => p.id === 3)).toBe(false);
  });

  it('getProductosFiltrados debe filtrar por término de búsqueda (searchTerm)', () => {
    component.searchTerm = 'Pan';
    const filtrados = component.getProductosFiltrados();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].nombre).toBe('Pan de Queso');
  });

  it('getProductosFiltrados debe filtrar por categoría (selectedCategoriaId)', () => {
    component.selectedCategoriaId = '2';
    const filtrados = component.getProductosFiltrados();
    expect(filtrados.length).toBe(1);
    expect(filtrados[0].nombre).toBe('Torta de Chocolate');
  });

  it('debe manejar errores de carga de productos sin fallar', () => {
    productServiceSpy.getProductos.mockReturnValue(throwError(() => new Error('Error de servidor')));
    component.loadProductos();
    expect(component.productos.length).toBe(3); // se mantienen los anteriores
  });

  it('debe manejar errores de carga de categorías sin fallar', () => {
    productServiceSpy.getCategorias.mockReturnValue(throwError(() => new Error('Error de servidor')));
    component.loadCategorias();
    expect(component.categorias.length).toBe(2);
  });
});
