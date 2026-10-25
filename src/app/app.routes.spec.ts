import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/auth-session.service';
import { ContactComponent } from './features/contact/contact';
import { Login } from './features/auth/login/login';
import { Forbidden } from './features/auth/forbidden/forbidden';

describe('session routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should keep /contacts public after an anonymous bootstrap', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/contacts', ContactComponent);
    expect(TestBed.inject(Router).url).toBe('/contacts');
  });

  it('should redirect an authenticated /login visit to its internal destination', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({
        id: '8f796219-e501-44e8-a4ab-4c014821ba58',
        username: 'alice',
        email: 'alice@example.test',
        roles: ['system-admin'],
        permissions: ['users.manage'],
      });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login?returnUrl=%2Fcontacts%3Ftab%3D1');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/contacts?tab=1');
  });

  it('should expose /forbidden without requiring a session', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/forbidden', Forbidden);

    expect(TestBed.inject(Router).url).toBe('/forbidden');
    expect(harness.routeNativeElement?.querySelector('h1')?.textContent?.trim()).toBe(
      'Access denied',
    );
  });

  it('should expose /login to an anonymous user', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', Login);
    expect(harness.routeNativeElement?.querySelector('form')).toBeTruthy();
  });

  for (const path of ['/admin/users', '/admin/users/new', '/admin/users/user-id']) {
    it(`protects ${path} from anonymous users with an internal returnUrl`, async () => {
      const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
      TestBed.inject(HttpTestingController)
        .expectOne('/api/auth/me')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      await bootstrap;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      const router = TestBed.inject(Router);
      expect(router.url.split('?')[0]).toBe('/login');
      expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe(path);
    });

    it.each([{ roles: [] }, { roles: ['system-admin'] }])(
      `forbids ${path} without permissions regardless of roles $roles`,
      async ({ roles }) => {
        const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
        TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush({
          id: 'admin-id',
          username: 'admin',
          email: 'admin@example.test',
          roles,
          permissions: [],
        });
        await bootstrap;
        const harness = await RouterTestingHarness.create();
        await harness.navigateByUrl(path, Forbidden);
        expect(TestBed.inject(Router).url).toBe('/forbidden');
        expect(TestBed.inject(AuthSessionService).status()).toBe('authenticated');
      },
    );

    it(`allows ${path} with users.manage and no roles`, async () => {
      const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/auth/me').flush({
        id: 'admin-id',
        username: 'admin',
        email: 'admin@example.test',
        roles: [],
        permissions: ['users.manage'],
      });
      await bootstrap;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      expect(TestBed.inject(Router).url).toBe(path);
      if (path === '/admin/users') {
        http
          .expectOne('/api/admin/users?page=0&size=20')
          .flush({ items: [], page: 0, size: 20, total: 0 });
      } else {
        http.expectOne('/api/admin/roles').flush([]);
        if (path.endsWith('/user-id')) {
          http.expectOne('/api/admin/users/user-id').flush({
            id: 'user-id',
            username: 'alice',
            email: 'alice@example.test',
            enabled: false,
            roles: [],
            createdAt: '2026-10-24T10:00:00Z',
            updatedAt: '2026-10-24T10:00:00Z',
          });
        }
      }
    });
  }

  it('forbids /admin/users when only roles.manage is effective', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({
        id: 'admin-id',
        username: 'admin',
        email: 'admin@example.test',
        roles: [],
        permissions: ['roles.manage'],
      });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/users', Forbidden);
    expect(TestBed.inject(Router).url).toBe('/forbidden');
  });

  for (const path of ['/admin/roles', '/admin/roles/new', '/admin/roles/role-code']) {
    it(`protects ${path} from anonymous users with an internal returnUrl`, async () => {
      const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
      TestBed.inject(HttpTestingController)
        .expectOne('/api/auth/me')
        .flush(null, { status: 401, statusText: 'Unauthorized' });
      await bootstrap;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      const router = TestBed.inject(Router);
      expect(router.url.split('?')[0]).toBe('/login');
      expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe(path);
    });

    it.each([
      { roles: [] as string[], permissions: [] as string[] },
      { roles: ['system-admin'], permissions: [] as string[] },
      { roles: [] as string[], permissions: ['users.manage'] },
    ])(`forbids ${path} without roles.manage`, async ({ roles, permissions }) => {
      const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
      TestBed.inject(HttpTestingController)
        .expectOne('/api/auth/me')
        .flush({
          id: 'admin-id',
          username: 'admin',
          email: 'admin@example.test',
          roles,
          permissions,
        });
      await bootstrap;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path, Forbidden);
      expect(TestBed.inject(Router).url).toBe('/forbidden');
      expect(TestBed.inject(AuthSessionService).status()).toBe('authenticated');
    });

    it(`allows ${path} with roles.manage and no roles`, async () => {
      const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
      const http = TestBed.inject(HttpTestingController);
      http.expectOne('/api/auth/me').flush({
        id: 'admin-id',
        username: 'admin',
        email: 'admin@example.test',
        roles: [],
        permissions: ['roles.manage'],
      });
      await bootstrap;
      const harness = await RouterTestingHarness.create();
      await harness.navigateByUrl(path);
      expect(TestBed.inject(Router).url).toBe(path);
      if (path === '/admin/roles') {
        http.expectOne('/api/admin/roles').flush([]);
      } else if (path === '/admin/roles/new') {
        http.expectOne('/api/admin/permissions').flush([]);
      } else {
        http.expectOne('/api/admin/roles/role-code').flush({
          code: 'role-code',
          name: 'Role code',
          builtIn: false,
          permissionCodes: [],
        });
        http.expectOne('/api/admin/permissions').flush([]);
      }
    });
  }

  it('protects /admin/audit from anonymous users with an internal returnUrl', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush(null, { status: 401, statusText: 'Unauthorized' });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/audit');
    const router = TestBed.inject(Router);
    expect(router.url.split('?')[0]).toBe('/login');
    expect(router.parseUrl(router.url).queryParams['returnUrl']).toBe('/admin/audit');
  });

  it.each([
    { roles: [] as string[], permissions: [] as string[] },
    { roles: ['system-admin'], permissions: [] as string[] },
    { roles: [] as string[], permissions: ['audit.configure'] },
    { roles: [] as string[], permissions: ['users.manage', 'roles.manage'] },
  ])('forbids /admin/audit without audit.read', async ({ roles, permissions }) => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController)
      .expectOne('/api/auth/me')
      .flush({
        id: 'admin-id',
        username: 'admin',
        email: 'admin@example.test',
        roles,
        permissions,
      });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/audit', Forbidden);
    expect(TestBed.inject(Router).url).toBe('/forbidden');
    expect(TestBed.inject(AuthSessionService).status()).toBe('authenticated');
  });

  it('allows /admin/audit with audit.read and no roles', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/me').flush({
      id: 'auditor-id',
      username: 'auditor',
      email: 'auditor@example.test',
      roles: [],
      permissions: ['audit.read'],
    });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/audit');
    expect(TestBed.inject(Router).url).toBe('/admin/audit');
    http.expectOne('/api/admin/audit-events?afterSequence=0&limit=50').flush([]);
  });

  it('allows /admin/audit when audit.read coexists with roles.manage', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    const http = TestBed.inject(HttpTestingController);
    http.expectOne('/api/auth/me').flush({
      id: 'auditor-id',
      username: 'auditor',
      email: 'auditor@example.test',
      roles: [],
      permissions: ['roles.manage', 'audit.read'],
    });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/admin/audit');
    expect(TestBed.inject(Router).url).toBe('/admin/audit');
    http.expectOne('/api/admin/audit-events?afterSequence=0&limit=50').flush([]);
  });
});
