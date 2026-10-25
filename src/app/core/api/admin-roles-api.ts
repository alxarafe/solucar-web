import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const ROLES_PATH = '/api/admin/roles';
const PERMISSIONS_PATH = '/api/admin/permissions';

export interface AdminRole {
  code: string;
  name: string;
  builtIn: boolean;
  permissionCodes: string[];
}

export interface AdminPermission {
  code: string;
  description: string;
}

export interface CreateAdminRole {
  code: string;
  name: string;
  permissionCodes: string[];
}

@Injectable({ providedIn: 'root' })
export class AdminRolesApi {
  private readonly http = inject(HttpClient);

  list(): Observable<AdminRole[]> {
    return this.http.get<AdminRole[]>(ROLES_PATH);
  }

  get(code: string): Observable<AdminRole> {
    return this.http.get<AdminRole>(this.rolePath(code));
  }

  create(request: CreateAdminRole): Observable<AdminRole> {
    return this.http.post<AdminRole>(ROLES_PATH, request);
  }

  updateName(code: string, name: string): Observable<AdminRole> {
    return this.http.patch<AdminRole>(this.rolePath(code), { name });
  }

  replacePermissions(code: string, permissionCodes: string[]): Observable<AdminRole> {
    return this.http.put<AdminRole>(`${this.rolePath(code)}/permissions`, { permissionCodes });
  }

  delete(code: string): Observable<void> {
    return this.http.delete<void>(this.rolePath(code));
  }

  listPermissions(): Observable<AdminPermission[]> {
    return this.http.get<AdminPermission[]>(PERMISSIONS_PATH);
  }

  private rolePath(code: string): string {
    return `${ROLES_PATH}/${encodeURIComponent(code)}`;
  }
}
