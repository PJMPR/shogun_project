import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface UserDto {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
  roles: string[];
}

export const AVAILABLE_ROLES = ['admin', 'coordinator', 'lecturer'] as const;
export type AppRole = (typeof AVAILABLE_ROLES)[number];

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly baseUrl = '/api-users/api/v1/users';

  constructor(private http: HttpClient) {}

  getUsers(): Observable<UserDto[]> {
    return this.http.get<UserDto[]>(this.baseUrl);
  }

  setUserRoles(userId: string, roles: string[]): Observable<void> {
    return this.http.put<void>(`${this.baseUrl}/${userId}/roles`, { roles });
  }
}
