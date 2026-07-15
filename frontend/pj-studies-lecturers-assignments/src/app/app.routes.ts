import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'lecturers-assignments',
    loadComponent: () =>
      import('./lecturers-assignments/lecturers-assignments.component').then(
        (m) => m.LecturersAssignmentsComponent,
      ),
  },
  { path: '', redirectTo: 'lecturers-assignments', pathMatch: 'full' },
];
