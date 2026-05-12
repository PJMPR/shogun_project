import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../obsady/obsady.component').then((m) => m.ObsadyComponent),
  },
] as Routes;
