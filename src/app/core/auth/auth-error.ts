import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { ProblemDetail } from '../api/problem-detail';

export type AuthErrorContext = 'login' | 'bootstrap' | 'logout' | 'session';

export type AuthErrorKind =
  | 'invalid-credentials'
  | 'validation'
  | 'forbidden'
  | 'unavailable'
  | 'network'
  | 'session-expired'
  | 'unexpected';

export interface AuthError {
  kind: AuthErrorKind;
  code?: string;
  detail?: string;
  field?: string;
}

type AuthProblemDetail = Partial<ProblemDetail>;
const AUDIT_UNAVAILABLE_CODE = 'AUDIT_UNAVAILABLE';

export function mapAuthError(error: unknown, context: AuthErrorContext): AuthError {
  if (error instanceof TimeoutError) {
    return { kind: 'network' };
  }

  if (!(error instanceof HttpErrorResponse)) {
    return { kind: 'unexpected' };
  }

  if (error.status === 0) {
    return { kind: 'network' };
  }

  const problem = readProblemDetail(error.error);

  switch (error.status) {
    case 400:
      return withProblem({ kind: 'validation' }, problem);
    case 401:
      return withProblem(
        { kind: context === 'login' ? 'invalid-credentials' : 'session-expired' },
        problem,
      );
    case 403:
      return withProblem({ kind: 'forbidden' }, problem);
    case 503:
      return withProblem({ kind: 'unavailable' }, problem);
    default:
      return withProblem({ kind: 'unexpected' }, problem);
  }
}

export function authErrorMessage(error: AuthError): string {
  switch (error.kind) {
    case 'invalid-credentials':
      return $localize`:@@auth.error.invalidCredentials:Invalid username or password.`;
    case 'validation':
      return $localize`:@@auth.error.validation:Check the information entered.`;
    case 'forbidden':
      return $localize`:@@auth.error.forbidden:Your session could not be verified. Reload the page and try again.`;
    case 'unavailable':
      if (error.code === AUDIT_UNAVAILABLE_CODE) {
        return $localize`:@@auth.error.auditUnavailable:Authentication is temporarily unavailable because the required audit service is unavailable. Please try again.`;
      }
      return $localize`:@@auth.error.unavailable:Authentication is temporarily unavailable. Please try again.`;
    case 'network':
      return $localize`:@@auth.error.network:Unable to communicate with Alixar.`;
    case 'session-expired':
      return $localize`:@@auth.error.sessionExpired:Your session has expired. Sign in again.`;
    case 'unexpected':
      return $localize`:@@auth.error.unexpected:An unexpected authentication error occurred.`;
  }
}

function readProblemDetail(value: unknown): AuthProblemDetail | null {
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Record<string, unknown>;
  return {
    code: typeof candidate['code'] === 'string' ? candidate['code'] : undefined,
    detail: typeof candidate['detail'] === 'string' ? candidate['detail'] : undefined,
    field: typeof candidate['field'] === 'string' ? candidate['field'] : undefined,
  };
}

function withProblem(error: AuthError, problem: AuthProblemDetail | null): AuthError {
  if (!problem) {
    return error;
  }

  return {
    ...error,
    code: problem.code,
    detail: problem.detail,
    field: problem.field,
  };
}
