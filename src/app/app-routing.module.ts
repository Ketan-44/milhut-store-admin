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
        redirectTo: '/dashboard',
        pathMatch: 'full'
      },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((c) => c.DashboardComponent),
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
        path: 'products/:id/edit',
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
      {
        path: 'inventory/conversion',
        loadComponent: () => import('./features/inventory/inventory-conversion/inventory-conversion.component').then((c) => c.InventoryConversionComponent),
        canActivate: [authGuard]
      },
      {
        path: 'inventory/:id/edit',
        loadComponent: () => import('./features/inventory/inventory-edit/inventory-edit.component').then((c) => c.InventoryEditComponent),
        canActivate: [authGuard]
      },
      {
        path: 'production',
        loadComponent: () => import('./features/production/production-page/production-page.component').then((c) => c.ProductionPageComponent),
        canActivate: [authGuard]
      },
      {
        path: 'production/recipes/create',
        loadComponent: () => import('./features/production/recipe-form/recipe-form.component').then((c) => c.RecipeFormComponent),
        canActivate: [authGuard]
      },
      {
        path: 'production/recipes/:id/edit',
        loadComponent: () => import('./features/production/recipe-form/recipe-form.component').then((c) => c.RecipeFormComponent),
        canActivate: [authGuard]
      },
      {
        path: 'transactions',
        loadComponent: () => import('./features/transactions/transaction-page/transaction-page.component').then((c) => c.TransactionPageComponent),
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
