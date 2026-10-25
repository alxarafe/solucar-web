import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { AdminPermission, AdminRole } from '../../core/api/admin-roles-api';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AdminRoleCreate } from './admin-role-create';
import { AdminRoleDetail } from './admin-role-detail';
import { AdminRoleError, adminRoleErrorMessage } from './admin-role-error';
import { AdminRolesList } from './admin-roles-list';

const CUSTOM_ROLE: AdminRole = {
  code: 'warehouse-manager',
  name: 'Warehouse manager',
  builtIn: false,
  permissionCodes: ['audit.read'],
};
const BUILT_IN_ROLE: AdminRole = {
  code: 'system-admin',
  name: 'System administrator',
  builtIn: true,
  permissionCodes: ['roles.manage', 'users.manage'],
};
const PERMISSIONS: AdminPermission[] = [
  { code: 'audit.read', description: 'Read the audit trail' },
  { code: 'roles.manage', description: 'Manage roles' },
  { code: 'users.manage', description: 'Manage users' },
];

function setup(code = CUSTOM_ROLE.code) {
  TestBed.configureTestingModule({
    providers: [
      provideHttpClient(),
      provideHttpClientTesting(),
      provideRouter([]),
      {
        provide: ActivatedRoute,
        useValue: { paramMap: of(convertToParamMap({ code })) },
      },
    ],
  });
}

function fail(
  http: HttpTestingController,
  url: string,
  status = 503,
  code = 'DOMAIN_ERROR',
  detail = 'Backend explanation',
) {
  http.expectOne(url).flush({ detail, code }, { status, statusText: 'Failure' });
}

function submit(fixture: ComponentFixture<unknown>, index = 0) {
  fixture.nativeElement
    .querySelectorAll('form')
    [index].dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('AdminRolesList', () => {
  let fixture: ComponentFixture<AdminRolesList>;
  let http: HttpTestingController;
  const url = '/api/admin/roles';

  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminRolesList);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function flush(roles = [CUSTOM_ROLE]) {
    http.expectOne(url).flush(roles);
    fixture.detectChanges();
  }

  it('shows loading while the backend is pending', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading roles...');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    flush();
  });

  it('renders code, name, permissions, built-in indicator and detail links', () => {
    flush([CUSTOM_ROLE, BUILT_IN_ROLE]);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('warehouse-manager');
    expect(text).toContain('Warehouse manager');
    expect(text).toContain('audit.read');
    expect(text).toContain('Custom');
    expect(text).toContain('Built-in');
    const links = fixture.nativeElement.querySelectorAll('tbody a');
    expect(links[0].getAttribute('href')).toBe('/admin/roles/warehouse-manager');
    expect(links[1].getAttribute('href')).toBe('/admin/roles/system-admin');
  });

  it('shows the empty state', () => {
    flush([]);
    expect(fixture.nativeElement.textContent).toContain('No roles found');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows a useful error and retries', () => {
    fail(http, url);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Backend explanation',
    );
    fixture.nativeElement.querySelector('app-admin-role-error + button').click();
    flush();
  });

  it('links to role creation', () => {
    flush();
    const newLink = fixture.nativeElement.querySelector('header a');
    expect(newLink.getAttribute('href')).toBe('/admin/roles/new');
  });

  it('cancels a pending read when destroyed', () => {
    const req = http.expectOne(url);
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });
});

