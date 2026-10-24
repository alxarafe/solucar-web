import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable, timeout } from 'rxjs';

export const AUTH_BASE_PATH = '/api/auth';
export const AUTH_REQUEST_TIMEOUT_MS = 10_000;

export interface AuthIdentity {
  id: string;
  username: string;
  email: string;
}

export interface CurrentUser extends AuthIdentity {
  roles: string[];
  permissions: string[];
}

export interface LoginRequest {
  identifier: string;
  password: string;
}

@Injectable({ providedIn: 'root' })
export class AuthApi {
  constructor(private readonly http: HttpClient) {}

  login(request: LoginRequest): Observable<AuthIdentity> {
    return this.http
      .post<AuthIdentity>(`${AUTH_BASE_PATH}/login`, request)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  me(): Observable<CurrentUser> {
    return this.http
      .get<CurrentUser>(`${AUTH_BASE_PATH}/me`)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(`${AUTH_BASE_PATH}/logout`, null)
      .pipe(timeout(AUTH_REQUEST_TIMEOUT_MS));
  }
}
