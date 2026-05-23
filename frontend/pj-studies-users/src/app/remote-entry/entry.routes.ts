import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../components/users/users.component').then((m) => m.UsersComponent),
  },
  {
    path: 'roles',
    loadComponent: () =>
      import('../components/roles-management/roles-management.component').then((m) => m.RolesManagementComponent),
  },
] as Routes;
