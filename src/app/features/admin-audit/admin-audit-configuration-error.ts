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

export function adminAuditConfigurationErrorMessage(error: unknown): string {
  if (!(error instanceof HttpErrorResponse)) {
    return $localize`:@@adminAuditConfiguration.error.unexpected:Unable to complete the audit configuration request.`;
  }

  switch (error.status) {
    case HttpStatusCode.BadRequest:
      switch (readProblem(error).code) {
        case 'AUDIT_INVALID_MODE':
          return $localize`:@@adminAuditConfiguration.error.invalidMode:Select a valid audit mode.`;
        case 'AUDIT_INVALID_READ_POLICY':
          return $localize`:@@adminAuditConfiguration.error.invalidPolicy:Check the read audit policy.`;
        case 'VALIDATION_REQUIRED':
          return $localize`:@@adminAuditConfiguration.error.required:Complete the required fields.`;
        default:
          return $localize`:@@adminAuditConfiguration.error.validation:Check the audit configuration values.`;
      }
    case HttpStatusCode.Unauthorized:
      return $localize`:@@adminAuditConfiguration.error.sessionExpired:Your session has expired. Sign in again.`;
    case HttpStatusCode.Forbidden:
      return $localize`:@@adminAuditConfiguration.error.forbidden:You do not have permission to configure auditing.`;
    case HttpStatusCode.ServiceUnavailable:
      return $localize`:@@adminAuditConfiguration.error.unavailable:Audit is temporarily unavailable. Please try again.`;
    case 0:
      return $localize`:@@adminAuditConfiguration.error.network:Unable to communicate with Alixar.`;
    default:
      return $localize`:@@adminAuditConfiguration.error.unexpected:Unable to complete the audit configuration request.`;
  }
}

@Component({
  selector: 'app-admin-audit-configuration-error',
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
          i18n="@@adminAuditConfiguration.action.signIn"
        >
          Sign in again
        </button>
      }
    </div>
  `,
})
export class AdminAuditConfigurationError {
  readonly error = input.required<unknown>();
  readonly message = computed(() => adminAuditConfigurationErrorMessage(this.error()));
  readonly detail = computed(() => {
    const detail = readProblem(this.error()).detail;
    return detail !== this.message() ? detail : undefined;
  });
  readonly sessionExpired = computed(() => {
    const error = this.error();
    return error instanceof HttpErrorResponse && error.status === HttpStatusCode.Unauthorized;
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
