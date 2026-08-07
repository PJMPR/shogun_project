import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'schedule',
    loadComponent: () =>
      import('./schedule/schedule.component').then((m) => m.ScheduleComponent),
  },
  { path: '', redirectTo: 'schedule', pathMatch: 'full' },
];
