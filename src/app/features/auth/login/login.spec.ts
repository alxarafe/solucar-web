import { TestBed } from '@angular/core/testing';
import {
  HttpTestingController,
  provideHttpClientTesting,
} from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { vi } from 'vitest';
import { acceptLanguageInterceptor } from '../../../core/api/accept-language.interceptor';
import { AuthIdentity } from '../../../core/auth/auth-api';
import { AuthSessionService } from '../../../core/auth/auth-session.service';
import { Login } from './login';

const IDENTITY: AuthIdentity = {
  id: '8f796219-e501-44e8-a4ab-4c014821ba58',
  username: 'alice',
  email: 'alice@example.test',
};

const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

const INVALID_CREDENTIALS = {
  type: 'urn:alixar:error:authentication-invalid-credentials',
  title: 'Invalid credentials',
  status: 401,
  detail: 'Invalid credentials.',
  code: 'AUTH_INVALID_CREDENTIALS',
};

interface SetupOptions {
  returnUrl?: string;
  bootstrap?: 'anonymous' | 'authenticated' | 'unavailable';
  resolveBootstrap?: boolean;
}

describe('Login', () => {
  let httpMock: HttpTestingController;
  let auth: AuthSessionService;
  let router: { navigateByUrl: ReturnType<typeof vi.fn> };

  async function setup(options: SetupOptions = {}) {
    router = {
      navigateByUrl: vi.fn().mockResolvedValue(true),
    };

    TestBed.configureTestingModule({
      imports: [Login],
      providers: [
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en' },
        { provide: Router, useValue: router },
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              queryParamMap: convertToParamMap(
                options.returnUrl ? { returnUrl: options.returnUrl } : {},
              ),
            },
          },
        },
      ],
    });

    httpMock = TestBed.inject(HttpTestingController);
    auth = TestBed.inject(AuthSessionService);

    const bootstrap = auth.bootstrap();
    if (options.resolveBootstrap !== false) {
      const request = httpMock.expectOne('/api/auth/me');
      if (options.bootstrap === 'authenticated') {
        request.flush(IDENTITY);
      } else if (options.bootstrap === 'unavailable') {
        request.flush(
          { code: 'AUDIT_UNAVAILABLE', detail: 'Audit trail unavailable.' },
          { status: 503, statusText: 'Service Unavailable' },
        );
      } else {
        request.flush({}, { status: 401, statusText: 'Unauthorized' });
      }
      await bootstrap;
    }

    const fixture = TestBed.createComponent(Login);
    fixture.detectChanges();

    return { fixture, bootstrap };
  }

  function fillCredentials(fixture: ReturnType<typeof TestBed.createComponent<Login>>) {
    fixture.componentInstance.form.setValue({
      identifier: 'alice',
      password: 'secret',
    });
  }

  afterEach(() => {
    httpMock.verify();
  });

  it('should show loading without the form while bootstrap is pending', async () => {
    const { fixture, bootstrap } = await setup({ resolveBootstrap: false });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.login__status')?.textContent?.trim()).toBe('Loading...');
    expect(compiled.querySelector('form')).toBeNull();

    httpMock.expectOne('/api/auth/me').flush({}, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await bootstrap;
  });

  it('should authenticate, refresh /me and navigate to the default destination', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(IDENTITY);
    await tick();
    httpMock.expectOne('/api/auth/me').flush(IDENTITY);
    await submit;
    fixture.detectChanges();

    expect(auth.status()).toBe('authenticated');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts');
  });

  it('should show invalid credentials and stay anonymous after 401', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(INVALID_CREDENTIALS, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await submit;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(auth.status()).toBe('anonymous');
    expect(compiled.querySelector('.login__error')?.textContent).toContain(
      'Invalid username or password.',
    );
    expect(router.navigateByUrl).not.toHaveBeenCalled();
    expect(fixture.componentInstance.form.controls.password.value).toBe('');
  });

  it('should submit credentials entered through the form and prevent duplicate submissions', async () => {
    const { fixture } = await setup();
    const element = fixture.nativeElement as HTMLElement;
    const identifier = element.querySelector<HTMLInputElement>('#identifier')!;
    const password = element.querySelector<HTMLInputElement>('#password')!;
    identifier.value = 'alice@example.test';
    password.value = 'secret';
    identifier.dispatchEvent(new Event('input'));
    password.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await fixture.componentInstance.submit();
    const request = httpMock.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ identifier: 'alice@example.test', password: 'secret' });
    request.flush(INVALID_CREDENTIALS, { status: 401, statusText: 'Unauthorized' });
    await tick();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitting()).toBe(false);
    expect(password.value).toBe('');
  });

  it('should show a network failure without treating it as invalid credentials', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);
    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').error(new ProgressEvent('error'));
    await submit;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role="alert"]')?.textContent).toContain('Unable to communicate with Alixar.');
    expect(router.navigateByUrl).not.toHaveBeenCalled();
  });

  it('should show validation feedback after 400', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(
      { code: 'VALIDATION_REQUIRED', detail: 'Required.', field: 'identifier' },
      { status: 400, statusText: 'Bad Request' },
    );
    await submit;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login__error')?.textContent).toContain(
      'Check the information entered.',
    );
  });

  it('should show temporary unavailability after 503 AUDIT_UNAVAILABLE', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(
      { code: 'AUDIT_UNAVAILABLE', detail: 'Audit trail unavailable.' },
      { status: 503, statusText: 'Service Unavailable' },
    );
    await submit;
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.login__error')?.textContent).toContain(
      'temporarily unavailable',
    );
    expect(compiled.querySelector('.login__error')?.textContent).not.toContain(
      'Invalid username or password',
    );
  });

  it('should re-prime CSRF and retry login once after a 403 response', async () => {
    const { fixture } = await setup();
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush({}, {
      status: 403,
      statusText: 'Forbidden',
    });
    await tick();
    httpMock.expectOne('/api/auth/me').flush({}, {
      status: 401,
      statusText: 'Unauthorized',
    });
    await tick();
    httpMock.expectOne('/api/auth/login').flush(IDENTITY);
    await tick();
    httpMock.expectOne('/api/auth/me').flush(IDENTITY);
    await submit;
    fixture.detectChanges();

    expect(auth.status()).toBe('authenticated');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts');
  });

  it('should keep only an internal returnUrl', async () => {
    const { fixture } = await setup({ returnUrl: '/contacts?tab=1' });
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(IDENTITY);
    await tick();
    httpMock.expectOne('/api/auth/me').flush(IDENTITY);
    await submit;

    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts?tab=1');
  });

  it('should reject an external returnUrl', async () => {
    const { fixture } = await setup({ returnUrl: 'https://evil.example/contacts' });
    fillCredentials(fixture);

    const submit = fixture.componentInstance.submit();
    httpMock.expectOne('/api/auth/login').flush(IDENTITY);
    await tick();
    httpMock.expectOne('/api/auth/me').flush(IDENTITY);
    await submit;

    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts');
  });

  it('should redirect an already authenticated user away from /login', async () => {
    const { fixture } = await setup({ bootstrap: 'authenticated' });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.login__status')?.textContent?.trim()).toBe(
      'Redirecting...',
    );
    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts');
  });

  it('should show unavailable bootstrap state and allow retry', async () => {
    const { fixture } = await setup({ bootstrap: 'unavailable' });
    const compiled = fixture.nativeElement as HTMLElement;

    expect(compiled.querySelector('.login__error')?.textContent).toContain(
      'temporarily unavailable',
    );
    expect(compiled.querySelector('form')).toBeNull();

    const retry = fixture.componentInstance.retry();
    httpMock.expectOne('/api/auth/me').flush(IDENTITY);
    await retry;

    expect(auth.status()).toBe('authenticated');
    expect(router.navigateByUrl).toHaveBeenCalledWith('/contacts');
  });
});
