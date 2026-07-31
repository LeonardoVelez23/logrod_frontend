import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Producto, Categoria } from '../../../services/product.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})
export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);

  productos: Producto[] = [];
  categorias: Categoria[] = [];

  // Filtros
  searchTerm: string = '';
  selectedCategoriaId: string = '';
  selectedEstado: string = '';

  // Control de Modal y Formulario
  showModal: boolean = false;
  isEditMode: boolean = false;
  currentProductoId?: number;

  productoForm = {
    codigo: '',
    nombre: '',
    descripcion: '',
    precio: 0,
    cantidad_disponible: 0,
    estado: 'disponible' as 'disponible' | 'no disponible',
    categoria_id: 0
  };

  ngOnInit() {
    this.loadProductos();
    this.loadCategorias();
  }

  loadProductos() {
    this.productService.getProductos().subscribe({
      next: (response) => {
        if (response.success) {
          this.productos = response.data;
        }
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  loadCategorias() {
    this.productService.getCategorias().subscribe({
      next: (response) => {
        if (response.success) {
          this.categorias = response.data;
        }
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  // Filtrar la lista de productos localmente
  getProductosFiltrados(): Producto[] {
    return this.productos.filter(prod => {
      const matchSearch = !this.searchTerm.trim() ||
        prod.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        prod.codigo.toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchCategory = !this.selectedCategoriaId || 
        prod.categoria_id === parseInt(this.selectedCategoriaId, 10);

      const matchEstado = !this.selectedEstado || 
        prod.estado === this.selectedEstado;

      return matchSearch && matchCategory && matchEstado;
    });
  }

  // Abrir modal para agregar
  openAddModal() {
    this.isEditMode = false;
    this.currentProductoId = undefined;
    this.productoForm = {
      codigo: '',
      nombre: '',
      descripcion: '',
      precio: 0,
      cantidad_disponible: 0,
      estado: 'disponible',
      categoria_id: this.categorias[0]?.id || 0
    };
    this.showModal = true;
  }

  // Abrir modal para editar
  openEditModal(producto: Producto) {
    this.isEditMode = true;
    this.currentProductoId = producto.id;
    this.productoForm = {
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      precio: Number(producto.precio),
      cantidad_disponible: producto.cantidad_disponible,
      estado: producto.estado,
      categoria_id: producto.categoria_id
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  // Procesar el envío del formulario (Creación o Actualización)
  onSubmit() {
    // Validaciones básicas
    if (!this.productoForm.codigo.trim() || !this.productoForm.nombre.trim()) {
      alert('El código y el nombre del producto son obligatorios.');
      return;
    }
    if (this.productoForm.precio <= 0) {
      alert('El precio debe ser un número mayor a 0.');
      return;
    }
    if (this.productoForm.cantidad_disponible < 0) {
      alert('La cantidad disponible no puede ser negativa.');
      return;
    }
    if (!this.productoForm.categoria_id) {
      alert('Debe seleccionar una categoría para el producto.');
      return;
    }

    const payload: Producto = {
      codigo: this.productoForm.codigo.trim(),
      nombre: this.productoForm.nombre.trim(),
      descripcion: this.productoForm.descripcion.trim() || undefined,
      precio: this.productoForm.precio,
      cantidad_disponible: this.productoForm.cantidad_disponible,
      estado: this.productoForm.estado,
      categoria_id: this.productoForm.categoria_id
    };

    if (this.isEditMode && this.currentProductoId !== undefined) {
      // Actualizar
      this.productService.updateProducto(this.currentProductoId, payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadProductos();
            this.closeModal();
          }
        },
        error: (err) => {
          alert('Error al actualizar el producto: ' + (err.error?.message || err.message));
        }
      });
    } else {
      // Crear
      this.productService.createProducto(payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.loadProductos();
            this.closeModal();
          }
        },
        error: (err) => {
          alert('Error al crear el producto: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Eliminar un producto del catálogo
  deleteProducto(producto: Producto) {
    if (confirm(`¿Está seguro de que desea eliminar el producto "${producto.nombre}"?`)) {
      if (producto.id !== undefined) {
        this.productService.deleteProducto(producto.id).subscribe({
          next: (response) => {
            if (response.success) {
              this.loadProductos();
            }
          },
          error: (err) => {
            alert('Error al eliminar el producto: ' + (err.error?.message || err.message));
          }
        });
      }
    }
  }
}
export { ProductsComponent as Products };
