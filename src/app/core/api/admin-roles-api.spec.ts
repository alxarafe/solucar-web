import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminPermission, AdminRole, AdminRolesApi } from './admin-roles-api';

const ROLE: AdminRole = {
  code: 'warehouse-manager',
  name: 'Warehouse manager',
  builtIn: false,
  permissionCodes: ['audit.read', 'users.manage'],
};

describe('AdminRolesApi', () => {
  let api: AdminRolesApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminRolesApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists roles without pagination', () => {
    api.list().subscribe((result) => expect(result).toEqual([ROLE]));
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.method).toBe('GET');
    req.flush([ROLE]);
  });

  it('gets one role with a safely encoded path segment', () => {
    const code = 'ware house/role';
    api.get(code).subscribe((result) => expect(result).toEqual(ROLE));
    const req = http.expectOne('/api/admin/roles/ware%20house%2Frole');
    expect(req.request.method).toBe('GET');
    req.flush(ROLE);
  });

  it('creates a role with the complete canonical payload', () => {
    const body = {
      code: 'warehouse-manager',
      name: 'Warehouse manager',
      permissionCodes: ['users.manage'],
    };
    api.create(body).subscribe((result) => expect(result).toEqual(ROLE));
    const req = http.expectOne('/api/admin/roles');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    expect(req.request.withCredentials).toBe(false);
    req.flush(ROLE, { status: 201, statusText: 'Created' });
  });

  it('patches only the role name', () => {
    api.updateName(ROLE.code, 'New name').subscribe((result) => expect(result.name).toBe('New name'));
    const req = http.expectOne('/api/admin/roles/warehouse-manager');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'New name' });
    req.flush({ ...ROLE, name: 'New name' });
  });

  it('replaces the complete permission collection, including an empty one', () => {
    api.replacePermissions(ROLE.code, []).subscribe((result) => expect(result.permissionCodes).toEqual([]));
    const req = http.expectOne('/api/admin/roles/warehouse-manager/permissions');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ permissionCodes: [] });
    req.flush({ ...ROLE, permissionCodes: [] });
  });

  it('deletes a role and accepts no content', () => {
    let completed = false;
    api.delete(ROLE.code).subscribe(() => (completed = true));
    const req = http.expectOne('/api/admin/roles/warehouse-manager');
    expect(req.request.method).toBe('DELETE');
    req.flush(null, { status: 204, statusText: 'No Content' });
    expect(completed).toBe(true);
  });

  it('lists the backend permission catalogue', () => {
    const permissions: AdminPermission[] = [
      { code: 'audit.read', description: 'Read the audit trail' },
      { code: 'roles.manage', description: 'Manage roles' },
    ];
    api.listPermissions().subscribe((result) => expect(result).toEqual(permissions));
    const req = http.expectOne('/api/admin/permissions');
    expect(req.request.method).toBe('GET');
    req.flush(permissions);
  });
});
