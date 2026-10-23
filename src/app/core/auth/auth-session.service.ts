import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AuthApi, AuthIdentity } from './auth-api';
import { AuthError, mapAuthError } from './auth-error';

export type AuthStatus = 'unknown' | 'authenticated' | 'anonymous' | 'unavailable';

@Injectable({ providedIn: 'root' })
export class AuthSessionService {
  private readonly authApi = inject(AuthApi);

  private readonly _status = signal<AuthStatus>('unknown');
  private readonly _identity = signal<AuthIdentity | null>(null);
  private readonly _error = signal<AuthError | null>(null);

  readonly status = this._status.asReadonly();
  readonly identity = this._identity.asReadonly();
  readonly error = this._error.asReadonly();

  async bootstrap(): Promise<void> {
    this._status.set('unknown');
    this._error.set(null);

    try {
      const identity = await firstValueFrom(this.authApi.me());
      this.setAuthenticated(identity);
    } catch (error) {
      this.applyBootstrapError(mapAuthError(error, 'bootstrap'));
    }
  }

  async login(identifier: string, password: string): Promise<AuthError | null> {
    this._error.set(null);

    let error = await this.postLogin(identifier, password);

    if (error?.kind === 'forbidden') {
      const primeError = await this.primeCsrf();
      if (primeError) {
        this.applyLoginError(primeError);
        return primeError;
      }
      error = await this.postLogin(identifier, password);
    }

    if (error) {
      this.applyLoginError(error);
      return error;
    }

    const refreshError = await this.refreshIdentity();
    if (refreshError) {
      this.applyLoginError(refreshError);
      if (refreshError.kind !== 'session-expired') {
        this._status.set('unavailable');
      }
      return refreshError;
    }

    return null;
  }

  async logout(): Promise<AuthError | null> {
    this._error.set(null);

    try {
      await firstValueFrom(this.authApi.logout());
    } catch (error) {
      const authError = mapAuthError(error, 'logout');
      this._error.set(authError);
      return authError;
    }

    this._identity.set(null);
    this._status.set('anonymous');
    // Reconcile with the server; a 401 is the expected anonymous outcome and
    // still primes CSRF. A concurrent sign-in or an outage must not be hidden.
    await this.bootstrap();
    return null;
  }

  private async postLogin(identifier: string, password: string): Promise<AuthError | null> {
    try {
      await firstValueFrom(this.authApi.login({ identifier, password }));
      return null;
    } catch (error) {
      return mapAuthError(error, 'login');
    }
  }

  private async refreshIdentity(): Promise<AuthError | null> {
    try {
      const identity = await firstValueFrom(this.authApi.me());
      this.setAuthenticated(identity);
      return null;
    } catch (error) {
      return mapAuthError(error, 'session');
    }
  }

  private async primeCsrf(): Promise<AuthError | null> {
    try {
      await firstValueFrom(this.authApi.me());
      return null;
    } catch (error) {
      const authError = mapAuthError(error, 'session');
      return authError.kind === 'session-expired' ? null : authError;
    }
  }

  private setAuthenticated(identity: AuthIdentity): void {
    const { id, username, email } = identity;
    this._identity.set({ id, username, email });
    this._error.set(null);
    this._status.set('authenticated');
  }

  private applyBootstrapError(error: AuthError): void {
    this._identity.set(null);
    if (error.kind === 'session-expired') {
      this._error.set(null);
      this._status.set('anonymous');
      return;
    }
    this._error.set(error);
    this._status.set('unavailable');
  }

  private applyLoginError(error: AuthError): void {
    this._identity.set(null);
    this._error.set(error);
    this._status.set('anonymous');
  }
}
