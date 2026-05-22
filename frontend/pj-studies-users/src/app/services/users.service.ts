import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface UserDto {
  id: string;
  username: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  enabled: boolean;
  roles: string[];
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private readonly baseUrl = '/api-users/api/v1/users';

  constructor(private http: HttpClient) {}

  getManagedRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`);
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
