import { Routes } from '@angular/router';

export default [
  {
    path: '',
    loadComponent: () =>
      import('../lecturers-assignments/lecturers-assignments.component').then(
        (m) => m.LecturersAssignmentsComponent,
      ),
  },
] as Routes;
