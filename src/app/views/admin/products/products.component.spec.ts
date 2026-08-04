import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ProductsComponent } from './products.component';
import { ProductService, Producto } from '../../../services/product.service';
import { ToastService } from '../../../services/toast.service';

describe('ProductsComponent (Admin)', () => {
  let component: ProductsComponent;
  let fixture: ComponentFixture<ProductsComponent>;
  let productServiceSpy: any;
  let toastServiceSpy: any;

  const mockProductos: Producto[] = [
    { id: 1, codigo: 'PAN01', nombre: 'Pan de Queso', precio: 1.5, cantidad_disponible: 10, estado: 'disponible', categoria_id: 1, imagen_url: 'http://img.com/pan.png' },
    { id: 2, codigo: 'TOR01', nombre: 'Torta Chocolate', precio: 15, cantidad_disponible: 5, estado: 'no disponible', categoria_id: 2 }
  ];

  beforeEach(async () => {
    productServiceSpy = {
      getProductos: vi.fn().mockReturnValue(of({ success: true, data: mockProductos })),
      getCategorias: vi.fn().mockReturnValue(of({ success: true, data: [{ id: 1, nombre: 'Panadería' }, { id: 2, nombre: 'Pastelería' }] })),
      createCategoria: vi.fn(),
      createProducto: vi.fn(),
      updateProducto: vi.fn(),
      deleteProducto: vi.fn(),
      uploadImagen: vi.fn()
    };

    toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [ProductsComponent],
      providers: [
        { provide: ProductService, useValue: productServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ProductsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar productos y categorías', () => {
    expect(component).toBeTruthy();
    expect(productServiceSpy.getProductos).toHaveBeenCalled();
    expect(productServiceSpy.getCategorias).toHaveBeenCalled();
    expect(component.productos.length).toBe(2);
  });

  it('getProductosFiltrados debe aplicar los filtros de búsqueda, categoría y estado', () => {
    component.searchTerm = 'PAN';
    expect(component.getProductosFiltrados().length).toBe(1);

    component.searchTerm = '';
    component.selectedEstado = 'no disponible';
    expect(component.getProductosFiltrados().length).toBe(1);
  });

  it('openAddModal, openEditModal y closeModal deben gestionar la visibilidad del modal', () => {
    component.openAddModal();
    expect(component.showModal).toBe(true);
    expect(component.isEditMode).toBe(false);

    component.openEditModal(mockProductos[0]);
    expect(component.isEditMode).toBe(true);
    expect(component.productoForm.codigo).toBe('PAN01');
    expect(component.imagePreviewUrl).toBe('http://img.com/pan.png');

    component.closeModal();
    expect(component.showModal).toBe(false);
  });

  it('onCodigoInput debe formatear a mayúsculas y alfanumérico', () => {
    const event = { target: { value: 'pan-01!' } } as any;
    component.onCodigoInput(event);
    expect(component.productoForm.codigo).toBe('PAN01');
  });

  it('onImageSelected debe validar formato y tamaño de la imagen', () => {
    // Tipo no permitido
    const fileInvalid = new File([''], 'file.txt', { type: 'text/plain' });
    const eventInvalid = { target: { files: [fileInvalid] } } as any;
    component.onImageSelected(eventInvalid);
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.');

    // Tamaño excesivo (>5MB)
    const bigContent = new Uint8Array(6 * 1024 * 1024);
    const fileBig = new File([bigContent], 'big.png', { type: 'image/png' });
    const eventBig = { target: { files: [fileBig] } } as any;
    component.onImageSelected(eventBig);
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La imagen no puede superar los 5 MB.');
  });

  it('onSubmit validaciones de precio, cantidad y categoría', () => {
    component.openAddModal();

    // Sin código
    component.productoForm.codigo = '';
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('El código y el nombre del producto son obligatorios.');

    // Precio <= 0
    component.productoForm.codigo = 'PROD';
    component.productoForm.nombre = 'Nombre';
    component.productoForm.precio = 0;
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('El precio debe ser un número mayor a 0.');

    // Cantidad negativa
    component.productoForm.precio = 10;
    component.productoForm.cantidad_disponible = -1;
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La cantidad disponible no puede ser negativa.');
  });

  it('onSubmit en modo creación y edición debe procesar la solicitud', () => {
    component.openAddModal();
    component.productoForm = {
      codigo: 'NUE01',
      nombre: 'Nuevo Producto',
      descripcion: 'Prueba',
      precio: 10,
      cantidad_disponible: 5,
      estado: 'disponible',
      categoria_id: 1
    };

    productServiceSpy.createProducto.mockReturnValue(of({ success: true, data: { id: 3, ...component.productoForm } }));
    component.onSubmit();
    expect(productServiceSpy.createProducto).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();

    component.openEditModal(mockProductos[0]);
    productServiceSpy.updateProducto.mockReturnValue(of({ success: true }));
    component.onSubmit();
    expect(productServiceSpy.updateProducto).toHaveBeenCalled();
  });

  it('openAddCategoryModal, closeCategoryModal y guardarNuevaCategoria', () => {
    component.openAddCategoryModal();
    expect(component.showCategoryModal).toBe(true);

    component.newCategoryNombre = 'Bebidas';
    productServiceSpy.createCategoria.mockReturnValue(of({ success: true, data: { id: 3, nombre: 'Bebidas' } }));

    component.guardarNuevaCategoria();
    expect(productServiceSpy.createCategoria).toHaveBeenCalledWith('Bebidas');
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();

    component.closeCategoryModal();
    expect(component.showCategoryModal).toBe(false);
  });

  it('confirmDelete y openDeleteModal / closeDeleteModal', () => {
    component.openDeleteModal(mockProductos[0]);
    expect(component.showDeleteModal).toBe(true);

    productServiceSpy.deleteProducto.mockReturnValue(of({ success: true }));
    component.confirmDelete();
    expect(productServiceSpy.deleteProducto).toHaveBeenCalledWith(1);
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();

    component.closeDeleteModal();
    expect(component.showDeleteModal).toBe(false);
  });
});
