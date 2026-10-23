import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { vi } from 'vitest';
import { AUTH_REQUEST_TIMEOUT_MS, AuthIdentity } from './auth-api';
import { AuthSessionService } from './auth-session.service';

const IDENTITY: AuthIdentity = {
  id: '8f796219-e501-44e8-a4ab-4c014821ba58',
  username: 'alice',
  email: 'alice@example.test',
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const INVALID_CREDENTIALS = {
  type: 'urn:alixar:error:authentication-invalid-credentials',
  title: 'Invalid credentials',
  status: 401,
  detail: 'Invalid credentials.',
  code: 'AUTH_INVALID_CREDENTIALS',
};

describe('AuthSessionService', () => {
  let service: AuthSessionService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(AuthSessionService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    httpMock.verify();
  });

  describe('bootstrap', () => {
    it('should start unknown without assuming an identity', () => {
      expect(service.status()).toBe('unknown');
      expect(service.identity()).toBeNull();
    });

    it('should complete and cancel /me if the backend never responds', async () => {
      vi.useFakeTimers();
      const bootstrap = service.bootstrap();
      const request = httpMock.expectOne('/api/auth/me');

      await vi.advanceTimersByTimeAsync(AUTH_REQUEST_TIMEOUT_MS);
      await bootstrap;

      expect(request.cancelled).toBe(true);
      expect(service.status()).toBe('unavailable');
      expect(service.identity()).toBeNull();
      expect(service.error()?.kind).toBe('network');
    });

    it('should keep only the canonical identity fields in session state', async () => {
      const bootstrap = service.bootstrap();
      httpMock.expectOne('/api/auth/me').flush({ ...IDENTITY, roles: ['unused'], permissions: ['unused'] });
      await bootstrap;
      expect(service.identity()).toEqual(IDENTITY);
    });
    it('should become authenticated when /me returns an identity', async () => {
      const bootstrap = service.bootstrap();

      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await bootstrap;

      expect(service.status()).toBe('authenticated');
      expect(service.identity()).toEqual(IDENTITY);
      expect(service.error()).toBeNull();
    });

    it('should become anonymous when /me returns 401', async () => {
      const bootstrap = service.bootstrap();

      httpMock.expectOne('/api/auth/me').flush({}, { status: 401, statusText: 'Unauthorized' });
      await bootstrap;

      expect(service.status()).toBe('anonymous');
      expect(service.identity()).toBeNull();
      expect(service.error()).toBeNull();
    });

    it('should become unavailable when /me returns 503 AUDIT_UNAVAILABLE', async () => {
      const bootstrap = service.bootstrap();

      httpMock.expectOne('/api/auth/me').flush(
        { code: 'AUDIT_UNAVAILABLE', detail: 'Audit trail unavailable.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await bootstrap;

      expect(service.status()).toBe('unavailable');
      expect(service.error()?.kind).toBe('unavailable');
    });

    it('should become unavailable on a network error', async () => {
      const bootstrap = service.bootstrap();

      httpMock.expectOne('/api/auth/me').error(new ProgressEvent('error'));
      await bootstrap;

      expect(service.status()).toBe('unavailable');
      expect(service.error()?.kind).toBe('network');
    });
  });

  describe('login', () => {
    it('should refresh /me and become authenticated after a successful login', async () => {
      const login = service.login('alice', 'secret');

      const loginRequest = httpMock.expectOne('/api/auth/login');
      expect(loginRequest.request.method).toBe('POST');
      expect(loginRequest.request.body).toEqual({ identifier: 'alice', password: 'secret' });
      loginRequest.flush(IDENTITY);
      await tick();

      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await login;

      expect(service.status()).toBe('authenticated');
      expect(service.identity()).toEqual(IDENTITY);
    });

    it('should map 401 to invalid credentials and remain anonymous', async () => {
      const login = service.login('alice', 'wrong');

      httpMock.expectOne('/api/auth/login').flush(INVALID_CREDENTIALS, {
        status: 401,
        statusText: 'Unauthorized',
      });
      await login;

      expect(service.status()).toBe('anonymous');
      expect(service.error()?.kind).toBe('invalid-credentials');
    });

    it('should map 400 to validation', async () => {
      const login = service.login('', '');

      httpMock.expectOne('/api/auth/login').flush(
        { code: 'VALIDATION_REQUIRED', detail: 'Required.', field: 'identifier' },
        { status: 400, statusText: 'Bad Request' },
      );
      await login;

      expect(service.status()).toBe('anonymous');
      expect(service.error()?.kind).toBe('validation');
      expect(service.error()?.field).toBe('identifier');
    });

    it('should map 503 to temporary unavailability', async () => {
      const login = service.login('alice', 'secret');

      httpMock.expectOne('/api/auth/login').flush(
        { code: 'AUDIT_UNAVAILABLE', detail: 'Audit trail unavailable.' },
        { status: 503, statusText: 'Service Unavailable' },
      );
      await login;

      expect(service.status()).toBe('anonymous');
      expect(service.error()?.kind).toBe('unavailable');
    });

    it('should map a network error to backend unavailable', async () => {
      const login = service.login('alice', 'secret');

      httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'));
      await login;

      expect(service.status()).toBe('anonymous');
      expect(service.error()?.kind).toBe('network');
    });

    it('should re-prime CSRF and retry once after a 403 login response', async () => {
      const login = service.login('alice', 'secret');

      httpMock.expectOne('/api/auth/login').flush({}, {
        status: 403,
        statusText: 'Forbidden',
      });
      await tick();
      httpMock.expectOne('/api/auth/me').flush({}, {
        status: 401,
        statusText: 'Unauthorized',
      });
      await tick();
      httpMock.expectOne('/api/auth/login').flush(IDENTITY);
      await tick();
      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await login;

      expect(service.status()).toBe('authenticated');
      expect(service.error()).toBeNull();
    });

    it('should not retry more than once after repeated 403 responses', async () => {
      const login = service.login('alice', 'secret');

      httpMock.expectOne('/api/auth/login').flush({}, {
        status: 403,
        statusText: 'Forbidden',
      });
      await tick();
      httpMock.expectOne('/api/auth/me').flush({}, {
        status: 401,
        statusText: 'Unauthorized',
      });
      await tick();
      httpMock.expectOne('/api/auth/login').flush({}, {
        status: 403,
        statusText: 'Forbidden',
      });
      await login;

      expect(service.status()).toBe('anonymous');
      expect(service.error()?.kind).toBe('forbidden');
    });

    it('should stop the CSRF retry if /me is unavailable', async () => {
      const login = service.login('alice', 'secret');
      httpMock.expectOne('/api/auth/login').flush(null, { status: 403, statusText: 'Forbidden' });
      await tick();
      httpMock.expectOne('/api/auth/me').error(new ProgressEvent('error'));
      await login;
      httpMock.expectNone('/api/auth/login');
      expect(service.identity()).toBeNull();
      expect(service.error()?.kind).toBe('network');
    });

    it.each([
      [401, 'anonymous', 'session-expired'],
      [503, 'unavailable', 'unavailable'],
    ])('should reconcile a %s response from /me after accepted login', async (status, expectedStatus, kind) => {
      const login = service.login('alice', 'secret');
      httpMock.expectOne('/api/auth/login').flush(IDENTITY);
      await tick();
      httpMock.expectOne('/api/auth/me').flush(null, { status: Number(status), statusText: 'Failure' });
      await login;
      expect(service.status()).toBe(expectedStatus);
      expect(service.identity()).toBeNull();
      expect(service.error()?.kind).toBe(kind);
    });
  });

  describe('logout', () => {
    it('should clear identity immediately after 204 even if the CSRF refresh fails', async () => {
      const bootstrap = service.bootstrap();
      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await bootstrap;
      const logout = service.logout();
      httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      await tick();
      expect(service.identity()).toBeNull();
      httpMock.expectOne('/api/auth/me').error(new ProgressEvent('error'));
      expect(await logout).toBeNull();
      expect(service.status()).toBe('unavailable');
      expect(service.error()?.kind).toBe('network');
    });

    it('should honor a new server session observed after logout', async () => {
      const logout = service.logout();
      httpMock.expectOne('/api/auth/logout').flush(null, { status: 204, statusText: 'No Content' });
      await tick();
      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await logout;
      expect(service.status()).toBe('authenticated');
      expect(service.identity()).toEqual(IDENTITY);
    });
    it('should clear the frontend session and re-prime CSRF after logout', async () => {
      const bootstrap = service.bootstrap();
      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await bootstrap;

      const logout = service.logout();
      httpMock.expectOne('/api/auth/logout').flush(null, {
        status: 204,
        statusText: 'No Content',
      });
      await tick();
      httpMock.expectOne('/api/auth/me').flush({}, {
        status: 401,
        statusText: 'Unauthorized',
      });
      await logout;

      expect(service.status()).toBe('anonymous');
      expect(service.identity()).toBeNull();
      expect(service.error()).toBeNull();
    });

    it('should keep the session when logout fails', async () => {
      const bootstrap = service.bootstrap();
      httpMock.expectOne('/api/auth/me').flush(IDENTITY);
      await bootstrap;

      const logout = service.logout();
      httpMock.expectOne('/api/auth/logout').error(new ProgressEvent('error'));
      await logout;

      expect(service.status()).toBe('authenticated');
      expect(service.identity()).toEqual(IDENTITY);
      expect(service.error()?.kind).toBe('network');
    });
  });
});
