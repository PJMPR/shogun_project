import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import Keycloak from 'keycloak-js';
import { firstValueFrom } from 'rxjs';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const REALM = 'shogun';
const CLIENT_ID = 'shogun-web';
const TOKEN_REFRESH_INTERVAL_MS = 60_000;
const TOKEN_MIN_VALIDITY_SEC = 60;
const SESSION_ROLES_KEY = 'shogun_roles';
const SESSION_PROJECTS_KEY = 'shogun_projects';
const PRODUCTION_AUTH_ORIGIN = 'https://shogun.pjwstk.edu.pl';
const PRODUCTION_HOSTNAMES = new Set(['shogun.pjwstk.edu.pl', 'shogun.pja.edu.pl']);

function getKeycloakUrl(): string {
  // Keycloak and the Google broker use the pjwstk.edu.pl hostname as their
  // canonical issuer/callback. Starting a login session on the pja.edu.pl
  // alias would bind its cookie to the wrong host and the callback would end
  // with authentication_expired.
  // On non-standard ports (local dev via :8443) the canonical-host redirect
  // doesn't apply — use origin as-is so the port is preserved.
  const { hostname, port } = window.location;
  const isNonStandardPort = port !== '' && port !== '80' && port !== '443';
  const authOrigin =
    !isNonStandardPort && PRODUCTION_HOSTNAMES.has(hostname)
      ? PRODUCTION_AUTH_ORIGIN
      : window.location.origin;

  return `${authOrigin}/auth`;
}

interface MyProjectsResponse {
  projects: string[];
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly userProfile = signal<UserProfile | null>(null);
  readonly projectScopes = signal<string[]>([]);

  private readonly http = inject(HttpClient);

  private readonly keycloak = new Keycloak({
    url: getKeycloakUrl(),
    realm: REALM,
    clientId: CLIENT_ID,
  });

  async init(): Promise<void> {
    const authenticated = await this.keycloak.init({
      onLoad: 'login-required',
      checkLoginIframe: false,
      pkceMethod: false,
    });

    if (authenticated) {
      await this.keycloak.loadUserProfile();
      this.userProfile.set({
        firstName: this.keycloak.profile?.firstName ?? '',
        lastName: this.keycloak.profile?.lastName ?? '',
        email: this.keycloak.profile?.email ?? '',
      });
      // Store realm roles in sessionStorage so MFEs can read them
      const roles = this.keycloak.realmAccess?.roles ?? [];
      sessionStorage.setItem(SESSION_ROLES_KEY, JSON.stringify(roles));
      await this.loadProjectScopes();
      this.scheduleTokenRefresh();
    }
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  hasRole(role: string): boolean {
    return this.keycloak.hasRealmRole(role);
  }

  hasProjectAccess(project: string): boolean {
    if (this.hasRole('admin')) return true;

    const wanted = project.trim().toLowerCase();
    return this.projectScopes().some(scope => scope === wanted);
  }

  canAccessProgram(): boolean {
    return this.hasProjectAccess('program');
  }

  canAccessSyllabi(): boolean {
    return this.hasProjectAccess('sylabus');
  }

  canAccessAssignments(): boolean {
    return this.keycloak.authenticated === true;
  }

  canAccessDezyderaty(): boolean {
    return this.hasRole('admin') || this.hasRole('dezyderaty');
  }

  canAccessSchedule(): boolean {
    return this.hasRole('admin') || this.hasRole('planner');
  }

  logout(): void {
    sessionStorage.removeItem(SESSION_ROLES_KEY);
    sessionStorage.removeItem(SESSION_PROJECTS_KEY);
    this.keycloak.logout({ redirectUri: window.location.origin });
  }

  private async loadProjectScopes(): Promise<void> {
    try {
      const response = await firstValueFrom(this.http.get<MyProjectsResponse>('/api-users/api/v1/me/projects'));
      const scopes = (response.projects ?? [])
        .map(scope => scope.trim().toLowerCase())
        .filter(scope => !!scope);

      this.projectScopes.set(scopes);
      sessionStorage.setItem(SESSION_PROJECTS_KEY, JSON.stringify(scopes));
    } catch {
      // Keep menu conservative on failures: no project links unless scopes are loaded.
      this.projectScopes.set([]);
      sessionStorage.setItem(SESSION_PROJECTS_KEY, '[]');
    }
  }

  private scheduleTokenRefresh(): void {
    setInterval(() => {
      this.keycloak.updateToken(TOKEN_MIN_VALIDITY_SEC).catch(() => {
        // Token could not be refreshed – force re-login
        this.keycloak.login();
      });
    }, TOKEN_REFRESH_INTERVAL_MS);
  }
}
