import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../components/users/users.component').then((m) => m.UsersComponent),
  },
] as Routes;
