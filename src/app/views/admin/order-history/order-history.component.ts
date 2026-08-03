import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService, Pedido } from '../../../services/order.service';
import { PagoService, Pago } from '../../../services/pago.service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { ToastService } from '../../../services/toast.service';

interface CalendarDay {
  dateStr: string;
  dayNum: number;
  isCurrentMonth: boolean;
  hasSales: boolean;
  isSelected: boolean;
}

@Component({
  selector: 'app-order-history',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './order-history.component.html',
  styleUrl: './order-history.component.css'
})
export class OrderHistoryComponent implements OnInit {
  private orderService = inject(OrderService);
  private pagoService = inject(PagoService);
  private cdr = inject(ChangeDetectorRef);
  private toastService = inject(ToastService);

  pedidos: Pedido[] = [];
  pagos: Pago[] = [];
  pedidosFiltrados: Pedido[] = [];

  // Calendario
  selectedDate: string = '';
  selectedMonth: number = 0;
  selectedYear: number = 0;
  monthNames: string[] = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  calendarDays: CalendarDay[] = [];

  // Resumen del día
  totalRevenueToday: number = 0;
  revenueByMethod = {
    efectivo: 0,
    tarjeta: 0,
    transferencia: 0
  };

  // Detalle de un pedido seleccionado
  selectedPedido: Pedido | null = null;
  showDetailModal: boolean = false;

  ngOnInit() {
    const today = new Date();
    this.selectedMonth = today.getMonth();
    this.selectedYear = today.getFullYear();
    this.selectedDate = this.formatDate(this.selectedYear, this.selectedMonth, today.getDate());

    this.loadData();
  }

  loadData() {
    this.orderService.getPedidos().subscribe({
      next: (orderRes) => {
        if (orderRes.success) {
          this.pedidos = orderRes.data;

          // Cargar los pagos registrados para cruzarlos
          this.pagoService.getAllPagos().subscribe({
            next: (pagoRes) => {
              if (pagoRes.success) {
                this.pagos = pagoRes.data;

                // Cruzar método de pago en cada pedido
                this.pedidos.forEach(p => {
                  const pago = this.pagos.find(pg => pg.pedido_id === p.id && pg.estado === 'aprobado');
                  if (pago) {
                    p.metodo_pago = pago.metodo_pago;
                    p.numero_referencia = pago.numero_referencia;
                  }
                });

                this.generateCalendar();
                this.selectDate(this.selectedDate);
              }
            },
            error: (err) => {
              console.error('Error al cargar pagos en historial:', err);
              this.toastService.showError('Error al cargar la información de pagos.');
            }
          });
        }
      },
      error: (err) => {
        console.error('Error al cargar pedidos en historial:', err);
        this.toastService.showError('Error al cargar el historial de pedidos.');
      }
    });
  }

