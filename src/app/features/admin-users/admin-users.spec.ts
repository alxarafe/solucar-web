import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminUser, AdminRole } from '../../core/api/admin-users-api';
import { AdminUsersList } from './admin-users-list';
import { AdminUserCreate } from './admin-user-create';
import { AdminUserDetail } from './admin-user-detail';
import { AdminUserError, adminUserErrorMessage } from './admin-user-error';
import { AuthSessionService } from '../../core/auth/auth-session.service';

const USER: AdminUser = {
  id: 'user-id',
  username: 'alice',
  email: 'alice@example.test',
  enabled: true,
  createdAt: '2026-10-24T10:00:00Z',
  updatedAt: '2026-10-24T10:00:00Z',
  roles: ['accounting'],
};
const ROLES: AdminRole[] = [
  { code: 'accounting', name: 'Accounting', builtIn: false, permissionCodes: ['audit.read'] },
  { code: 'warehouse', name: 'Warehouse', builtIn: false, permissionCodes: [] },
];

function setup() {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: USER.id })) } },
    ],
  });
}
function fail(http: HttpTestingController, url: string, status = 503) {
  http
    .expectOne(url)
    .flush(
      { detail: 'Backend explanation', code: 'DOMAIN_ERROR' },
      { status, statusText: 'Failure' },
    );
}
function submit(fixture: ComponentFixture<unknown>, index = 0) {
  fixture.nativeElement
    .querySelectorAll('form')
    [index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('AdminUsersList', () => {
  let fixture: ComponentFixture<AdminUsersList>;
  let http: HttpTestingController;
  const url = '/api/admin/users?page=0&size=20';
  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUsersList);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function flush(items = [USER], page = 0, total = 42) {
    http.expectOne(`/api/admin/users?page=${page}&size=20`).flush({ items, page, size: 20, total });
    fixture.detectChanges();
  }

  it('shows loading and disables search while the backend is pending', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading users...');
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    fixture.componentInstance.search();
    flush();
  });
  it('renders canonical user fields and a detail link', () => {
    flush();
    expect(fixture.nativeElement.textContent).toContain(USER.email);
    expect(fixture.nativeElement.textContent).toContain('Active');
    expect(fixture.nativeElement.textContent).toContain('accounting');
    expect(fixture.nativeElement.querySelector('tbody a').getAttribute('href')).toBe(
      '/admin/users/user-id',
    );
  });
  it('renders an empty result', () => {
    flush([], 0, 0);
    expect(fixture.nativeElement.textContent).toContain('No users found');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });
  it('shows a useful backend error and retries the same request', () => {
    fail(http, url);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Backend explanation',
    );
    fixture.nativeElement.querySelector('app-admin-user-error + button').click();
    flush();
  });
  it('searches on submit rather than every input change', () => {
    flush();
    fixture.componentInstance.form.controls.q.setValue('  alice  ');
    http.expectNone((req) => req.url === '/api/admin/users');
    submit(fixture);
    http.expectOne(`${url}&q=alice`).flush({ items: [USER], page: 0, size: 20, total: 1 });
  });
  it.each(['true', 'false'])('sends the enabled=%s backend filter', (enabled) => {
    flush();
    fixture.componentInstance.form.controls.enabled.setValue(enabled);
    submit(fixture);
    http.expectOne(`${url}&enabled=${enabled}`).flush({ items: [], page: 0, size: 20, total: 0 });
  });
  it('requests server pages, retaining submitted filters and resetting page on a new search', () => {
    flush();
    fixture.componentInstance.form.setValue({ q: 'alice', enabled: 'true' });
    submit(fixture);
    http
      .expectOne(`${url}&q=alice&enabled=true`)
      .flush({ items: [USER], page: 0, size: 20, total: 42 });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.pagination button:last-child').click();
    http
      .expectOne('/api/admin/users?page=1&size=20&q=alice&enabled=true')
      .flush({ items: [USER], page: 1, size: 20, total: 42 });
    fixture.detectChanges();
    fixture.nativeElement.querySelector('.pagination button:first-child').click();
    http
      .expectOne(`${url}&q=alice&enabled=true`)
      .flush({ items: [USER], page: 0, size: 20, total: 42 });
    fixture.componentInstance.page(1);
    http
      .expectOne('/api/admin/users?page=1&size=20&q=alice&enabled=true')
      .flush({ items: [USER], page: 1, size: 20, total: 42 });
    fixture.componentInstance.form.setValue({ q: '', enabled: '' });
    submit(fixture);
    http.expectOne(url).flush({ items: [], page: 0, size: 20, total: 0 });
  });
  it('disables pagination at both boundaries', () => {
    flush([USER], 0, 1);
    const buttons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.pagination button'),
    ];
    expect(buttons.every((button) => button.disabled)).toBe(true);
    fixture.componentInstance.page(-1);
    fixture.componentInstance.page(1);
  });
  it('cancels pending reads when destroyed', () => {
    const req = http.expectOne(url);
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });
});

