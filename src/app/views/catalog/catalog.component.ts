import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ProductService, Producto, Categoria } from '../../services/product.service';

@Component({
  selector: 'app-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './catalog.component.html',
  styleUrl: './catalog.component.css'
})
export class CatalogComponent implements OnInit {
  private productService = inject(ProductService);
  private cdr = inject(ChangeDetectorRef);

  productos: Producto[] = [];
  categorias: Categoria[] = [];

  searchTerm: string = '';
  selectedCategoriaId: string = '';

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
}
export { CatalogComponent as Catalog };
