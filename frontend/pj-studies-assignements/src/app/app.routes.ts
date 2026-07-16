import { Routes } from '@angular/router';
import { provideUiTour } from 'ngx-ui-tour-primeng';

export const routes: Routes = [
  {
    path: 'assignements',
    providers: [provideUiTour()],
    loadComponent: () =>
      import('./obsady/obsady.component').then((m) => m.ObsadyComponent),
  },
  { path: '', redirectTo: 'assignements', pathMatch: 'full' },
];
