import { Routes } from '@angular/router';

export default [
  {
    path: 'stacjonarne',
    loadComponent: () =>
      import('../stacjonarne/program/program.component').then((m) => m.ProgramComponent),
  },
  {
    path: 'niestacjonarne',
    loadComponent: () =>
      import('../niestacjonarne/program/niestacjonarne-program.component').then(
        (m) => m.NiestacjonarneProgramComponent
      ),
  },
  {
    path: 'pdf-viewer',
    loadComponent: () =>
      import('../pdf-viewer/pdf-viewer.component').then((m) => m.PdfViewerComponent),
  },
  { path: '', redirectTo: 'stacjonarne', pathMatch: 'full' },
] as Routes;
