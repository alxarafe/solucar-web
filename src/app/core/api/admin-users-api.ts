import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const USERS_PATH = '/api/admin/users';
export const ADMIN_USERS_PAGE_SIZE = 20;
export const ADMIN_USER_PASSWORD_MIN_LENGTH = 12;

export interface AdminUser {
  id: string;
  username: string;
  email: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  roles: string[];
}

export interface AdminUserPage {
  items: AdminUser[];
  page: number;
  size: number;
  total: number;
}

export interface AdminUserQuery {
  page: number;
  size: number;
  q?: string;
  enabled?: boolean;
}

export interface CreateAdminUser {
  username: string;
  email: string;
  password: string;
  roleCodes: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminUsersApi {
  private readonly http = inject(HttpClient);

  list(query: AdminUserQuery): Observable<AdminUserPage> {
    let params = new HttpParams().set('page', query.page).set('size', query.size);
    if (query.q) params = params.set('q', query.q);
    if (query.enabled !== undefined) params = params.set('enabled', query.enabled);
    return this.http.get<AdminUserPage>(USERS_PATH, { params });
  }

  get(id: string): Observable<AdminUser> {
    return this.http.get<AdminUser>(this.userPath(id));
  }

  create(request: CreateAdminUser): Observable<AdminUser> {
    return this.http.post<AdminUser>(USERS_PATH, request);
  }

  updateUsername(id: string, username: string): Observable<AdminUser> {
    return this.http.patch<AdminUser>(this.userPath(id), { username });
  }

  updateEnabled(id: string, enabled: boolean): Observable<AdminUser> {
    return this.http.patch<AdminUser>(`${this.userPath(id)}/enabled`, { enabled });
  }

  resetPassword(id: string, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.userPath(id)}/password-reset`, { newPassword });
  }

  replaceRoles(id: string, roleCodes: string[]): Observable<AdminUser> {
    return this.http.put<AdminUser>(`${this.userPath(id)}/roles`, { roleCodes });
  }

  private userPath(id: string): string {
    return `${USERS_PATH}/${encodeURIComponent(id)}`;
  }
}
