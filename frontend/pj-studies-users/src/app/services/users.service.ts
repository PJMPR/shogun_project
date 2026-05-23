import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';
import { ManagedRole } from '../components/users/users.models';

export interface UserDto {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
  roles: string[];
}

export interface UpsertManagedRoleRequest {
  name: string;
  description?: string;
  attributes?: Record<string, string[]>;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly baseUrl = '/api-users/api/v1/users';

  constructor(private http: HttpClient) {}

  getManagedRoles(): Observable<ManagedRole[]> {
    return this.http.get<ManagedRole[]>(`${this.baseUrl}/roles`);
  }

  getManagedRole(roleName: string): Observable<ManagedRole> {
    return this.http.get<ManagedRole>(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`);
  }

  createManagedRole(request: UpsertManagedRoleRequest): Observable<void> {
    return this.http
      .post(`${this.baseUrl}/roles`, request, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  updateManagedRole(currentRoleName: string, request: UpsertManagedRoleRequest): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/roles/${encodeURIComponent(currentRoleName)}`, request, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  deleteManagedRole(roleName: string): Observable<void> {
    return this.http
      .delete(`${this.baseUrl}/roles/${encodeURIComponent(roleName)}`, { responseType: 'text' })
      .pipe(map(() => undefined));
  }

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.baseUrl);
  }

  setUserRoles(userId: string, roles: string[]): Observable<void> {
    return this.http
      .put(`${this.baseUrl}/${userId}/roles`, { roles }, { responseType: 'text' })
      .pipe(map(() => undefined));
  }
}
