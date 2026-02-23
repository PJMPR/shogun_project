import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: 'stacjonarne/program',
    loadComponent: () =>
      import('./stacjonarne/program/program.component').then((m) => m.ProgramComponent),
  },
  {
    path: 'niestacjonarne/program',
    loadComponent: () =>
      import('./niestacjonarne/program/niestacjonarne-program.component').then((m) => m.NiestacjonarneProgramComponent),
  },
  {
    path: 'pdf-viewer',
    loadComponent: () =>
      import('./pdf-viewer/pdf-viewer.component').then((m) => m.PdfViewerComponent),
  },
  {
    path: 'sylabus/nowy',
    loadComponent: () =>
      import('./sylabus/nowy/nowy-sylabus.component').then((m) => m.NowySylabusComponent),
  },
  {
    path: 'sylabus/edytuj',
    loadComponent: () =>
      import('./sylabus/edytuj/edytuj-sylabus.component').then((m) => m.EdytujSylabusComponent),
  },
  { path: '', redirectTo: 'stacjonarne/program', pathMatch: 'full' },
];