describe('AdminUserCreate', () => {
  let fixture: ComponentFixture<AdminUserCreate>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;
  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AdminUserCreate);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function catalogue() {
    http.expectOne('/api/admin/roles').flush(ROLES);
    fixture.detectChanges();
  }
  function valid() {
    fixture.componentInstance.form.setValue({
      username: 'alice',
      email: USER.email,
      password: 'initial-password',
    });
  }

  it('loads the real role catalogue and renders role checkboxes', () => {
    catalogue();
    expect(fixture.nativeElement.querySelectorAll('input[type=checkbox]').length).toBe(2);
    expect(fixture.nativeElement.textContent).toContain('New users are inactive');
  });
  it('blocks creation when the catalogue fails, with a retry', () => {
    fail(http, '/api/admin/roles');
    fixture.detectChanges();
    valid();
    submit(fixture);
    http.expectNone('/api/admin/users');
    fixture.componentInstance.loadRoles();
    catalogue();
  });
  it('validates required fields, email format and the backend password minimum', () => {
    catalogue();
    submit(fixture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    expect(fixture.componentInstance.form.invalid).toBe(true);
    valid();
    fixture.componentInstance.form.controls.email.setValue('invalid');
    submit(fixture);
    valid();
    fixture.componentInstance.form.controls.password.setValue('short');
    submit(fixture);
    http.expectNone('/api/admin/users');
  });
  it('creates selected roles, prevents double submit, clears password and navigates to the real id', () => {
    catalogue();
    valid();
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    checkbox.click();
    submit(fixture);
    submit(fixture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const req = http.expectOne('/api/admin/users');
    expect(req.request.body).toEqual({
      username: 'alice',
      email: USER.email,
      password: 'initial-password',
      roleCodes: ['accounting'],
    });
    req.flush({ ...USER, enabled: false }, { status: 201, statusText: 'Created' });
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(navigate).toHaveBeenCalledWith(['/admin/users', USER.id]);
  });
  it('sends an empty role selection and clears the password after failure', () => {
    catalogue();
    valid();
    submit(fixture);
    const req = http.expectOne('/api/admin/users');
    expect(req.request.body.roleCodes).toEqual([]);
    req.flush({ detail: 'Username already exists' }, { status: 409, statusText: 'Conflict' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Username already exists');
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
    expect(fixture.componentInstance.form.controls.username.value).toBe('alice');
    expect(navigate).not.toHaveBeenCalled();
  });
  it('cancels a pending create and clears its sensitive field on destruction', () => {
    catalogue();
    valid();
    submit(fixture);
    const req = http.expectOne('/api/admin/users');
    fixture.destroy();
    expect(req.cancelled).toBe(true);
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
  });
});

describe('AdminUserDetail', () => {
  let fixture: ComponentFixture<AdminUserDetail>;
  let http: HttpTestingController;
  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminUserDetail);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  function loaded(user = USER) {
    http.expectOne('/api/admin/users/user-id').flush(user);
    http.expectOne('/api/admin/roles').flush(ROLES);
    fixture.detectChanges();
  }

  it('loads all detail fields and exposes no email or permission editor', () => {
    loaded();
    expect(fixture.nativeElement.textContent).toContain(USER.email);
    expect(fixture.nativeElement.textContent).toContain('Created');
    expect(fixture.nativeElement.textContent).toContain('Updated');
    expect(fixture.nativeElement.querySelector('input[type=email]')).toBeNull();
    expect(fixture.nativeElement.querySelectorAll('input[type=checkbox]').length).toBe(2);
    expect(fixture.nativeElement.querySelector('input[type=password]').value).toBe('');
  });
  it('shows a 404 and no editing controls', () => {
    http.expectOne('/api/admin/roles').flush(ROLES);
    fail(http, '/api/admin/users/user-id', 404);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('was not found');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });
  it('saves username and applies the normalized backend response', () => {
    loaded();
    fixture.componentInstance.usernameForm.controls.username.setValue(' New-Name ');
    submit(fixture);
    const req = http.expectOne('/api/admin/users/user-id');
    expect(req.request.body).toEqual({ username: ' New-Name ' });
    req.flush({ ...USER, username: 'new-name', updatedAt: '2026-10-24T11:00:00Z' });
    fixture.detectChanges();
    expect(fixture.componentInstance.user()?.username).toBe('new-name');
    expect(fixture.componentInstance.usernameForm.controls.username.value).toBe('new-name');
    expect(fixture.nativeElement.textContent).toContain('User saved successfully.');
  });
  it('rejects empty username without sending a request', () => {
    loaded();
    fixture.componentInstance.usernameForm.controls.username.setValue('');
    submit(fixture);
    http.expectNone('/api/admin/users/user-id');
  });
  it.each([true, false])(
    'deliberately changes enabled from %s only after confirmation',
    (enabled) => {
      loaded({ ...USER, enabled });
      fixture.nativeElement.querySelector('section button').click();
      fixture.detectChanges();
      http.expectNone('/api/admin/users/user-id/enabled');
      fixture.nativeElement.querySelector('section button').click();
      const req = http.expectOne('/api/admin/users/user-id/enabled');
      expect(req.request.body).toEqual({ enabled: !enabled });
      req.flush({ ...USER, enabled: !enabled });
      expect(fixture.componentInstance.user()?.enabled).toBe(!enabled);
    },
  );
  it('allows cancelling the status change', () => {
    loaded();
    fixture.nativeElement.querySelector('section button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('section button:last-child').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmingEnabled()).toBe(false);
  });
  it('replaces roles with the complete selected list, including zero roles', () => {
    loaded();
    const boxes: HTMLInputElement[] = [
      ...fixture.nativeElement.querySelectorAll('input[type=checkbox]'),
    ];
    boxes[0].click();
    fixture.detectChanges();
    boxes[1].click();
    submit(fixture, 1);
    let req = http.expectOne('/api/admin/users/user-id/roles');
    expect(req.request.body).toEqual({ roleCodes: ['warehouse'] });
    req.flush({ ...USER, roles: ['warehouse'] });
    fixture.detectChanges();
    boxes[1].click();
    submit(fixture, 1);
    req = http.expectOne('/api/admin/users/user-id/roles');
    expect(req.request.body).toEqual({ roleCodes: [] });
    req.flush({ ...USER, roles: [] });
    expect(fixture.componentInstance.user()?.roles).toEqual([]);
  });
  it('resets password with a separate request, clears the field on 204 and prevents double submit', () => {
    loaded();
    fixture.componentInstance.passwordForm.controls.newPassword.setValue('replacement-password');
    submit(fixture, 2);
    submit(fixture, 2);
    const req = http.expectOne('/api/admin/users/user-id/password-reset');
    expect(req.request.body).toEqual({ newPassword: 'replacement-password' });
    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('input[type=password]').value).toBe('');
    expect(fixture.nativeElement.textContent).toContain('Password reset successfully.');
  });
  it('clears the new password after a failed reset and preserves backend state', () => {
    loaded();
    fixture.componentInstance.passwordForm.controls.newPassword.setValue('replacement-password');
    submit(fixture, 2);
    fail(http, '/api/admin/users/user-id/password-reset', 503);
    fixture.detectChanges();
    expect(fixture.componentInstance.passwordForm.controls.newPassword.value).toBe('');
    expect(fixture.componentInstance.user()).toEqual(USER);
    expect(fixture.nativeElement.textContent).toContain('Backend explanation');
  });
  it('reports revoked permission without logging out or changing local user state', () => {
    loaded();
    const logout = vi.spyOn(TestBed.inject(AuthSessionService), 'logout');
    fixture.componentInstance.usernameForm.controls.username.setValue('bob');
    submit(fixture);
    fail(http, '/api/admin/users/user-id', 403);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('You do not have permission');
    expect(logout).not.toHaveBeenCalled();
    expect(fixture.componentInstance.user()).toEqual(USER);
  });
});

describe('administration errors', () => {
  it.each([
    [400, 'Check the information'],
    [401, 'session has expired'],
    [403, 'permission to manage users'],
    [404, 'was not found'],
    [409, 'conflicts'],
    [503, 'temporarily unavailable'],
    [0, 'Unable to communicate'],
  ])('distinguishes HTTP %s', (status, text) => {
    expect(adminUserErrorMessage(new HttpErrorResponse({ status }))).toContain(text);
  });
  it('keeps audit-unavailable detail as secondary information', () => {
    setup();
    const fixture = TestBed.createComponent(AdminUserError);
    fixture.componentRef.setInput(
      'error',
      new HttpErrorResponse({
        status: 503,
        error: { code: 'AUDIT_UNAVAILABLE', detail: 'Required audit service unavailable' },
      }),
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Required audit service unavailable');
  });
  it('refreshes session on explicit sign-in after 401, preserving returnUrl without calling logout', async () => {
    setup();
    const auth = TestBed.inject(AuthSessionService);
    const bootstrap = vi.spyOn(auth, 'bootstrap').mockResolvedValue();
    const logout = vi.spyOn(auth, 'logout');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/admin/users/user-id');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminUserError);
    fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/users/user-id' },
    });
  });
});
