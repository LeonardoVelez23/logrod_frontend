import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { ProductService, Producto, Categoria } from '../../services/product.service';
import { OrderService } from '../../services/order.service';
import { AuthService } from '../../services/auth.service';
import { ToastService } from '../../services/toast.service';
import { ModalComponent } from '../../components/modal/modal.component';

export interface CartItem {
  producto: Producto;
  cantidad: number;
}

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit {
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  categorias: Categoria[] = [];

  searchTerm: string = '';
  selectedCategoriaId: string = '';

  // Estado del Carrito de Compras
  cartItems: CartItem[] = [];
  showCartModal: boolean = false;
  submittingOrder: boolean = false;
  selectedModalidad: 'en línea' | 'presencial' = 'en línea';

  ngOnInit() {
    this.loadProductos();
    this.loadCategorias();
  }

  loadProductos() {
    this.productService.getProductos().subscribe({
      next: (response) => {
        if (response.success) {
          this.productos = response.data;
          this.cdr.detectChanges();
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
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar categorías:', err);
      }
    });
  }

  getProductosFiltrados(): Producto[] {
    return this.productos.filter(prod => {
      if (prod.estado !== 'disponible') return false;

      const matchSearch = !this.searchTerm.trim() ||
        prod.nombre.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        (prod.descripcion || '').toLowerCase().includes(this.searchTerm.toLowerCase());

      const matchCategoria = !this.selectedCategoriaId ||
        prod.categoria_id === parseInt(this.selectedCategoriaId, 10);

      return matchSearch && matchCategoria;
    });
  }

  // --- Métodos del Carrito ---

  addToCart(prod: Producto) {
    if (prod.cantidad_disponible <= 0) {
      this.toastService.showError(`El producto "${prod.nombre}" está agotado.`);
      return;
    }

    const existingIndex = this.cartItems.findIndex(item => item.producto.id === prod.id);

    if (existingIndex > -1) {
      const currentQty = this.cartItems[existingIndex].cantidad;
      if (currentQty >= prod.cantidad_disponible) {
        this.toastService.showError(`Has alcanzado el stock máximo disponible de "${prod.nombre}".`);
        return;
      }
      this.cartItems[existingIndex].cantidad++;
    } else {
      this.cartItems.push({ producto: prod, cantidad: 1 });
    }

    this.toastService.showSuccess(`¡"${prod.nombre}" añadido al carrito!`);
    this.cdr.detectChanges();
  }

  updateCartQuantity(productoId: number | undefined, delta: number) {
    if (!productoId) return;
    const item = this.cartItems.find(i => i.producto.id === productoId);
    if (!item) return;

    const newQty = item.cantidad + delta;
    if (newQty <= 0) {
      this.removeFromCart(productoId);
      return;
    }

    if (newQty > item.producto.cantidad_disponible) {
      this.toastService.showError(`No hay más stock disponible de "${item.producto.nombre}".`);
      return;
    }

    item.cantidad = newQty;
    this.cdr.detectChanges();
  }

  removeFromCart(productoId: number | undefined) {
    if (!productoId) return;
    this.cartItems = this.cartItems.filter(i => i.producto.id !== productoId);
    this.toastService.showInfo('Producto quitado del carrito.');
    this.cdr.detectChanges();
  }


  get cartCount(): number {
    return this.cartItems.reduce((acc, item) => acc + item.cantidad, 0);
  }

  get cartTotal(): number {
    return this.cartItems.reduce((acc, item) => acc + (item.cantidad * item.producto.precio), 0);
  }

  openCartModal() {
    this.showCartModal = true;
  }

  closeCartModal() {
    this.showCartModal = false;
  }

  // Confirmar y Enviar Pedido
  submitOrder() {
    if (this.cartItems.length === 0) {
      this.toastService.showError('El carrito está vacío.');
      return;
    }

    const currentUser = this.authService.currentUser();
    if (!currentUser || !currentUser.id) {
      this.toastService.showError('Debes iniciar sesión para realizar un pedido.');
      return;
    }

    this.submittingOrder = true;

    const now = new Date();
    const fechaStr = now.toISOString().split('T')[0];
    const horaStr = now.toTimeString().split(' ')[0];

    const payload: any = {
      fecha: fechaStr,
      hora: horaStr,
      modalidad: this.selectedModalidad,
      cliente_id: currentUser.id,
      detalles: this.cartItems.map(item => ({
        producto_id: item.producto.id,
        cantidad: item.cantidad
      }))
    };

    this.orderService.createPedido(payload).subscribe({
      next: (response) => {
        this.submittingOrder = false;
        if (response.success) {
          this.toastService.showSuccess('¡Pedido realizado con éxito!');
          this.cartItems = [];
          this.closeCartModal();
          this.router.navigate(['/tracking']);
        }
      },
      error: (err) => {
        this.submittingOrder = false;
        console.error('Error al realizar pedido:', err);
        this.toastService.showError(err.error?.message || 'Error al procesar el pedido.');
      }
    });
  }
}
export { CatalogComponent as Catalog };