  generateCalendar() {
    const startOfMonth = new Date(this.selectedYear, this.selectedMonth, 1);
    const endOfMonth = new Date(this.selectedYear, this.selectedMonth + 1, 0);
    const totalDays = endOfMonth.getDate();

    // Determinar día de la semana del primer día (Ajustado Lunes = 0, Domingo = 6)
    let startDayOfWeek = startOfMonth.getDay();
    startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

    this.calendarDays = [];

    // Rellenar días del mes anterior
    const prevMonthEnd = new Date(this.selectedYear, this.selectedMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const dayNum = prevMonthEnd - i;
      const prevMonth = this.selectedMonth === 0 ? 11 : this.selectedMonth - 1;
      const prevYear = this.selectedMonth === 0 ? this.selectedYear - 1 : this.selectedYear;
      const dateStr = this.formatDate(prevYear, prevMonth, dayNum);
      this.calendarDays.push({
        dateStr,
        dayNum,
        isCurrentMonth: false,
        hasSales: this.checkSalesForDate(dateStr),
        isSelected: dateStr === this.selectedDate
      });
    }

    // Rellenar días del mes actual
    for (let i = 1; i <= totalDays; i++) {
      const dateStr = this.formatDate(this.selectedYear, this.selectedMonth, i);
      this.calendarDays.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        hasSales: this.checkSalesForDate(dateStr),
        isSelected: dateStr === this.selectedDate
      });
    }

    // Rellenar días del mes siguiente para completar la cuadrícula de 7 columnas
    const totalCells = this.calendarDays.length;
    const remainingCells = totalCells % 7 === 0 ? 0 : 7 - (totalCells % 7);
    for (let i = 1; i <= remainingCells; i++) {
      const nextMonth = this.selectedMonth === 11 ? 0 : this.selectedMonth + 1;
      const nextYear = this.selectedMonth === 11 ? this.selectedYear + 1 : this.selectedYear;
      const dateStr = this.formatDate(nextYear, nextMonth, i);
      this.calendarDays.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
        hasSales: this.checkSalesForDate(dateStr),
        isSelected: dateStr === this.selectedDate
      });
    }

    this.cdr.detectChanges();
  }

  checkSalesForDate(dateStr: string): boolean {
    // Retorna true si hay pedidos no cancelados registrados en esta fecha
    return this.pedidos.some(p => p.fecha === dateStr && p.estado !== 'cancelado');
  }

  selectDate(dateStr: string) {
    this.selectedDate = dateStr;
    
    // Actualizar estados visuales de selección
    this.calendarDays.forEach(d => d.isSelected = (d.dateStr === dateStr));

    // Filtrar pedidos de la fecha seleccionada
    this.pedidosFiltrados = this.pedidos.filter(p => p.fecha === dateStr);

    // Calcular ingresos y desgloses
    this.totalRevenueToday = 0;
    this.revenueByMethod = { efectivo: 0, tarjeta: 0, transferencia: 0 };

    this.pedidosFiltrados.forEach(p => {
      if (p.estado !== 'cancelado') {
        const val = Number(p.valor_total);
        const metodo = p.metodo_pago;
        
        if (metodo === 'efectivo') {
          this.revenueByMethod.efectivo += val;
          this.totalRevenueToday += val;
        } else if (metodo === 'tarjeta') {
          this.revenueByMethod.tarjeta += val;
          this.totalRevenueToday += val;
        } else if (metodo === 'transferencia') {
          this.revenueByMethod.transferencia += val;
          this.totalRevenueToday += val;
        }
      }
    });

    this.cdr.detectChanges();
  }

  // Navegar meses del calendario
  changeMonth(delta: number) {
    this.selectedMonth += delta;
    if (this.selectedMonth < 0) {
      this.selectedMonth = 11;
      this.selectedYear--;
    } else if (this.selectedMonth > 11) {
      this.selectedMonth = 0;
      this.selectedYear++;
    }
    
    // Generar calendario con nueva fecha
    this.generateCalendar();
  }

  formatDate(year: number, month: number, day: number): string {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  }

  // Formateador de texto legible para el día seleccionado
  getSelectedDateLabel(): string {
    if (!this.selectedDate) return '';
    const parts = this.selectedDate.split('-');
    const year = parts[0];
    const month = this.monthNames[parseInt(parts[1], 10) - 1];
    const day = parts[2];
    return `${day} de ${month}, ${year}`;
  }

  // Visualizar detalles completos de un pedido en el modal
  openDetail(pedido: Pedido) {
    if (pedido.id) {
      this.orderService.getPedidoById(pedido.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.selectedPedido = response.data;
            this.showDetailModal = true;
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.error('Error al cargar detalle del pedido:', err);
          this.toastService.showError('No se pudo cargar la información detallada del pedido.');
        }
      });
    }
  }

  closeDetail() {
    this.selectedPedido = null;
    this.showDetailModal = false;
    this.cdr.detectChanges();
  }

  // Helper para las iniciales del mesero responsable
  getInitials(nombres?: string, apellidos?: string): string {
    const n = nombres || '';
    const a = apellidos || '';
    const i1 = n[0] ? n[0].toUpperCase() : '';
    const i2 = a[0] ? a[0].toUpperCase() : '';
    return i1 + i2 || 'E';
  }
}
export { OrderHistoryComponent as OrderHistory };
