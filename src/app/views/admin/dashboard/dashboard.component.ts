import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { OrderService, Pedido } from '../../../services/order.service';
import { ProductService, Producto } from '../../../services/product.service';
import { DashboardService, DashboardStats } from '../../../services/dashboard.service';

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
  private dashboardService = inject(DashboardService);

  pedidos: Pedido[] = [];
  productos: Producto[] = [];

  // Indicadores clave de rendimiento (KPIs)
  totalSales: number = 0;
  totalOrdersCount: number = 0;
  pendingOrdersCount: number = 0;
  totalProductsCount: number = 0;

  // Desglose por modalidad de pedidos
  presencialCount: number = 0;
  enLineaCount: number = 0;

  // Desglose de conteos por estado del pedido
  statusCounts = {
    solicitado: 0,
    confirmado: 0,
    en_preparacion: 0,
    listo: 0,
    entregado: 0,
    cancelado: 0
  };

  // Lista para almacenar los productos más vendidos
  popularProducts: Array<{
    id: number;
    nombre: string;
    precio: number;
    totalVendido: number;
  }> = [];

  recentOrders: Pedido[] = [];

  ngOnInit() {
    this.loadData();
  }

  // Cargar todos los datos de métricas y pedidos recientes
  loadData() {
    // 1. Cargar estadísticas consolidadas del backend
    this.dashboardService.getStats().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          const stats: DashboardStats = res.data;
          
          this.totalSales = stats.totalRevenue;
          this.totalOrdersCount = stats.totalOrders;
          this.presencialCount = stats.modalityDistribution.presencial;
          this.enLineaCount = stats.modalityDistribution['en línea'];
          
          this.statusCounts = {
            solicitado: stats.orderStatusDistribution.solicitado,
            confirmado: stats.orderStatusDistribution.confirmado,
            en_preparacion: stats.orderStatusDistribution['en preparación'],
            listo: stats.orderStatusDistribution.listo,
            entregado: stats.orderStatusDistribution.entregado,
            cancelado: stats.orderStatusDistribution.cancelado
          };

          // Calcular pedidos en espera sumando los estados activos
          this.pendingOrdersCount = 
            this.statusCounts.solicitado + 
            this.statusCounts.confirmado + 
            this.statusCounts.en_preparacion + 
            this.statusCounts.listo;

          this.popularProducts = stats.popularProducts;
        }
      },
      error: (err) => {
        console.error('Error al cargar estadísticas del dashboard:', err);
      }
    });

    // 2. Cargar lista completa de pedidos para la tabla de actividad reciente
    this.orderService.getPedidos().subscribe({
      next: (orderRes) => {
        if (orderRes.success) {
          this.pedidos = orderRes.data;
          this.recentOrders = this.pedidos.slice(0, 5); // Tomar solo los últimos 5 registros
        }
      },
      error: (err) => {
        console.error('Error al cargar pedidos recientes para el dashboard:', err);
      }
    });

    // 3. Cargar catálogo de productos para contar el inventario activo
    this.productService.getProductos().subscribe({
      next: (productRes) => {
        if (productRes.success) {
          this.productos = productRes.data;
          this.totalProductsCount = this.productos.length;
        }
      },
      error: (err) => {
        console.error('Error al cargar catálogo de productos para el dashboard:', err);
      }
    });
  }

  // Helper para calcular porcentajes visuales en los gráficos CSS
  getPercent(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }
}
export { DashboardComponent as Dashboard };
