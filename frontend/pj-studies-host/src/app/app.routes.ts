import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';

export const routes: Routes = [
  {
    path: 'program',
    loadChildren: () => loadRemoteModule('mfe-program', './Routes').then(m => m.default),
  },
  { path: 'syllabi', redirectTo: 'sylabusy', pathMatch: 'full' },
  { path: 'syllabi/:section', redirectTo: 'sylabusy/:section' },
  {
    path: 'sylabusy',
    loadChildren: () => loadRemoteModule('mfe-syllabi', './Routes').then(m => m.default),
  },
  {
    path: 'assignements',
    loadChildren: () => loadRemoteModule('mfe-assignements', './Routes').then(m => m.default),
  },
  {
    path: 'users',
    loadChildren: () => loadRemoteModule('mfe-users', './Routes').then(m => m.default),
  },
  { path: '', redirectTo: 'program', pathMatch: 'full' },
];
