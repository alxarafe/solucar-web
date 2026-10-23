import { ApplicationInitStatus } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { appConfig } from './app.config';
import { AuthSessionService } from './core/auth/auth-session.service';
import { App } from './app';

describe('application session initializer', () => {
  it('should allow rendering the unknown state while /me is pending', async () => {
    TestBed.configureTestingModule({ imports: [App], providers: [...appConfig.providers, provideHttpClientTesting()] });
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    const initialization = TestBed.inject(ApplicationInitStatus);
    await initialization.donePromise;

    const auth = TestBed.inject(AuthSessionService);
    const http = TestBed.inject(HttpTestingController);
    expect(auth.status()).toBe('unknown');
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="status"]')?.textContent).toBe('Loading...');
    http.expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await Promise.resolve();
    expect(auth.status()).toBe('anonymous');
    http.verify();
  });
});
