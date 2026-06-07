// angular import
import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';

// Project import
import { AdminLayout } from './theme/layouts/admin-layout/admin-layout.component';
import { GuestLayoutComponent } from './theme/layouts/guest-layout/guest-layout.component';
import { authGuard } from './theme/shared/guards/auth.guard';
import { guestGuard } from './theme/shared/guards/guest.guard';

const routes: Routes = [
  {
    path: '',
    component: AdminLayout,
    children: [
      {
        path: '',
        redirectTo: '/dashboard/default',
        pathMatch: 'full'
      },
      {
        path: 'dashboard/default',
        loadComponent: () => import('./features/dashboard/default/default.component').then((c) => c.DefaultComponent),
        canActivate: [authGuard]
      },
      {
        path: 'users',
        loadComponent: () => import('./features/users/user-list/user-list.component').then((c) => c.UserListComponent),
        canActivate: [authGuard]
      },
      {
        path: 'products',
        loadComponent: () => import('./features/products/product-list/product-list.component').then((c) => c.ProductListComponent),
        canActivate: [authGuard]
      },
      {
        path: 'products/create',
        loadComponent: () => import('./features/products/product-form/product-form.component').then((c) => c.ProductFormComponent),
        canActivate: [authGuard]
      },
      {
        path: 'inventory',
        loadComponent: () => import('./features/inventory/inventory-list/inventory-list.component').then((c) => c.InventoryListComponent),
        canActivate: [authGuard]
      },
      {
        path: 'inventory/create',
        loadComponent: () => import('./features/inventory/inventory-form/inventory-form.component').then((c) => c.InventoryFormComponent),
        canActivate: [authGuard]
      },
    ]
  },
  {
    path: '',
    component: GuestLayoutComponent,
    canActivate: [guestGuard],
    children: [
      {
        path: 'login',
        loadComponent: () => import('./features/authentication/auth-login/auth-login.component').then((c) => c.AuthLoginComponent)
      },
      // {
      //   path: 'register',
      //   loadComponent: () =>
      //     import('./demo/pages/authentication/auth-register/auth-register.component').then((c) => c.AuthRegisterComponent)
      // }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
