import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Producto, Categoria } from '../../../services/product.service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.css'
})

export class ProductsComponent implements OnInit {
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef); // Inyectar ChangeDetectorRef para forzar actualización de la UI
  private toastService = inject(ToastService);


  productos: Producto[] = [];
  categorias: Categoria[] = [];

  // Filtros de búsqueda
  searchTerm: string = '';
  selectedCategoriaId: string = '';
  selectedEstado: string = '';

  // Control de Modal de Edición/Creación
  showModal: boolean = false;
  isEditMode: boolean = false;
  currentProductoId?: number;

  // Control de Modal de Eliminación
  showDeleteModal: boolean = false;
  productToDelete: Producto | null = null;

  // Control de Modal de Nueva Categoría
  showCategoryModal: boolean = false;
  newCategoryNombre: string = '';
  isSavingCategory: boolean = false;

  // Imagen del producto (se sube aparte, después de crear/guardar los datos del producto)
  selectedImageFile: File | null = null;
  imagePreviewUrl: string | null = null;
  uploadingImage: boolean = false;

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

  // Cargar lista de productos del servidor
  loadProductos() {
    this.productService.getProductos().subscribe({
      next: (response) => {
        if (response.success) {
          this.productos = response.data;
          this.cdr.detectChanges(); // Forzar renderizado
        }
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
      }
    });
  }

  // Cargar categorías del servidor
  loadCategorias() {
    this.productService.getCategorias().subscribe({
      next: (response) => {
        if (response.success) {
          this.categorias = response.data;
          this.cdr.detectChanges(); // Forzar renderizado
        }
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  // Filtrar la lista de productos localmente según los filtros seleccionados
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

  // Abrir modal en modo creación
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
    this.selectedImageFile = null;
    this.imagePreviewUrl = null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  // Abrir modal en modo edición
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
    this.selectedImageFile = null;
    this.imagePreviewUrl = producto.imagen_url || null;
    this.showModal = true;
    this.cdr.detectChanges();
  }

  // Formatear el código a máximo 8 caracteres alfanuméricos en mayúsculas
  onCodigoInput(event: Event) {
    const input = event.target as HTMLInputElement;
    const cleanValue = input.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    this.productoForm.codigo = cleanValue;
    input.value = cleanValue;
  }

  // Cerrar el modal y refrescar la UI
  closeModal() {
    this.showModal = false;
    this.cdr.detectChanges();
  }

  // Métodos para crear una nueva categoría directamente desde el formulario de producto
  openAddCategoryModal() {
    this.newCategoryNombre = '';
    this.showCategoryModal = true;
    this.cdr.detectChanges();
  }

  closeCategoryModal() {
    this.showCategoryModal = false;
    this.newCategoryNombre = '';
    this.isSavingCategory = false;
    this.cdr.detectChanges();
  }

  guardarNuevaCategoria() {
    const nombre = this.newCategoryNombre.trim();
    if (!nombre) {
      this.toastService.showWarning('El nombre de la categoría no puede estar vacío.');
      return;
    }

    this.isSavingCategory = true;
    this.productService.createCategoria(nombre).subscribe({
      next: (response) => {
        if (response.success) {
          const newCat = response.data;
          this.toastService.showSuccess(`Categoría "${newCat.nombre}" creada correctamente.`);
          
          // Cerrar modal inmediatamente y limpiar estado
          this.closeCategoryModal();

          // Recargar la lista de categorías y seleccionar la recién creada
          this.productService.getCategorias().subscribe({
            next: (catRes) => {
              if (catRes.success) {
                this.categorias = catRes.data;
                if (newCat && newCat.id) {
                  this.productoForm.categoria_id = newCat.id;
                }
                this.cdr.detectChanges();
              }
            },
            error: () => {
              this.cdr.detectChanges();
            }
          });
        } else {
          this.isSavingCategory = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        this.isSavingCategory = false;
        this.toastService.showError('Error al crear categoría: ' + (err.error?.message || err.message));
        this.cdr.detectChanges();
      }
    });
  }

  // Validar y previsualizar la imagen seleccionada (aún no se sube al servidor)
  onImageSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const tiposPermitidos = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!tiposPermitidos.includes(file.type)) {
      this.toastService.showWarning('Formato de imagen no soportado. Usa JPG, PNG, WEBP o GIF.');
      input.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.toastService.showWarning('La imagen no puede superar los 5 MB.');
      input.value = '';
      return;
    }

    this.selectedImageFile = file;
    this.imagePreviewUrl = URL.createObjectURL(file);
  }

  // Subir la imagen seleccionada para un producto ya creado/guardado
  private subirImagenSiCorresponde(productoId: number) {
    if (!this.selectedImageFile) return;

    this.uploadingImage = true;
    this.productService.uploadImagen(productoId, this.selectedImageFile).subscribe({
      next: (response) => {
        this.uploadingImage = false;
        if (response.success) {
          this.loadProductos();
        }
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.uploadingImage = false;
        this.cdr.detectChanges();
        this.toastService.showError('El producto se guardó, pero la imagen no se pudo subir: ' + (err.error?.message || err.message));
      }
    });
  }

  // Procesar el envío del formulario (Creación o Edición)
  onSubmit() {
    // Validaciones básicas de negocio en el cliente
    if (!this.productoForm.codigo.trim() || !this.productoForm.nombre.trim()) {
      this.toastService.showWarning('El código y el nombre del producto son obligatorios.');
      return;
    }
    if (this.productoForm.precio <= 0) {
      this.toastService.showWarning('El precio debe ser un número mayor a 0.');
      return;
    }
    if (this.productoForm.cantidad_disponible < 0) {
      this.toastService.showWarning('La cantidad disponible no puede ser negativa.');
      return;
    }
    if (!this.productoForm.categoria_id) {
      this.toastService.showWarning('Debe seleccionar una categoría para el producto.');
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
      // Actualizar producto existente
      const productoId = this.currentProductoId;
      this.productService.updateProducto(productoId, payload).subscribe({
        next: (response) => {
          if (response.success) {
            this.subirImagenSiCorresponde(productoId);
            this.loadProductos();
            this.closeModal();
            this.toastService.showSuccess('Producto actualizado correctamente.');
          }
        },
        error: (err) => {
          this.toastService.showError('Error al actualizar el producto: ' + (err.error?.message || err.message));
        }
      });
    } else {
      // Crear nuevo producto
      this.productService.createProducto(payload).subscribe({
        next: (response) => {
          if (response.success) {
            if (response.data.id !== undefined) {
              this.subirImagenSiCorresponde(response.data.id);
            }
            this.loadProductos();
            this.closeModal();
            this.toastService.showSuccess('Producto creado correctamente.');
          }
        },
        error: (err) => {
          this.toastService.showError('Error al crear el producto: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // Abrir modal de confirmación de eliminación
  openDeleteModal(producto: Producto) {
    this.productToDelete = producto;
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  // Cerrar modal de eliminación
  closeDeleteModal() {
    this.showDeleteModal = false;
    this.productToDelete = null;
    this.cdr.detectChanges();
  }

  // Confirmar y ejecutar la eliminación del producto
  confirmDelete() {
    if (!this.productToDelete || this.productToDelete.id === undefined) {
      return;
    }

    const prodId = this.productToDelete.id;
    this.productService.deleteProducto(prodId).subscribe({
      next: (response) => {
        if (response.success) {
          this.loadProductos();
          this.closeDeleteModal();
          this.toastService.showSuccess('Producto eliminado correctamente.');
        }
      },
      error: (err) => {
        this.toastService.showError('Error al eliminar el producto: ' + (err.error?.message || err.message));
        this.closeDeleteModal();
      }
    });
  }
}
export { ProductsComponent as Products };
