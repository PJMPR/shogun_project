import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../schedule/schedule.component').then((m) => m.ScheduleComponent),
  },
] as Routes;
