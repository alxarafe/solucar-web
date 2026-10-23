import { HttpErrorResponse } from '@angular/common/http';
import { TimeoutError } from 'rxjs';
import { authErrorMessage, mapAuthError } from './auth-error';

describe('authentication errors', () => {
  it.each([
    [400, 'validation'],
    [401, 'invalid-credentials'],
    [403, 'forbidden'],
    [503, 'unavailable'],
    [500, 'unexpected'],
    [0, 'network'],
  ] as const)('should map HTTP %s before considering a misleading body code', (status, kind) => {
    const error = mapAuthError(new HttpErrorResponse({ status, error: { code: 'AUDIT_UNAVAILABLE' } }), 'login');
    expect(error.kind).toBe(kind);
  });

  it('should distinguish a missing session from rejected credentials', () => {
    const response = new HttpErrorResponse({ status: 401 });
    expect(mapAuthError(response, 'bootstrap').kind).toBe('session-expired');
    expect(mapAuthError(response, 'session').kind).toBe('session-expired');
  });

  it('should preserve structured audit failure and secondary detail', () => {
    const error = mapAuthError(new HttpErrorResponse({
      status: 503,
      error: { code: 'AUDIT_UNAVAILABLE', detail: 'Required audit append failed.' },
    }), 'login');
    expect(error).toMatchObject({ kind: 'unavailable', code: 'AUDIT_UNAVAILABLE', detail: 'Required audit append failed.' });
    expect(authErrorMessage(error)).toContain('required audit service');
    expect(authErrorMessage(error)).not.toContain('password');
  });

  it.each([null, '<html>Error</html>', { detail: { invalid: true }, code: 123, field: [] }])(
    'should tolerate unstructured or malformed error bodies', (body) => {
      const error = mapAuthError(new HttpErrorResponse({ status: 403, error: body }), 'login');
      expect(error.kind).toBe('forbidden');
      expect(error.detail).toBeUndefined();
      expect(error.code).toBeUndefined();
      expect(error.field).toBeUndefined();
    },
  );

  it('should map a deadline to backend unavailability', () => {
    expect(mapAuthError(new TimeoutError(), 'bootstrap')).toEqual({ kind: 'network' });
  });

  it('should tolerate a non-HTTP failure', () => {
    expect(mapAuthError(new Error('Unexpected failure'), 'session')).toEqual({ kind: 'unexpected' });
  });
});
