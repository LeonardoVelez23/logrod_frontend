import { TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect, vi } from 'vitest';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ToastService]
    });
    service = TestBed.inject(ToastService);
  });

  it('debe crearse correctamente', () => {
    expect(service).toBeTruthy();
    expect(service.toasts()).toEqual([]);
  });

  it('show() debe agregar un toast a la lista', () => {
    service.show('Mensaje de prueba', 'info', 5000);
    const toasts = service.toasts();
    expect(toasts.length).toBe(1);
    expect(toasts[0].message).toBe('Mensaje de prueba');
    expect(toasts[0].type).toBe('info');
  });

  it('showSuccess, showError, showWarning, showInfo deben agregar toasts con sus tipos respectivos', () => {
    service.showSuccess('Éxito');
    service.showError('Error');
    service.showWarning('Advertencia');
    service.showInfo('Información');

    const toasts = service.toasts();
    expect(toasts.length).toBe(4);
    expect(toasts[0].type).toBe('success');
    expect(toasts[1].type).toBe('danger');
    expect(toasts[2].type).toBe('warning');
    expect(toasts[3].type).toBe('info');
  });

  it('remove() debe eliminar un toast por su ID', () => {
    service.showSuccess('Toast 1');
    service.showSuccess('Toast 2');

    const initialToasts = service.toasts();
    const idToRemove = initialToasts[0].id;

    service.remove(idToRemove);

    const remainingToasts = service.toasts();
    expect(remainingToasts.length).toBe(1);
    expect(remainingToasts.find(t => t.id === idToRemove)).toBeUndefined();
  });

  it('debe rematarse automáticamente después del tiempo configurado', () => {
    vi.useFakeTimers();
    service.show('Toast temporal', 'info', 2000);
    expect(service.toasts().length).toBe(1);

    vi.advanceTimersByTime(2000);

    expect(service.toasts().length).toBe(0);
    vi.useRealTimers();
  });
});
