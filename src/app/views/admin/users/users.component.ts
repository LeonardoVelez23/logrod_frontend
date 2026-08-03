import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { EmployeeService, Empleado } from '../../../services/employee.service';
import { ClientService, Cliente } from '../../../services/client.service';
import { AuthService } from '../../../services/auth.service';
import { ModalComponent } from '../../../components/modal/modal.component';
import { ToastService } from '../../../services/toast.service';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalComponent],
  templateUrl: './users.component.html',
  styleUrl: './users.component.css'
})

export class UsersComponent implements OnInit {
  private employeeService = inject(EmployeeService);
  private clientService = inject(ClientService);
  private authService = inject(AuthService);
  private toastService = inject(ToastService);

  private cdr = inject(ChangeDetectorRef);

  activeTab: 'empleados' | 'clientes' = 'empleados';

  empleados: Empleado[] = [];
  clientes: Cliente[] = [];

  searchTerm: string = '';

  // Control de Modal de Edición/Creación
  showModal: boolean = false;
  isEditMode: boolean = false;
  currentUserId?: number;
  saving: boolean = false;

  // Control de Modal de Eliminación
  showDeleteModal: boolean = false;
  empleadoToDelete: Empleado | null = null;
  clienteToDelete: Cliente | null = null;
  deleting: boolean = false;

