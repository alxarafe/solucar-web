import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { Component, computed, inject, input, signal } from '@angular/core';
import { Router } from '@angular/router';
import { LOGIN_PATH, RETURN_URL_PARAM, safeReturnUrl } from '../../core/auth/auth-navigation';
import { AuthSessionService } from '../../core/auth/auth-session.service';

interface AuditProblem {
  code?: string;
  detail?: string;
}

function readProblem(error: unknown): AuditProblem {
  if (!(error instanceof HttpErrorResponse) || !error.error || typeof error.error !== 'object') {
    return {};
  }
  const candidate = error.error as Record<string, unknown>;
  return {
    code: typeof candidate['code'] === 'string' ? candidate['code'] : undefined,
    detail: typeof candidate['detail'] === 'string' ? candidate['detail'] : undefined,
  };
}

export function adminAuditErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return $localize`:@@adminAudit.error.unexpected:Unable to complete the audit request.`;
  }

  switch (error.status) {
    case HttpStatusCode.BadRequest:
      return $localize`:@@adminAudit.error.invalidQuery:Check the audit filters.`;
    case HttpStatusCode.Unauthorized:
      return $localize`:@@adminAudit.error.sessionExpired:Your session has expired. Sign in again.`;
    case HttpStatusCode.Forbidden:
      return $localize`:@@adminAudit.error.forbidden:You do not have permission to read audit events.`;
    case HttpStatusCode.ServiceUnavailable:
      return $localize`:@@adminAudit.error.unavailable:Audit is temporarily unavailable. Please try again.`;
    case 0:
      return $localize`:@@adminAudit.error.network:Unable to communicate with Alixar.`;
    default:
      return $localize`:@@adminAudit.error.unexpected:Unable to complete the audit request.`;
  }
}

@Component({
  selector: 'app-admin-audit-error',
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
          i18n="@@adminAudit.action.signIn"
        >
          Sign in again
        </button>
      }
    </div>
  `,
})
export class AdminAuditError {
  readonly error = input.required<unknown>();
  readonly message = computed(() => adminAuditErrorMessage(this.error()));
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
