import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Pedido } from '../../../services/order.service';
import { ProductService, Producto } from '../../../services/product.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.css'
})
export class DashboardComponent implements OnInit {
  private orderService = inject(OrderService);
  private productService = inject(ProductService);

  pedidos: Pedido[] = [];
  productos: Producto[] = [];

  // KPIs
  totalSales: number = 0;
  totalOrdersCount: number = 0;
  pendingOrdersCount: number = 0;
  totalProductsCount: number = 0;

  // Breakdown por modalidad
  presencialCount: number = 0;
  enLineaCount: number = 0;

  // Breakdown por estado
  statusCounts = {
    solicitado: 0,
    confirmado: 0,
    en_preparacion: 0,
    listo: 0,
    entregado: 0,
    cancelado: 0
  };

  recentOrders: Pedido[] = [];

  ngOnInit() {
    this.loadData();
  }

  loadData() {
    // Cargar Pedidos
    this.orderService.getPedidos().subscribe({
      next: (orderRes) => {
        if (orderRes.success) {
          this.pedidos = orderRes.data;
          this.calculateOrderMetrics();
        }
      },
      error: (err) => {
        console.error('Error al cargar pedidos para el dashboard:', err);
      }
    });

    // Cargar Productos
    this.productService.getProductos().subscribe({
      next: (productRes) => {
        if (productRes.success) {
          this.productos = productRes.data;
          this.totalProductsCount = this.productos.length;
        }
      },
      error: (err) => {
        console.error('Error al cargar productos para el dashboard:', err);
      }
    });
  }

  calculateOrderMetrics() {
    this.totalOrdersCount = this.pedidos.length;
    this.recentOrders = this.pedidos.slice(0, 5); // Últimos 5 pedidos

    // Resetear contadores
    this.totalSales = 0;
    this.pendingOrdersCount = 0;
    this.presencialCount = 0;
    this.enLineaCount = 0;
    this.statusCounts = {
      solicitado: 0,
      confirmado: 0,
      en_preparacion: 0,
      listo: 0,
      entregado: 0,
      cancelado: 0
    };

    this.pedidos.forEach(pedido => {
      // Sumar ventas solo de pedidos entregados
      if (pedido.estado === 'entregado') {
        this.totalSales += Number(pedido.valor_total);
      }

      // Contar pendientes
      const esPendiente = ['solicitado', 'confirmado', 'en preparación', 'listo'].includes(pedido.estado);
      if (esPendiente) {
        this.pendingOrdersCount++;
      }

      // Contar por modalidad
      if (pedido.modalidad === 'presencial') {
        this.presencialCount++;
      } else {
        this.enLineaCount++;
      }

      // Contar por estado
      if (pedido.estado === 'solicitado') this.statusCounts.solicitado++;
      else if (pedido.estado === 'confirmado') this.statusCounts.confirmado++;
      else if (pedido.estado === 'en preparación') this.statusCounts.en_preparacion++;
      else if (pedido.estado === 'listo') this.statusCounts.listo++;
      else if (pedido.estado === 'entregado') this.statusCounts.entregado++;
      else if (pedido.estado === 'cancelado') this.statusCounts.cancelado++;
    });
  }

  // Helpers de porcentajes para gráficos CSS
  getPercent(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}
export { DashboardComponent as Dashboard };
