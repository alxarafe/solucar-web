import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LOGIN_PATH, RETURN_URL_PARAM, safeReturnUrl } from '../../core/auth/auth-navigation';
import { AuthSessionService } from '../../core/auth/auth-session.service';

const ROLE_IN_USE_CODE = 'ADMIN_ROLE_IN_USE';
const BUILT_IN_ROLE_IMMUTABLE_CODE = 'ADMIN_BUILT_IN_ROLE_IMMUTABLE';
const ROLE_ALREADY_EXISTS_CODE = 'ADMIN_ROLE_ALREADY_EXISTS';

interface RoleProblem {
  code?: string;
  detail?: string;
}

function readProblem(error: unknown): RoleProblem {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
    return {};
  }
  const candidate = error.error as Record<string, unknown>;
  return {
    code: typeof candidate['code'] === 'string' ? candidate['code'] : undefined,
    detail: typeof candidate['detail'] === 'string' ? candidate['detail'] : undefined,
  };
}

export function adminRoleErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return $localize`:@@adminRoles.error.unexpected:Unable to complete the role administration request.`;
  }

  const problem = readProblem(error);
  switch (error.status) {
    case HttpStatusCode.BadRequest:
      return $localize`:@@adminRoles.error.validation:Check the information entered.`;
    case HttpStatusCode.Unauthorized:
      return $localize`:@@adminRoles.error.sessionExpired:Your session has expired. Sign in again.`;
    case HttpStatusCode.Forbidden:
      return $localize`:@@adminRoles.error.forbidden:You do not have permission to manage roles.`;
    case HttpStatusCode.NotFound:
      return $localize`:@@adminRoles.error.notFound:The requested role or permission was not found.`;
    case HttpStatusCode.Conflict:
      if (problem.code === ROLE_IN_USE_CODE) {
        return $localize`:@@adminRoles.error.roleInUse:This role is in use and cannot be deleted.`;
      }
      if (problem.code === BUILT_IN_ROLE_IMMUTABLE_CODE) {
        return $localize`:@@adminRoles.error.builtInImmutable:This built-in role cannot be modified.`;
      }
      if (problem.code === ROLE_ALREADY_EXISTS_CODE) {
        return $localize`:@@adminRoles.error.duplicateCode:A role with this code already exists.`;
      }
      return $localize`:@@adminRoles.error.conflict:The change conflicts with the current data.`;
    case HttpStatusCode.ServiceUnavailable:
      return $localize`:@@adminRoles.error.unavailable:Role administration is temporarily unavailable. Please try again.`;
    case 0:
      return $localize`:@@adminRoles.error.network:Unable to communicate with Alixar.`;
    default:
      return $localize`:@@adminRoles.error.unexpected:Unable to complete the role administration request.`;
  }
}

@Component({
  selector: 'app-admin-role-error',
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
          i18n="@@adminRoles.action.signIn"
        >
          Sign in again
        </button>
      }
    </div>
  `,
})
export class AdminRoleError {
  readonly error = input.required<unknown>();
  readonly message = computed(() => adminRoleErrorMessage(this.error()));
  readonly detail = computed(() => {
    const detail = readProblem(this.error()).detail;
    return detail !== this.message() ? detail : undefined;
  });
  readonly sessionExpired = computed(() => {
    const error = this.error();
    return error instanceof HttpErrorResponse && error.status === 401;
  });
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
