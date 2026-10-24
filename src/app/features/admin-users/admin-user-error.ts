import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { authErrorMessage, mapAuthError } from '../../core/auth/auth-error';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { LOGIN_PATH, RETURN_URL_PARAM, safeReturnUrl } from '../../core/auth/auth-navigation';

export function adminUserErrorMessage(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    switch (error.status) {
      case HttpStatusCode.Forbidden:
        return $localize`:@@adminUsers.error.forbidden:You do not have permission to manage users.`;
      case HttpStatusCode.NotFound:
        return $localize`:@@adminUsers.error.notFound:The requested user or role was not found.`;
      case HttpStatusCode.Conflict:
        return $localize`:@@adminUsers.error.conflict:The change conflicts with the current data.`;
      case HttpStatusCode.ServiceUnavailable:
        return $localize`:@@adminUsers.error.unavailable:User administration is temporarily unavailable. Please try again.`;
    }
  }
  const mapped = mapAuthError(error, 'session');
  return mapped.kind === 'unexpected'
    ? $localize`:@@adminUsers.error.unexpected:Unable to complete the user administration request.`
    : authErrorMessage(mapped);
}

@Component({
  selector: 'app-admin-user-error',
  template: `
    <div role="alert">
      <p>{{ message() }}</p>
      @if (detail()) {
        <p>{{ detail() }}</p>
      }
      @if (sessionExpired()) {
        <button
          type="button"
          [disabled]="signingIn()"
          (click)="signIn()"
          i18n="@@adminUsers.action.signIn"
        >
          Sign in again
        </button>
      }
    </div>
  `,
})
export class AdminUserError {
  readonly error = input.required<unknown>();
  readonly message = computed(() => adminUserErrorMessage(this.error()));
  readonly detail = computed(() => {
    const detail = mapAuthError(this.error(), 'session').detail;
    return detail !== this.message() ? detail : undefined;
  });
  readonly sessionExpired = computed(
    () => mapAuthError(this.error(), 'session').kind === 'session-expired',
  );
  readonly signingIn = signal(false);
  private readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);

  async signIn(): Promise<void> {
    if (this.signingIn()) return;
    this.signingIn.set(true);
    const returnUrl = safeReturnUrl(this.router.url);
    try {
      await this.auth.bootstrap();
      await this.router.navigate([LOGIN_PATH], { queryParams: { [RETURN_URL_PARAM]: returnUrl } });
    } finally {
      this.signingIn.set(false);
    }
  }
}
