import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'syllabi',
    children: [
      {
        path: 'nowy',
        loadComponent: () =>
          import('./sylabus/nowy/nowy-sylabus.component').then((m) => m.NowySylabusComponent),
      },
      {
        path: 'edytuj',
        loadComponent: () =>
          import('./sylabus/edytuj/edytuj-sylabus.component').then((m) => m.EdytujSylabusComponent),
      },
      { path: '', redirectTo: 'nowy', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'syllabi', pathMatch: 'full' },
];
