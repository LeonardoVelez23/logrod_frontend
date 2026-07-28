import { Routes } from '@angular/router';
import { MainLayout } from './views/main-layout/main-layout.component';
import { Login } from './views/login/login.component';
import { Catalog } from './views/catalog/catalog.component';
import { Tracking } from './views/tracking/tracking.component';
import { Dashboard } from './views/admin/dashboard/dashboard.component';
import { Products } from './views/admin/products/products.component';
import { Orders } from './views/admin/orders/orders.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: Login },
  {
    path: '',
    component: MainLayout,
    children: [
      { path: 'catalog', component: Catalog },
      { path: 'tracking', component: Tracking },
      { path: 'admin/dashboard', component: Dashboard },
      { path: 'admin/products', component: Products },
      { path: 'admin/orders', component: Orders }
    ]
  },
  { path: '**', redirectTo: 'login' }
];
