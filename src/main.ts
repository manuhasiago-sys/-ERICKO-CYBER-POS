import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, Routes } from '@angular/router';
import { LayoutComponent } from './app/components/layout/layout.component';
import { DashboardComponent } from './app/components/dashboard/dashboard.component';
import { PosComponent } from './pos/pos.component';
import { ProductsComponent } from './app/components/products/products.component';
import { CustomersComponent } from './app/components/customers/customers.component';
import { SalesComponent } from './app/components/sales/sales.component';
import { SettingsComponent } from './app/components/settings/settings.component';

import { CategoriesComponent } from './app/components/categories/categories.component';

const routes: Routes = [
  { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'pos', component: PosComponent },
  { path: 'products', component: ProductsComponent },
  { path: 'categories', component: CategoriesComponent },
  { path: 'customers', component: CustomersComponent },
  { path: 'sales', component: SalesComponent },
  { path: 'settings', component: SettingsComponent },
  { path: '**', redirectTo: 'dashboard' }
];

bootstrapApplication(LayoutComponent, {
  providers: [
    provideRouter(routes)
  ]
}).catch(err => console.error(err));
