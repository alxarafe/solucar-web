import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { provideRouter, Router } from '@angular/router';
import { vi } from 'vitest';
import { App } from './app';
import { CurrentUser } from './core/auth/auth-api';
import { AuthError } from './core/auth/auth-error';
import { AuthSessionService, AuthStatus } from './core/auth/auth-session.service';

const CURRENT_USER: CurrentUser = {
  id: '8f796219-e501-44e8-a4ab-4c014821ba58',
  username: 'alice',
  email: 'alice@example.test',
  roles: ['system-admin'],
  permissions: ['users.manage'],
};

class AuthSessionStub {
  readonly status = signal<AuthStatus>('unknown');
  readonly currentUser = signal<CurrentUser | null>(null);
  readonly error = signal<AuthError | null>(null);
  readonly hasPermission = vi.fn<(permission: string) => boolean>().mockReturnValue(false);
  readonly logout = vi.fn<() => Promise<AuthError | null>>().mockResolvedValue(null);
}

describe('App', () => {
  let auth: AuthSessionStub;
  let router: Router;

  beforeEach(async () => {
    auth = new AuthSessionStub();
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter([]), { provide: AuthSessionService, useValue: auth }],
    }).compileComponents();
    router = TestBed.inject(Router);
    vi.spyOn(router, 'navigateByUrl').mockResolvedValue(true);
  });

  it('should not render authenticated content while status is unknown', () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app__status')?.textContent?.trim()).toBe('Loading...');
    expect(compiled.querySelector('router-outlet')).toBeNull();
    expect(compiled.querySelector('.app__header')).toBeNull();
  });

  it('should render public content without a session header when anonymous', () => {
    auth.status.set('anonymous');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app__header')).toBeNull();
    expect(compiled.querySelector('router-outlet')).toBeTruthy();
  });

  it('should render the identity and logout action when authenticated', () => {
    auth.status.set('authenticated');
    auth.currentUser.set(CURRENT_USER);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.app__identity')?.textContent?.trim()).toBe('alice');
    expect(compiled.querySelector('.app__logout')?.textContent?.trim()).toBe('Log out');
  });

  it('shows Users only when users.manage is effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: [], permissions: ['users.manage'] });
    auth.hasPermission.mockImplementation((permission) => permission === 'users.manage');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const link = fixture.nativeElement.querySelector('.app__nav-link');
    expect(link?.textContent.trim()).toBe('Users');
    expect(link?.getAttribute('href')).toBe('/admin/users');
  });

  it('hides Users for a system-admin without effective permissions', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: ['system-admin'], permissions: [] });
    auth.hasPermission.mockReturnValue(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app__nav-link')).toBeNull();
  });

  it('shows Roles only when roles.manage is effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: [], permissions: ['roles.manage'] });
    auth.hasPermission.mockImplementation((permission) => permission === 'roles.manage');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = fixture.nativeElement.querySelectorAll('.app__nav-link');
    expect(links.length).toBe(1);
    expect(links[0].textContent.trim()).toBe('Roles');
    expect(links[0].getAttribute('href')).toBe('/admin/roles');
  });

  it('shows Users and Roles independently when both permissions are effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({
      ...CURRENT_USER,
      roles: [],
      permissions: ['users.manage', 'roles.manage'],
    });
    auth.hasPermission.mockImplementation(
      (permission) => permission === 'users.manage' || permission === 'roles.manage',
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
    expect(links.map((link) => link.textContent.trim())).toEqual(['Users', 'Roles']);
  });

  it('shows Audit only when audit.read is effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: [], permissions: ['audit.read'] });
    auth.hasPermission.mockImplementation((permission) => permission === 'audit.read');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
    expect(links.length).toBe(1);
    expect(links[0].textContent.trim()).toBe('Audit');
    expect(links[0].getAttribute('href')).toBe('/admin/audit');
  });

  it('shows configuration independently when only audit.configure is effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: [], permissions: ['audit.configure'] });
    auth.hasPermission.mockImplementation((permission) => permission === 'audit.configure');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
    expect(links.map((link) => link.textContent.trim())).toEqual(['Audit configuration']);
    expect(links[0].getAttribute('href')).toBe('/admin/audit/configuration');
  });

  it('shows Users, Roles and Audit independently when all permissions are effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({
      ...CURRENT_USER,
      roles: [],
      permissions: ['users.manage', 'roles.manage', 'audit.read'],
    });
    auth.hasPermission.mockImplementation((permission) =>
      ['users.manage', 'roles.manage', 'audit.read'].includes(permission),
    );
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
    expect(links.map((link) => link.textContent.trim())).toEqual(['Users', 'Roles', 'Audit']);
  });

  it('hides Audit for a system-admin without effective audit.read', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: ['system-admin'], permissions: [] });
    auth.hasPermission.mockReturnValue(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app__nav-link')).toBeNull();
  });

  it('shows Users without Roles when only users.manage is effective', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: [], permissions: ['users.manage'] });
    auth.hasPermission.mockImplementation((permission) => permission === 'users.manage');
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
    expect(links.map((link) => link.textContent.trim())).toEqual(['Users']);
  });

  it('hides both administration entries without administration permissions', () => {
    auth.status.set('authenticated');
    auth.currentUser.set({ ...CURRENT_USER, roles: ['system-admin'], permissions: [] });
    auth.hasPermission.mockReturnValue(false);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.app__nav-link')).toBeNull();
  });

  it.each([
    { roles: [], permissions: [], expected: [] },
    { roles: ['system-admin'], permissions: [], expected: [] },
    { roles: [], permissions: ['audit.read'], expected: ['Audit'] },
    { roles: [], permissions: ['audit.configure'], expected: ['Audit configuration'] },
    {
      roles: [],
      permissions: ['audit.read', 'audit.configure'],
      expected: ['Audit', 'Audit configuration'],
    },
  ])(
    'keeps audit navigation independent for $permissions and roles $roles',
    ({ roles, permissions, expected }) => {
      auth.status.set('authenticated');
      auth.currentUser.set({ ...CURRENT_USER, roles, permissions });
      auth.hasPermission.mockImplementation((permission) =>
        new Set<string>(permissions).has(permission),
      );
      const fixture = TestBed.createComponent(App);
      fixture.detectChanges();
      const links = [...fixture.nativeElement.querySelectorAll('.app__nav-link')];
      expect(links.map((link) => link.textContent.trim())).toEqual(expected);
    },
  );

  it('should clear the frontend session and navigate to login after logout', async () => {
    auth.status.set('authenticated');
    auth.currentUser.set(CURRENT_USER);
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await fixture.componentInstance.logout();

    expect(auth.logout).toHaveBeenCalledOnce();
    expect(router.navigateByUrl).toHaveBeenCalledWith('/login');
  });

  it('should keep the session and show an error when logout fails', async () => {
    auth.status.set('authenticated');
    auth.currentUser.set(CURRENT_USER);
    auth.logout.mockResolvedValue({ kind: 'unavailable' });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();

    await fixture.componentInstance.logout();
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(compiled.querySelector('.app__alert')?.textContent).toContain(
      'Authentication is temporarily unavailable',
    );
  });
});
