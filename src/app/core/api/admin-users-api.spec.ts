import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LOCALE_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { AdminUsersApi, AdminUser } from './admin-users-api';
import { acceptLanguageInterceptor } from './accept-language.interceptor';

const USER: AdminUser = {
  id: 'user-id',
  username: 'alice',
  email: 'alice@example.test',
  enabled: false,
  createdAt: '2026-10-24T10:00:00Z',
  updatedAt: '2026-10-24T10:00:00Z',
  roles: ['accounting'],
};

describe('AdminUsersApi', () => {
  let api: AdminUsersApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'es' },
      ],
    });
    api = TestBed.inject(AdminUsersApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists server pages with search, size and enabled=false', () => {
    const page = { items: [USER], page: 2, size: 20, total: 45 };
    api
      .list({ page: 2, size: 20, q: 'alice', enabled: false })
      .subscribe((result) => expect(result).toEqual(page));
    const req = http.expectOne('/api/admin/users?page=2&size=20&q=alice&enabled=false');
    expect(req.request.method).toBe('GET');
    expect(req.request.headers.get('Accept-Language')).toBe('es');
    req.flush(page);
  });

  it('omits absent search and status filters', () => {
    api.list({ page: 0, size: 20 }).subscribe();
    http
      .expectOne('/api/admin/users?page=0&size=20')
      .flush({ items: [], page: 0, size: 20, total: 0 });
  });

  it('gets one user without mapping away canonical fields', () => {
    api.get(USER.id).subscribe((result) => expect(result).toEqual(USER));
    const req = http.expectOne('/api/admin/users/user-id');
    expect(req.request.method).toBe('GET');
    req.flush(USER);
  });

  it('creates a user with the complete canonical payload', () => {
    const body = {
      username: 'alice',
      email: USER.email,
      password: 'initial-password',
      roleCodes: [],
    };
    api.create(body).subscribe((result) => expect(result).toEqual(USER));
    const req = http.expectOne('/api/admin/users');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(false);
    req.flush(USER, { status: 201, statusText: 'Created' });
  });

  it('patches username only', () => {
    api
      .updateUsername(USER.id, 'new-name')
      .subscribe((result) => expect(result.username).toBe('new-name'));
    const req = http.expectOne('/api/admin/users/user-id');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ username: 'new-name' });
    req.flush({ ...USER, username: 'new-name' });
  });

  it('patches enabled', () => {
    api.updateEnabled(USER.id, true).subscribe((result) => expect(result.enabled).toBe(true));
    const req = http.expectOne('/api/admin/users/user-id/enabled');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ enabled: true });
    req.flush({ ...USER, enabled: true });
  });

  it('posts an administrative password reset and accepts no content', () => {
    let completed = false;
    api.resetPassword(USER.id, 'replacement-password').subscribe(() => (completed = true));
    const req = http.expectOne('/api/admin/users/user-id/password-reset');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ newPassword: 'replacement-password' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('replaces all role assignments, including an empty selection', () => {
    api.replaceRoles(USER.id, []).subscribe((result) => expect(result.roles).toEqual([]));
    const req = http.expectOne('/api/admin/users/user-id/roles');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ roleCodes: [] });
    req.flush({ ...USER, roles: [] });
  });

  it('reads the complete role catalogue', () => {
    const roles = [
      { code: 'accounting', name: 'Accounting', builtIn: false, permissionCodes: ['audit.read'] },
    ];
    api.listRoles().subscribe((result) => expect(result).toEqual(roles));
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.method).toBe('GET');
    req.flush(roles);
  });
});
