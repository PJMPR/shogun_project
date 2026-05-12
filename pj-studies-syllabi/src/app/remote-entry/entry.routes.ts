import { Routes } from '@angular/router';

export default [
  {
    path: 'nowy',
    loadComponent: () =>
      import('../sylabus/nowy/nowy-sylabus.component').then((m) => m.NowySylabusComponent),
  },
  {
    path: 'edytuj',
    loadComponent: () =>
      import('../sylabus/edytuj/edytuj-sylabus.component').then((m) => m.EdytujSylabusComponent),
  },
  { path: '', redirectTo: 'nowy', pathMatch: 'full' },
] as Routes;
