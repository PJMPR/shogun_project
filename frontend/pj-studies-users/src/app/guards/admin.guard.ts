import { CanMatchFn } from '@angular/router';

const ADMIN_ROLE = 'admin';
const SESSION_ROLES_KEY = 'shogun_roles';

export const adminMatchGuard: CanMatchFn = () => {
  try {
    const roles: string[] = JSON.parse(sessionStorage.getItem(SESSION_ROLES_KEY) ?? '[]');
    return roles.includes(ADMIN_ROLE);
  } catch {
    return false;
  }
};
