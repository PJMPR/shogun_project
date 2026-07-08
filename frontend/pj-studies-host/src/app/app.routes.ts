import { Routes } from '@angular/router';
import { loadRemoteModule } from '@angular-architects/native-federation';
import {
  canAccessAdminGuard,
  canAccessAssignmentsGuard,
  canAccessProgramGuard,
  canAccessSyllabiGuard,
} from './route-access.guard';

export const routes: Routes = [
  {
    path: 'program',
    canMatch: [canAccessProgramGuard],
    loadChildren: () => loadRemoteModule('mfe-program', './Routes').then(m => m.default),
  },
  { path: 'syllabi', redirectTo: 'sylabusy', pathMatch: 'full' },
  { path: 'syllabi/:section', redirectTo: 'sylabusy/:section' },
  {
    path: 'sylabusy',
    canMatch: [canAccessSyllabiGuard],
    loadChildren: () => loadRemoteModule('mfe-syllabi', './Routes').then(m => m.default),
  },
  {
    path: 'assignements',
    canMatch: [canAccessAssignmentsGuard],
    loadChildren: () => loadRemoteModule('mfe-assignements', './Routes').then(m => m.default),
  },
  {
    path: 'users',
    canMatch: [canAccessAdminGuard],
    loadChildren: () => loadRemoteModule('mfe-users', './Routes').then(m => m.default),
  },
  {
    path: 'brak-dostepu',
    loadComponent: () => import('./access-denied.component').then(m => m.AccessDeniedComponent),
  },
  { path: '', redirectTo: 'assignements', pathMatch: 'full' },
];
