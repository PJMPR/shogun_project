import { Routes } from '@angular/router';
import { provideUiTour } from 'ngx-ui-tour-primeng';

export default [
  {
    path: '',
    providers: [provideUiTour()],
    loadComponent: () =>
      import('../obsady/obsady.component').then((m) => m.ObsadyComponent),
  },
] as Routes;
