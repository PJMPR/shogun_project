import { Injectable, signal } from '@angular/core';
import Keycloak from 'keycloak-js';

export interface UserProfile {
  firstName: string;
  lastName: string;
  email: string;
}

const REALM = 'shogun';
const CLIENT_ID = 'shogun-web';
const TOKEN_REFRESH_INTERVAL_MS = 60_000;
const TOKEN_MIN_VALIDITY_SEC = 60;

@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly userProfile = signal<UserProfile | null>(null);

  private readonly keycloak = new Keycloak({
    url: `${window.location.origin}/auth`,
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
      this.scheduleTokenRefresh();
    }
  }

  getToken(): string | undefined {
    return this.keycloak.token;
  }

  logout(): void {
    this.keycloak.logout({ redirectUri: window.location.origin });
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