describe('AdminRoleCreate', () => {
  let fixture: ComponentFixture<AdminRoleCreate>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AdminRoleCreate);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function catalogue() {
    http.expectOne('/api/admin/permissions').flush(PERMISSIONS);
    fixture.detectChanges();
  }
  function valid(code = 'warehouse-manager', name = 'Warehouse manager') {
    fixture.componentInstance.form.setValue({ code, name });
  }

  it('loads the real permission catalogue as checkboxes', () => {
    catalogue();
    expect(fixture.nativeElement.querySelectorAll('input[type=checkbox]').length).toBe(3);
    expect(fixture.nativeElement.textContent).toContain('Read the audit trail');
  });

  it('blocks creation when the catalogue fails and offers a retry', () => {
    fail(http, '/api/admin/permissions');
    fixture.detectChanges();
    valid();
    submit(fixture);
    http.expectNone('/api/admin/roles');
    fixture.componentInstance.loadPermissions();
    catalogue();
  });

  it('rejects invalid role codes and blank names without sending a request', () => {
    catalogue();
    valid('warehouse_manager');
    submit(fixture);
    valid('Warehouse Manager');
    submit(fixture);
    valid('warehouse-manager', '   ');
    submit(fixture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]')).toBeTruthy();
    http.expectNone('/api/admin/roles');
  });

  it('accepts a code that Alixar normalizes and navigates to the returned code', () => {
    catalogue();
    valid(' Warehouse-Manager ', ' Warehouse manager ');
    const first: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    first.click();
    submit(fixture);
    submit(fixture);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.body).toEqual({
      code: ' Warehouse-Manager ',
      name: ' Warehouse manager ',
      permissionCodes: ['audit.read'],
    });
    req.flush(CUSTOM_ROLE, { status: 201, statusText: 'Created' });
    expect(navigate).toHaveBeenCalledWith(['/admin/roles', 'warehouse-manager']);
  });

  it('creates a role with zero permissions', () => {
    catalogue();
    valid();
    submit(fixture);
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.body.permissionCodes).toEqual([]);
    req.flush({ ...CUSTOM_ROLE, permissionCodes: [] }, { status: 201, statusText: 'Created' });
    expect(navigate).toHaveBeenCalledWith(['/admin/roles', CUSTOM_ROLE.code]);
  });

  it('sends the complete selected permission collection', () => {
    catalogue();
    valid();
    const boxes: HTMLInputElement[] = [
      ...fixture.nativeElement.querySelectorAll('input[type=checkbox]'),
    ];
    boxes[0].click();
    fixture.detectChanges();
    boxes[2].click();
    fixture.detectChanges();
    submit(fixture);
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.body.permissionCodes).toEqual(['audit.read', 'users.manage']);
    req.flush(CUSTOM_ROLE, { status: 201, statusText: 'Created' });
  });

  it('shows a validation error on 400', () => {
    catalogue();
    valid();
    submit(fixture);
    fail(http, '/api/admin/roles', 400, 'ADMIN_INVALID_ROLE_CODE', 'Invalid role code field');
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Check the information entered');
    expect(text).toContain('Invalid role code field');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('shows a duplicate-code conflict on 409', () => {
    catalogue();
    valid();
    submit(fixture);
    fail(http, '/api/admin/roles', 409, 'ADMIN_ROLE_ALREADY_EXISTS');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('already exists');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('cancels a pending create when destroyed', () => {
    catalogue();
    valid();
    submit(fixture);
    const req = http.expectOne('/api/admin/roles');
    fixture.destroy();
    expect(req.cancelled).toBe(true);
  });
});

describe('AdminRoleDetail', () => {
  let fixture: ComponentFixture<AdminRoleDetail>;
  let http: HttpTestingController;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(AdminRoleDetail);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function loaded(role = CUSTOM_ROLE, permissions = PERMISSIONS) {
    http.expectOne(`/api/admin/roles/${CUSTOM_ROLE.code}`).flush(role);
    http.expectOne('/api/admin/permissions').flush(permissions);
    fixture.detectChanges();
  }

  it('loads a custom role with read-only code and editable name and permissions', () => {
    loaded();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('warehouse-manager');
    expect(text).toContain('Warehouse manager');
    expect(text).toContain('audit.read');
    expect(text).toContain('Custom');
    expect(fixture.nativeElement.querySelector('input[formControlName=code]')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[formControlName=name]')).toBeTruthy();
    expect(fixture.nativeElement.querySelectorAll('input[type=checkbox]').length).toBe(3);
  });

  it('shows a 404 without editing controls', () => {
    http.expectOne('/api/admin/permissions').flush(PERMISSIONS);
    fail(http, '/api/admin/roles/warehouse-manager', 404, 'ADMIN_ROLE_NOT_FOUND');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('was not found');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('renames a role and applies the backend response', () => {
    loaded();
    fixture.componentInstance.nameForm.controls.name.setValue(' New name ');
    submit(fixture, 0);
    const req = http.expectOne('/api/admin/roles/warehouse-manager');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: ' New name ' });
    req.flush({ ...CUSTOM_ROLE, name: 'New name' });
    fixture.detectChanges();
    expect(fixture.componentInstance.role()?.name).toBe('New name');
    expect(fixture.componentInstance.nameForm.controls.name.value).toBe('New name');
    expect(fixture.nativeElement.textContent).toContain('Role saved successfully.');
  });

  it('rejects a blank name without sending a request', () => {
    loaded();
    fixture.componentInstance.nameForm.controls.name.setValue('   ');
    submit(fixture, 0);
    http.expectNone('/api/admin/roles/warehouse-manager');
  });

  it('replaces permissions with the complete selected collection', () => {
    loaded();
    const boxes: HTMLInputElement[] = [
      ...fixture.nativeElement.querySelectorAll('input[type=checkbox]'),
    ];
    boxes[0].click();
    fixture.detectChanges();
    boxes[1].click();
    fixture.detectChanges();
    submit(fixture, 1);
    const req = http.expectOne('/api/admin/roles/warehouse-manager/permissions');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissionCodes: ['roles.manage'] });
    req.flush({ ...CUSTOM_ROLE, permissionCodes: ['roles.manage'] });
    fixture.detectChanges();
    expect(fixture.componentInstance.selectedPermissions()).toEqual(['roles.manage']);
    expect(fixture.nativeElement.textContent).toContain('Permissions saved successfully.');
  });

  it('allows replacing permissions with an empty collection', () => {
    loaded();
    const box: HTMLInputElement = fixture.nativeElement.querySelector('input[type=checkbox]');
    box.click();
    fixture.detectChanges();
    submit(fixture, 1);
    const req = http.expectOne('/api/admin/roles/warehouse-manager/permissions');
    expect(req.request.body).toEqual({ permissionCodes: [] });
    req.flush({ ...CUSTOM_ROLE, permissionCodes: [] });
    fixture.detectChanges();
    expect(fixture.componentInstance.role()?.permissionCodes).toEqual([]);
    expect(fixture.nativeElement.textContent).toContain('No permissions assigned');
  });

  it('requires explicit confirmation before deleting', () => {
    loaded();
    fixture.nativeElement.querySelector('section button').click();
    fixture.detectChanges();
    http.expectNone('/api/admin/roles/warehouse-manager');
    expect(fixture.nativeElement.textContent).toContain('cannot be undone');
    fixture.nativeElement.querySelector('section button').click();
    const req = http.expectOne('/api/admin/roles/warehouse-manager');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(navigate).toHaveBeenCalledWith(['/admin/roles']);
  });

  it('allows cancelling deletion', () => {
    loaded();
    fixture.nativeElement.querySelector('section button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('section button:last-child').click();
    fixture.detectChanges();
    expect(fixture.componentInstance.confirmingDelete()).toBe(false);
  });

  it('keeps the role and view when deletion reports role-in-use', () => {
    loaded();
    fixture.nativeElement.querySelector('section button').click();
    fixture.detectChanges();
    fixture.nativeElement.querySelector('section button').click();
    fail(
      http,
      '/api/admin/roles/warehouse-manager',
      409,
      'ADMIN_ROLE_IN_USE',
      'Role is assigned to users',
    );
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('in use and cannot be deleted');
    expect(fixture.componentInstance.role()).toEqual(CUSTOM_ROLE);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('treats built-in roles as immutable using only the backend flag', () => {
    loaded(BUILT_IN_ROLE);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Built-in');
    expect(text).toContain('Protected role');
    expect(text).toContain('cannot be modified');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    expect(fixture.nativeElement.querySelector('input[type=checkbox]')).toBeNull();
    expect(fixture.nativeElement.querySelector('section')).toBeNull();

    fixture.componentInstance.saveName();
    fixture.componentInstance.savePermissions();
    fixture.componentInstance.confirmDelete();
    http.expectNone('/api/admin/roles/system-admin');
  });

  it('reports a revoked permission without logging out', () => {
    loaded();
    const logout = vi.spyOn(TestBed.inject(AuthSessionService), 'logout');
    fixture.componentInstance.nameForm.controls.name.setValue('Other');
    submit(fixture, 0);
    fail(http, '/api/admin/roles/warehouse-manager', 403, 'FORBIDDEN');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('permission to manage roles');
    expect(logout).not.toHaveBeenCalled();
    expect(fixture.componentInstance.role()).toEqual(CUSTOM_ROLE);
  });

  it('reports temporary unavailability on 503', () => {
    loaded();
    fixture.componentInstance.nameForm.controls.name.setValue('Other');
    submit(fixture, 0);
    fail(http, '/api/admin/roles/warehouse-manager', 503, 'AUDIT_UNAVAILABLE');
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('temporarily unavailable');
  });
});

describe('admin role errors', () => {
  it.each([
    [400, 'Check the information'],
    [401, 'session has expired'],
    [403, 'permission to manage roles'],
    [404, 'was not found'],
    [409, 'conflicts'],
    [503, 'temporarily unavailable'],
    [0, 'Unable to communicate'],
  ])('distinguishes HTTP %s', (status, text) => {
    expect(adminRoleErrorMessage(new HttpErrorResponse({ status }))).toContain(text);
  });

  it.each([
    ['ADMIN_ROLE_IN_USE', 'in use and cannot be deleted'],
    ['ADMIN_BUILT_IN_ROLE_IMMUTABLE', 'cannot be modified'],
    ['ADMIN_ROLE_ALREADY_EXISTS', 'already exists'],
  ])('distinguishes conflict code %s', (code, text) => {
    const error = new HttpErrorResponse({ status: 409, error: { code } });
    expect(adminRoleErrorMessage(error)).toContain(text);
  });

  it('refreshes the session on explicit sign-in after 401 without logging out', async () => {
    setup();
    const auth = TestBed.inject(AuthSessionService);
    const bootstrap = vi.spyOn(auth, 'bootstrap').mockResolvedValue();
    const logout = vi.spyOn(auth, 'logout');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/admin/roles/warehouse-manager');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(AdminRoleError);
    fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(logout).not.toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/roles/warehouse-manager' },
    });
  });
});
