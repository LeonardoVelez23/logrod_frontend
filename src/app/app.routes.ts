import { Routes } from '@angular/router';
import { MainLayout } from './views/main-layout/main-layout.component';
import { Login } from './views/login/login.component';
import { Catalog } from './views/catalog/catalog.component';
import { Tracking } from './views/tracking/tracking.component';
import { Dashboard } from './views/admin/dashboard/dashboard.component';
import { Products } from './views/admin/products/products.component';
import { Orders } from './views/admin/orders/orders.component';
import { authGuard, roleGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'catalog', pathMatch: 'full' },
      { path: 'catalog', component: Catalog },
      { path: 'tracking', component: Tracking },
      { 
        path: 'admin/dashboard', 
        component: Dashboard, 
        canActivate: [roleGuard(['admin', 'empleado'])] 
      },
      { 
        path: 'admin/products', 
        component: Products, 
        canActivate: [roleGuard(['admin'])] 
      },
      { 
        path: 'admin/orders', 
        component: Orders, 
        canActivate: [roleGuard(['admin', 'empleado'])] 
      }
    ]
  },
  { path: '**', redirectTo: 'catalog' }
];
