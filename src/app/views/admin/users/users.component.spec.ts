import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { UsersComponent } from './users.component';
import { EmployeeService, Empleado } from '../../../services/employee.service';
import { ClientService, Cliente } from '../../../services/client.service';
import { AuthService } from '../../../services/auth.service';
import { ToastService } from '../../../services/toast.service';

describe('UsersComponent (Admin)', () => {
  let component: UsersComponent;
  let fixture: ComponentFixture<UsersComponent>;
  let employeeServiceSpy: any;
  let clientServiceSpy: any;
  let authServiceSpy: any;
  let toastServiceSpy: any;

  const mockEmpleados: Empleado[] = [
    { id: 1, identificacion: '1234567890', nombres: 'Carlos', apellidos: 'Admin', correo_electronico: 'admin@test.com', cargo: 'Admin', telefono: '0987654321' },
    { id: 2, identificacion: '0987654321', nombres: 'Ana', apellidos: 'Cajera', correo_electronico: 'ana@test.com', cargo: 'Cajero', telefono: '0987654322' }
  ];

  const mockClientes: Cliente[] = [
    { id: 10, identificacion: '1122334455', nombres: 'Pedro', apellidos: 'Cliente', correo_electronico: 'pedro@test.com', tipo_cliente: 'Estudiante', telefono: '0987654323' }
  ];

  beforeEach(async () => {
    employeeServiceSpy = {
      getEmpleados: vi.fn().mockReturnValue(of({ success: true, data: mockEmpleados })),
      createEmpleado: vi.fn(),
      updateEmpleado: vi.fn(),
      deleteEmpleado: vi.fn()
    };
    clientServiceSpy = {
      getClientes: vi.fn().mockReturnValue(of({ success: true, data: mockClientes })),
      createCliente: vi.fn(),
      updateCliente: vi.fn(),
      deleteCliente: vi.fn()
    };
    authServiceSpy = {
      currentUser: vi.fn().mockReturnValue({ id: 1, rol: 'admin' })
    };
    toastServiceSpy = {
      showSuccess: vi.fn(),
      showError: vi.fn(),
      showWarning: vi.fn()
    };

    await TestBed.configureTestingModule({
      imports: [UsersComponent],
      providers: [
        { provide: EmployeeService, useValue: employeeServiceSpy },
        { provide: ClientService, useValue: clientServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: ToastService, useValue: toastServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UsersComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('debe crearse y cargar empleados y clientes', () => {
    expect(component).toBeTruthy();
    expect(employeeServiceSpy.getEmpleados).toHaveBeenCalled();
    expect(clientServiceSpy.getClientes).toHaveBeenCalled();
    expect(component.empleados.length).toBe(2);
    expect(component.clientes.length).toBe(1);
  });

  it('setActiveTab debe alternar la pestaña activa y limpiar la búsqueda', () => {
    component.searchTerm = 'Carlos';
    component.setActiveTab('clientes');
    expect(component.activeTab).toBe('clientes');
    expect(component.searchTerm).toBe('');

    expect(component.getClientesFiltrados().length).toBe(1);
    expect(component.getEmpleadosFiltrados().length).toBe(2);
  });

  it('soloDigitos y bloquearNoNumerico deben restringir la entrada de caracteres', () => {
    expect(component.soloDigitos('abc123def456', 5)).toBe('12345');

    const eventAllow = { key: '5', preventDefault: vi.fn() } as any;
    component.bloquearNoNumerico(eventAllow);
    expect(eventAllow.preventDefault).not.toHaveBeenCalled();

    const eventBlock = { key: 'a', preventDefault: vi.fn() } as any;
    component.bloquearNoNumerico(eventBlock);
    expect(eventBlock.preventDefault).toHaveBeenCalled();
  });

  it('esAdmin y cargoMostrar deben identificar y formatear cargos de empleados', () => {
    expect(component.esAdmin('Admin')).toBe(true);
    expect(component.esAdmin('Cajero')).toBe(false);
    expect(component.cargoMostrar('admin')).toBe('Administrador');
    expect(component.cargoMostrar('Cajero')).toBe('Cajero');
    expect(component.cargoMostrar('')).toBe('Empleado');
  });

  it('esUsuarioActual debe identificar si el ID coincide con el usuario autenticado', () => {
    expect(component.esUsuarioActual(1)).toBe(true);
    expect(component.esUsuarioActual(2)).toBe(false);
  });

  it('openAddModal y openEditModal para empleado y cliente', () => {
    component.setActiveTab('empleados');
    component.openAddModal();
    expect(component.showModal).toBe(true);

    component.openEditModal(mockEmpleados[0]);
    expect(component.isEditMode).toBe(true);
    expect(component.empleadoForm.identificacion).toBe('1234567890');

    component.setActiveTab('clientes');
    component.openAddModal();
    expect(component.showModal).toBe(true);

    component.openEditModal(mockClientes[0]);
    expect(component.isEditMode).toBe(true);
    expect(component.clienteForm.identificacion).toBe('1122334455');
  });

  it('submitEmpleado validaciones y edición', () => {
    component.setActiveTab('empleados');
    component.openAddModal();

    // Campos vacíos
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalled();

    // Identificación < 10
    component.empleadoForm = { identificacion: '123', nombres: 'A', apellidos: 'B', correo_electronico: 'a@b.com', telefono: '', cargo: '', turno_trabajo: '', contrasenia: '' };
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La identificación debe tener 10 dígitos.');

    // Contraseña requerida en creación
    component.empleadoForm.identificacion = '1234567890';
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La contraseña es obligatoria para crear un nuevo empleado.');

    // Exito creación
    component.empleadoForm.contrasenia = 'Pass123!';
    employeeServiceSpy.createEmpleado.mockReturnValue(of({ success: true }));
    component.onSubmit();
    expect(employeeServiceSpy.createEmpleado).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();

    // Edición
    component.openEditModal(mockEmpleados[0]);
    employeeServiceSpy.updateEmpleado.mockReturnValue(of({ success: true }));
    component.onSubmit();
    expect(employeeServiceSpy.updateEmpleado).toHaveBeenCalled();
  });

  it('submitCliente validaciones y creación/edición', () => {
    component.setActiveTab('clientes');
    component.openAddModal();

    component.clienteForm = {
      identificacion: '1122334455',
      nombres: 'María',
      apellidos: 'López',
      correo_electronico: 'maria@test.com',
      telefono: '0987654321',
      tipo_cliente: 'Estudiante',
      contrasenia: 'Pass123!'
    };

    clientServiceSpy.createCliente.mockReturnValue(of({ success: true }));
    component.onSubmit();
    expect(clientServiceSpy.createCliente).toHaveBeenCalled();
    expect(toastServiceSpy.showSuccess).toHaveBeenCalled();

    component.openEditModal(mockClientes[0]);
    clientServiceSpy.updateCliente.mockReturnValue(of({ success: true }));
    component.onSubmit();
    expect(clientServiceSpy.updateCliente).toHaveBeenCalled();
  });

  it('confirmDelete para empleado y cliente', () => {
    component.setActiveTab('empleados');
    component.openDeleteModal(mockEmpleados[1]);
    employeeServiceSpy.deleteEmpleado.mockReturnValue(of({ success: true }));
    component.confirmDelete();
    expect(employeeServiceSpy.deleteEmpleado).toHaveBeenCalledWith(2);

    component.setActiveTab('clientes');
    component.openDeleteModal(mockClientes[0]);
    clientServiceSpy.deleteCliente.mockReturnValue(of({ success: true }));
    component.confirmDelete();
    expect(clientServiceSpy.deleteCliente).toHaveBeenCalledWith(10);
  });

  it('loadEmpleados y loadClientes deben manejar errores de carga', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    employeeServiceSpy.getEmpleados.mockReturnValue(throwError(() => new Error('fallo empleados')));
    clientServiceSpy.getClientes.mockReturnValue(throwError(() => new Error('fallo clientes')));

    component.loadEmpleados();
    component.loadClientes();

    expect(consoleErrorSpy).toHaveBeenCalledTimes(2);
    consoleErrorSpy.mockRestore();
  });

  it('getEmpleadosFiltrados debe filtrar por término de búsqueda y priorizar administradores', () => {
    component.searchTerm = 'ana';
    expect(component.getEmpleadosFiltrados().map(e => e.id)).toEqual([2]);

    component.searchTerm = '';
    expect(component.getEmpleadosFiltrados().map(e => e.id)).toEqual([1, 2]); // Admin (id 1) primero
  });

  it('getClientesFiltrados debe filtrar por término de búsqueda', () => {
    component.searchTerm = 'pedro';
    expect(component.getClientesFiltrados().length).toBe(1);

    component.searchTerm = 'inexistente';
    expect(component.getClientesFiltrados().length).toBe(0);
  });

  it('bloquearNoNumerico debe permitir combinaciones con Ctrl/Meta', () => {
    const eventCtrl = { key: 'v', ctrlKey: true, preventDefault: vi.fn() } as any;
    component.bloquearNoNumerico(eventCtrl);
    expect(eventCtrl.preventDefault).not.toHaveBeenCalled();

    const eventMeta = { key: 'c', metaKey: true, preventDefault: vi.fn() } as any;
    component.bloquearNoNumerico(eventMeta);
    expect(eventMeta.preventDefault).not.toHaveBeenCalled();
  });

  it('esUsuarioActual debe ser falso si el usuario autenticado es un cliente', () => {
    authServiceSpy.currentUser.mockReturnValue({ id: 1, rol: 'cliente' });
    expect(component.esUsuarioActual(1)).toBe(false);
  });

  it('closeModal y closeDeleteModal no deben cerrar mientras se está guardando/eliminando', () => {
    component.showModal = true;
    component.saving = true;
    component.closeModal();
    expect(component.showModal).toBe(true);

    component.saving = false;
    component.closeModal();
    expect(component.showModal).toBe(false);

    component.showDeleteModal = true;
    component.deleting = true;
    component.closeDeleteModal();
    expect(component.showDeleteModal).toBe(true);

    component.deleting = false;
    component.closeDeleteModal();
    expect(component.showDeleteModal).toBe(false);
  });

  it('submitEmpleado debe validar el formato del teléfono', () => {
    component.setActiveTab('empleados');
    component.openAddModal();
    component.empleadoForm = { identificacion: '1234567890', nombres: 'A', apellidos: 'B', correo_electronico: 'a@b.com', telefono: '123', cargo: '', turno_trabajo: '', contrasenia: 'Pass123!' };

    component.onSubmit();

    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('El teléfono debe tener 10 dígitos e iniciar en 0. Ej. 0961921004');
  });

  it('submitEmpleado debe notificar error si falla la creación o actualización', () => {
    component.setActiveTab('empleados');
    component.openAddModal();
    component.empleadoForm = { identificacion: '1234567890', nombres: 'A', apellidos: 'B', correo_electronico: 'a@b.com', telefono: '', cargo: '', turno_trabajo: '', contrasenia: 'Pass123!' };
    employeeServiceSpy.createEmpleado.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));

    component.onSubmit();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al crear el empleado: fallo');
    expect(component.saving).toBe(false);

    component.openEditModal(mockEmpleados[0]);
    employeeServiceSpy.updateEmpleado.mockReturnValue(throwError(() => ({ error: { message: 'fallo update' } })));
    component.onSubmit();

    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al actualizar el empleado: fallo update');
  });

  it('submitCliente debe validar teléfono y notificar error si falla la creación o actualización', () => {
    component.setActiveTab('clientes');
    component.openAddModal();
    component.clienteForm = { identificacion: '1122334455', nombres: 'A', apellidos: 'B', correo_electronico: 'a@b.com', telefono: '123', tipo_cliente: 'Estudiante', contrasenia: 'Pass123!' };
    component.onSubmit();
    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('El teléfono debe tener 10 dígitos e iniciar en 0. Ej. 0961921004');

    component.clienteForm.telefono = '';
    clientServiceSpy.createCliente.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));
    component.onSubmit();
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al crear el cliente: fallo');

    component.openEditModal(mockClientes[0]);
    clientServiceSpy.updateCliente.mockReturnValue(throwError(() => ({ error: { message: 'fallo update' } })));
    component.onSubmit();
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al actualizar el cliente: fallo update');
  });

  it('submitCliente debe requerir contraseña solo al crear', () => {
    component.setActiveTab('clientes');
    component.openAddModal();
    component.clienteForm = { identificacion: '1122334455', nombres: 'A', apellidos: 'B', correo_electronico: 'a@b.com', telefono: '', tipo_cliente: 'Estudiante', contrasenia: '' };

    component.onSubmit();

    expect(toastServiceSpy.showWarning).toHaveBeenCalledWith('La contraseña es obligatoria para crear un nuevo cliente.');
  });

  it('confirmDelete no debe hacer nada si ya se está eliminando o no hay usuario seleccionado', () => {
    component.setActiveTab('empleados');
    component.empleadoToDelete = null;
    component.confirmDelete();
    expect(employeeServiceSpy.deleteEmpleado).not.toHaveBeenCalled();

    component.deleting = true;
    component.confirmDelete();
    expect(employeeServiceSpy.deleteEmpleado).not.toHaveBeenCalled();
    component.deleting = false;
  });

  it('confirmDelete debe notificar error si falla la eliminación de empleado o cliente', () => {
    component.setActiveTab('empleados');
    component.openDeleteModal(mockEmpleados[1]);
    employeeServiceSpy.deleteEmpleado.mockReturnValue(throwError(() => ({ error: { message: 'fallo' } })));
    component.confirmDelete();
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al eliminar el empleado: fallo');
    expect(component.showDeleteModal).toBe(false);

    component.setActiveTab('clientes');
    component.openDeleteModal(mockClientes[0]);
    clientServiceSpy.deleteCliente.mockReturnValue(throwError(() => ({ error: { message: 'fallo cliente' } })));
    component.confirmDelete();
    expect(toastServiceSpy.showError).toHaveBeenCalledWith('Error al eliminar el cliente: fallo cliente');
  });
});
