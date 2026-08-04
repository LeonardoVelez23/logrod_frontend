import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, beforeEach, it, expect } from 'vitest';
import { ToastComponent } from './toast.component';
import { ToastService } from '../../services/toast.service';

describe('ToastComponent', () => {
  let component: ToastComponent;
  let fixture: ComponentFixture<ToastComponent>;
  let toastService: ToastService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ToastComponent],
      providers: [ToastService]
    }).compileComponents();

    fixture = TestBed.createComponent(ToastComponent);
    component = fixture.componentInstance;
    toastService = TestBed.inject(ToastService);
    fixture.detectChanges();
  });

  it('debe crearse correctamente', () => {
    expect(component).toBeTruthy();
  });

  it('debe renderizar los toasts presentes en el ToastService', () => {
    toastService.showSuccess('Operación exitosa');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Operación exitosa');
  });

  it('debe llamar a toastService.remove al presionar el botón de cerrar', () => {
    toastService.showSuccess('Toast a cerrar');
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const closeBtn = compiled.querySelector('button.toast-close');
    expect(closeBtn).toBeTruthy();

    closeBtn?.dispatchEvent(new Event('click'));
    fixture.detectChanges();

    expect(toastService.toasts().length).toBe(0);
  });
});
