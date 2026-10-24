import { inject } from '@angular/core';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  Router,
  RouterStateSnapshot,
} from '@angular/router';
import { AuthSessionService } from './auth-session.service';
import { FORBIDDEN_PATH, LOGIN_PATH, RETURN_URL_PARAM } from './auth-navigation';

export function requirePermission(permission: string): CanActivateFn {
  return async (_route: ActivatedRouteSnapshot, state: RouterStateSnapshot) => {
    const auth = inject(AuthSessionService);
    const router = inject(Router);

    await auth.ensureSessionResolved();

    if (auth.status() === 'authenticated' && auth.hasPermission(permission)) {
      return true;
    }

    if (auth.status() === 'authenticated') {
      return router.createUrlTree([FORBIDDEN_PATH]);
    }

    return router.createUrlTree([LOGIN_PATH], {
      queryParams: { [RETURN_URL_PARAM]: state.url },
    });
  };
}
