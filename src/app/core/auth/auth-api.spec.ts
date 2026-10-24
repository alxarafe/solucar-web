import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { vi } from 'vitest';
import { Observable, TimeoutError } from 'rxjs';
import {
  AUTH_REQUEST_TIMEOUT_MS,
  AuthApi,
  AuthIdentity,
  CurrentUser,
  LoginRequest,
} from './auth-api';
import { acceptLanguageInterceptor } from '../api/accept-language.interceptor';

const IDENTITY: AuthIdentity = {
  id: '8f796219-e501-44e8-a4ab-4c014821ba58',
  username: 'alice',
  email: 'alice@example.test',
};

const CURRENT_USER: CurrentUser = {
  ...IDENTITY,
  roles: ['system-admin'],
  permissions: ['users.manage', 'audit.read'],
};

describe('AuthApi', () => {
  let api: AuthApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en' },
      ],
    });
    api = TestBed.inject(AuthApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
    document.cookie = 'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
  });

  it('should issue POST /api/auth/login with the canonical payload', () => {
    const request: LoginRequest = {
      identifier: 'alice@example.test',
      password: 'secret',
    };

    api.login(request).subscribe((identity) => {
      expect(identity).toEqual(IDENTITY);
    });

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(request);
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    expect(req.request.detectContentTypeHeader()).toBe('application/json');
    expect(req.request.headers.get('Accept-Language')).toBe('en');
    req.flush(IDENTITY);
  });

  it('should issue GET /api/auth/me and consume roles and permissions', () => {
    api.me().subscribe((currentUser) => {
      expect(currentUser).toEqual(CURRENT_USER);
    });

    const req = httpMock.expectOne('/api/auth/me');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush(CURRENT_USER);
  });

  it('should issue POST /api/auth/logout without a request body', () => {
    api.logout().subscribe();

    const req = httpMock.expectOne('/api/auth/logout');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBeNull();
    expect(req.request.headers.has('Authorization')).toBe(false);
    expect(req.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    expect(req.request.withCredentials).toBe(false);
    req.flush(null);
  });

  it('should let Angular add X-XSRF-TOKEN from the XSRF-TOKEN cookie', () => {
    document.cookie = 'XSRF-TOKEN=csrf-token; path=/';

    api.login({ identifier: 'alice', password: 'secret' }).subscribe();

    const req = httpMock.expectOne('/api/auth/login');
    expect(req.request.headers.get('X-XSRF-TOKEN')).toBe('csrf-token');
    req.flush(IDENTITY);
  });

  it('should use the renewed CSRF cookie for logout and omit its header on /me', () => {
    document.cookie = 'XSRF-TOKEN=renewed-token; path=/';
    api.me().subscribe();
    const me = httpMock.expectOne('/api/auth/me');
    expect(me.request.headers.has('X-XSRF-TOKEN')).toBe(false);
    me.flush(CURRENT_USER);

    api.logout().subscribe();
    const logout = httpMock.expectOne('/api/auth/logout');
    expect(logout.request.headers.get('X-XSRF-TOKEN')).toBe('renewed-token');
    logout.flush(null);
  });

  it.each(['me', 'login', 'logout'] as const)(
    'should cancel a stalled %s request',
    async (operation) => {
      vi.useFakeTimers();
      const response: Observable<unknown> =
        operation === 'login'
          ? api.login({ identifier: 'alice', password: 'secret' })
          : api[operation]();
      let failure: unknown;
      response.subscribe({
        error: (error: unknown) => {
          failure = error;
        },
      });
      const request = httpMock.expectOne(`/api/auth/${operation}`);

      await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS);

      expect(request.cancelled).toBe(true);
      expect(failure).toBeInstanceOf(TimeoutError);
    },
  );
});
