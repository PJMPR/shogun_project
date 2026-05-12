import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'assignements',
    loadComponent: () =>
      import('./obsady/obsady.component').then((m) => m.ObsadyComponent),
  },
  { path: '', redirectTo: 'assignements', pathMatch: 'full' },
];
