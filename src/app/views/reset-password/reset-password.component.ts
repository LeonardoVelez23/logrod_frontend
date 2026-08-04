import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  template: ''
})
export class ResetPasswordComponent implements OnInit {
  private router = inject(Router);

  ngOnInit() {
    // El flujo de restablecimiento ahora usa OTP desde la pantalla de forgot-password
    this.router.navigate(['/forgot-password']);
  }
}
export { ResetPasswordComponent as ResetPassword };
