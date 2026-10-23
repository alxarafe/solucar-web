import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { AuthSessionService } from './core/auth/auth-session.service';
import { ContactComponent } from './features/contact/contact';
import { Login } from './features/auth/login/login';

describe('session routing', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    });
  });

  afterEach(() => TestBed.inject(HttpTestingController).verify());

  it('should keep /contacts public after an anonymous bootstrap', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/contacts', ContactComponent);
    expect(TestBed.inject(Router).url).toBe('/contacts');
  });

  it('should redirect an authenticated /login visit to its internal destination', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush({
      id: '8f796219-e501-44e8-a4ab-4c014821ba58', username: 'alice', email: 'alice@example.test',
    });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login?returnUrl=%2Fcontacts%3Ftab%3D1');
    await harness.fixture.whenStable();
    expect(TestBed.inject(Router).url).toBe('/contacts?tab=1');
  });

  it('should expose /login to an anonymous user', async () => {
    const bootstrap = TestBed.inject(AuthSessionService).bootstrap();
    TestBed.inject(HttpTestingController).expectOne('/api/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    await bootstrap;
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/login', Login);
    expect(harness.routeNativeElement?.querySelector('form')).toBeTruthy();
  });
});