  empleadoForm = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    cargo: '',
    turno_trabajo: '',
    contrasenia: ''
  };

  clienteForm = {
    identificacion: '',
    nombres: '',
    apellidos: '',
    correo_electronico: '',
    telefono: '',
    tipo_cliente: 'Persona externa' as 'Estudiante' | 'Docente' | 'Personal Administrativo' | 'Persona externa',
    contrasenia: ''
  };

  ngOnInit() {
    this.loadEmpleados();
    this.loadClientes();
  }

  setActiveTab(tab: 'empleados' | 'clientes') {
    this.activeTab = tab;
    this.searchTerm = '';
  }

  loadEmpleados() {
    this.employeeService.getEmpleados().subscribe({
      next: (response) => {
        if (response.success) {
          this.empleados = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar empleados:', err);
      }
    });
  }

  loadClientes() {
    this.clientService.getClientes().subscribe({
      next: (response) => {
        if (response.success) {
          this.clientes = response.data;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error al cargar clientes:', err);
      }
    });
  }

  getEmpleadosFiltrados(): Empleado[] {
    return this.empleados
      .filter(emp => {
        const term = this.searchTerm.trim().toLowerCase();
        if (!term) return true;
        return emp.nombres.toLowerCase().includes(term) ||
          emp.apellidos.toLowerCase().includes(term) ||
          emp.correo_electronico.toLowerCase().includes(term) ||
          emp.identificacion.toLowerCase().includes(term);
      })
      // Los administradores siempre se muestran primero
      .sort((a, b) => Number(this.esAdmin(b.cargo)) - Number(this.esAdmin(a.cargo)));
  }

  getClientesFiltrados(): Cliente[] {
    return this.clientes.filter(cli => {
      const term = this.searchTerm.trim().toLowerCase();
      if (!term) return true;
      return cli.nombres.toLowerCase().includes(term) ||
        cli.apellidos.toLowerCase().includes(term) ||
        cli.correo_electronico.toLowerCase().includes(term) ||
        cli.identificacion.toLowerCase().includes(term);
    });
  }

  // Filtra cualquier caracter no numérico y recorta a la longitud máxima (usado en Identificación y Teléfono)
  soloDigitos(value: string, maxLen: number): string {
    return (value || '').replace(/\D/g, '').slice(0, maxLen);
  }

  // Bloquea la tecla antes de que se escriba si no es un dígito (evita que se vea texto en el campo)
  bloquearNoNumerico(event: KeyboardEvent) {
    const teclasPermitidas = ['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (teclasPermitidas.includes(event.key) || event.ctrlKey || event.metaKey) {
      return;
    }
    if (!/^\d$/.test(event.key)) {
      event.preventDefault();
    }
  }

  // Valida que el teléfono tenga 10 dígitos e inicie en 0 (Ej. 0961921004)
  private telefonoValido(telefono: string): boolean {
    return /^0\d{9}$/.test(telefono);
  }

  // Determina si el cargo de un empleado le da acceso de administrador
  esAdmin(cargo?: string): boolean {
    const c = cargo?.toLowerCase() || '';
    return c === 'admin' || c === 'administrador';
  }

  // Normaliza el cargo para mostrarlo dentro del badge: respeta puestos reales (Mesero, Cocinero,
  // Cajero) y homogeneiza los valores antiguos/genéricos (admin, empleado, vacío)
  cargoMostrar(cargo?: string): string {
    const c = cargo?.trim().toLowerCase() || '';
    if (c === 'admin' || c === 'administrador') return 'Administrador';
    if (c === '' || c === 'empleado') return 'Empleado';
    return cargo!.trim();
  }

  // Evita que el admin autenticado se elimine (o se quite) a sí mismo por error
  esUsuarioActual(id?: number): boolean {
    const current = this.authService.currentUser();
    return !!current && !!id && current.id === id && current.rol !== 'cliente';
  }

  // ----- Modal Crear/Editar -----

  openAddModal() {
    this.isEditMode = false;
    this.currentUserId = undefined;
    if (this.activeTab === 'empleados') {
      this.empleadoForm = {
        identificacion: '', nombres: '', apellidos: '', correo_electronico: '',
        telefono: '', cargo: '', turno_trabajo: '', contrasenia: ''
      };
    } else {
      this.clienteForm = {
        identificacion: '', nombres: '', apellidos: '', correo_electronico: '',
        telefono: '', tipo_cliente: 'Persona externa', contrasenia: ''
      };
    }
    this.showModal = true;
    this.cdr.detectChanges();
  }

  openEditModal(user: Empleado | Cliente) {
    this.isEditMode = true;
    this.currentUserId = user.id;
    if (this.activeTab === 'empleados') {
      const emp = user as Empleado;
      this.empleadoForm = {
        identificacion: emp.identificacion,
        nombres: emp.nombres,
        apellidos: emp.apellidos,
        correo_electronico: emp.correo_electronico,
        telefono: emp.telefono || '',
        cargo: emp.cargo || '',
        turno_trabajo: emp.turno_trabajo || '',
        contrasenia: ''
      };
    } else {
      const cli = user as Cliente;
      this.clienteForm = {
        identificacion: cli.identificacion,
        nombres: cli.nombres,
        apellidos: cli.apellidos,
        correo_electronico: cli.correo_electronico,
        telefono: cli.telefono || '',
        tipo_cliente: cli.tipo_cliente || 'Persona externa',
        contrasenia: ''
      };
    }
    this.showModal = true;
    this.cdr.detectChanges();
  }

  closeModal() {
    if (this.saving) return;
    this.showModal = false;
    this.cdr.detectChanges();
  }

  onSubmit() {
    if (this.saving) return;
    if (this.activeTab === 'empleados') {
      this.submitEmpleado();
    } else {
      this.submitCliente();
    }
  }

  private submitEmpleado() {
    const form = this.empleadoForm;
    if (!form.identificacion.trim() || !form.nombres.trim() || !form.apellidos.trim() || !form.correo_electronico.trim()) {
      this.toastService.showWarning('Identificación, nombres, apellidos y correo electrónico son obligatorios.');
      return;
    }
    if (form.identificacion.trim().length !== 10) {
      this.toastService.showWarning('La identificación debe tener 10 dígitos.');
      return;
    }
    if (form.telefono.trim() && !this.telefonoValido(form.telefono.trim())) {
      this.toastService.showWarning('El teléfono debe tener 10 dígitos e iniciar en 0. Ej. 0961921004');
      return;
    }
    if (!this.isEditMode && !form.contrasenia.trim()) {
      this.toastService.showWarning('La contraseña es obligatoria para crear un nuevo empleado.');
      return;
    }

    const payload: Omit<Empleado, 'id'> = {
      identificacion: form.identificacion.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      correo_electronico: form.correo_electronico.trim(),
      telefono: form.telefono.trim() || undefined,
      cargo: form.cargo.trim() || undefined,
      turno_trabajo: form.turno_trabajo.trim() || undefined
    };
    if (form.contrasenia.trim()) {
      payload.contrasenia = form.contrasenia.trim();
    }

    this.saving = true;
    this.cdr.detectChanges();

    if (this.isEditMode && this.currentUserId !== undefined) {
      this.employeeService.updateEmpleado(this.currentUserId, payload).subscribe({
        next: (response) => {
          this.saving = false;
          if (response.success) {
            this.loadEmpleados();
            this.showModal = false;
            this.toastService.showSuccess('Empleado actualizado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toastService.showError('Error al actualizar el empleado: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.employeeService.createEmpleado(payload).subscribe({
        next: (response) => {
          this.saving = false;
          if (response.success) {
            this.loadEmpleados();
            this.showModal = false;
            this.toastService.showSuccess('Empleado creado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toastService.showError('Error al crear el empleado: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  private submitCliente() {
    const form = this.clienteForm;
    if (!form.identificacion.trim() || !form.nombres.trim() || !form.apellidos.trim() || !form.correo_electronico.trim()) {
      this.toastService.showWarning('Identificación, nombres, apellidos y correo electrónico son obligatorios.');
      return;
    }
    if (form.identificacion.trim().length !== 10) {
      this.toastService.showWarning('La identificación debe tener 10 dígitos.');
      return;
    }
    if (form.telefono.trim() && !this.telefonoValido(form.telefono.trim())) {
      this.toastService.showWarning('El teléfono debe tener 10 dígitos e iniciar en 0. Ej. 0961921004');
      return;
    }
    if (!this.isEditMode && !form.contrasenia.trim()) {
      this.toastService.showWarning('La contraseña es obligatoria para crear un nuevo cliente.');
      return;
    }

    const payload: Omit<Cliente, 'id'> = {
      identificacion: form.identificacion.trim(),
      nombres: form.nombres.trim(),
      apellidos: form.apellidos.trim(),
      correo_electronico: form.correo_electronico.trim(),
      telefono: form.telefono.trim() || undefined,
      tipo_cliente: form.tipo_cliente
    };
    if (form.contrasenia.trim()) {
      payload.contrasenia = form.contrasenia.trim();
    }

    this.saving = true;
    this.cdr.detectChanges();

    if (this.isEditMode && this.currentUserId !== undefined) {
      this.clientService.updateCliente(this.currentUserId, payload).subscribe({
        next: (response) => {
          this.saving = false;
          if (response.success) {
            this.loadClientes();
            this.showModal = false;
            this.toastService.showSuccess('Cliente actualizado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toastService.showError('Error al actualizar el cliente: ' + (err.error?.message || err.message));
        }
      });
    } else {
      this.clientService.createCliente(payload).subscribe({
        next: (response) => {
          this.saving = false;
          if (response.success) {
            this.loadClientes();
            this.showModal = false;
            this.toastService.showSuccess('Cliente creado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.saving = false;
          this.cdr.detectChanges();
          this.toastService.showError('Error al crear el cliente: ' + (err.error?.message || err.message));
        }
      });
    }
  }

  // ----- Modal Eliminar -----

  openDeleteModal(user: Empleado | Cliente) {
    if (this.activeTab === 'empleados') {
      this.empleadoToDelete = user as Empleado;
    } else {
      this.clienteToDelete = user as Cliente;
    }
    this.showDeleteModal = true;
    this.cdr.detectChanges();
  }

  closeDeleteModal() {
    if (this.deleting) return;
    this.showDeleteModal = false;
    this.empleadoToDelete = null;
    this.clienteToDelete = null;
    this.cdr.detectChanges();
  }

  confirmDelete() {
    if (this.deleting) return;

    if (this.activeTab === 'empleados') {
      if (!this.empleadoToDelete || this.empleadoToDelete.id === undefined) return;
      const id = this.empleadoToDelete.id;
      this.deleting = true;
      this.cdr.detectChanges();
      this.employeeService.deleteEmpleado(id).subscribe({
        next: (response) => {
          this.deleting = false;
          if (response.success) {
            this.loadEmpleados();
            this.showDeleteModal = false;
            this.empleadoToDelete = null;
            this.toastService.showSuccess('Empleado eliminado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.deleting = false;
          this.showDeleteModal = false;
          this.empleadoToDelete = null;
          this.cdr.detectChanges();
          this.toastService.showError('Error al eliminar el empleado: ' + (err.error?.message || err.message));
        }
      });
    } else {
      if (!this.clienteToDelete || this.clienteToDelete.id === undefined) return;
      const id = this.clienteToDelete.id;
      this.deleting = true;
      this.cdr.detectChanges();
      this.clientService.deleteCliente(id).subscribe({
        next: (response) => {
          this.deleting = false;
          if (response.success) {
            this.loadClientes();
            this.showDeleteModal = false;
            this.clienteToDelete = null;
            this.toastService.showSuccess('Cliente eliminado correctamente.');
          }
          this.cdr.detectChanges();
        },
        error: (err) => {
          this.deleting = false;
          this.showDeleteModal = false;
          this.clienteToDelete = null;
          this.cdr.detectChanges();
          this.toastService.showError('Error al eliminar el cliente: ' + (err.error?.message || err.message));
        }
      });
    }
  }
}
export { UsersComponent as Users };
