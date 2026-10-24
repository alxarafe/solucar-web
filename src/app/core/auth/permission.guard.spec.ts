import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { ActivatedRouteSnapshot, Router, RouterStateSnapshot } from '@angular/router';
import { vi } from 'vitest';
import { AuthSessionService, AuthStatus } from './auth-session.service';
import { Permission } from './permission';
import { requirePermission } from './permission.guard';

class AuthSessionStub {
  readonly status = signal<AuthStatus>('unknown');
  readonly hasPermission = vi.fn<(permission: string) => boolean>().mockReturnValue(false);
  readonly ensureSessionResolved = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
}

describe('requirePermission', () => {
  let auth: AuthSessionStub;
  let router: { createUrlTree: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    auth = new AuthSessionStub();
    router = {
      createUrlTree: vi.fn((commands: unknown[], extras?: unknown) => ({ commands, extras })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthSessionService, useValue: auth },
        { provide: Router, useValue: router },
      ],
    });
  });

  async function runGuard(
    url: string,
    permission: string = Permission.UsersManage,
  ): Promise<unknown> {
    const guard = requirePermission(permission);
    return TestBed.runInInjectionContext(() =>
      guard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    );
  }

  it('should redirect an anonymous user to login with the requested URL', async () => {
    auth.status.set('anonymous');

    expect(await runGuard('/admin/users?page=2')).toEqual({
      commands: ['/login'],
      extras: { queryParams: { returnUrl: '/admin/users?page=2' } },
    });
    expect(auth.hasPermission).not.toHaveBeenCalled();
  });

  it('should send an unauthenticated user to login when the session is unavailable', async () => {
    auth.status.set('unavailable');

    expect(await runGuard('/admin/users')).toEqual({
      commands: ['/login'],
      extras: { queryParams: { returnUrl: '/admin/users' } },
    });
  });

  it('should wait for an unresolved bootstrap before deciding', async () => {
    auth.status.set('unknown');
    auth.ensureSessionResolved.mockImplementation(async () => {
      auth.status.set('authenticated');
      auth.hasPermission.mockReturnValue(true);
    });

    expect(await runGuard('/admin/users')).toBe(true);
    expect(auth.ensureSessionResolved).toHaveBeenCalledOnce();
    expect(auth.hasPermission).toHaveBeenCalledWith(Permission.UsersManage);
  });

  it('should allow an authenticated user with the required permission', async () => {
    auth.status.set('authenticated');
    auth.hasPermission.mockReturnValue(true);

    expect(await runGuard('/admin/users')).toBe(true);
    expect(auth.hasPermission).toHaveBeenCalledWith(Permission.UsersManage);
  });

  it('should send an authenticated user without the required permission to forbidden', async () => {
    auth.status.set('authenticated');
    auth.hasPermission.mockReturnValue(false);

    expect(await runGuard('/admin/users')).toEqual({ commands: ['/forbidden'] });
    expect(router.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
  });
});
