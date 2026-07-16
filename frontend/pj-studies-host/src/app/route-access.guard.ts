import { inject } from '@angular/core';
import { CanMatchFn, Router, UrlTree } from '@angular/router';
import { AuthService } from './auth.service';

function deniedTree(): UrlTree {
  const router = inject(Router);
  return router.parseUrl('/brak-dostepu');
}

export const canAccessProgramGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.canAccessProgram() ? true : deniedTree();
};

export const canAccessSyllabiGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.canAccessSyllabi() ? true : deniedTree();
};

export const canAccessAssignmentsGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.canAccessAssignments() ? true : deniedTree();
};

export const canAccessDezyderatyGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.canAccessDezyderaty() ? true : deniedTree();
};

export const canAccessAdminGuard: CanMatchFn = () => {
  const authService = inject(AuthService);
  return authService.hasRole('admin') ? true : deniedTree();
};
