import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Permission } from '../../core/auth/permission';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { Contact } from '../../core/api/contact-api';
import { ContactListComponent } from './contact-list';

const CONTACT: Contact = {
  id: 1,
  lastName: 'Doe',
  firstName: 'John',
  email: 'john@example.test',
  thirdPartyId: 10,
};

const DEFAULT_URL = '/api/contacts?page=0&size=20';

class AuthSessionStub {
  constructor(private readonly canManage: boolean) {}

  hasPermission(permission: string): boolean {
    return this.canManage && permission === Permission.ContactsManage;
  }
}

describe('ContactListComponent', () => {
  let fixture: ComponentFixture<ContactListComponent>;
  let http: HttpTestingController;

  function setup(canManage = false): void {
    TestBed.configureTestingModule({
      imports: [ContactListComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: AuthSessionService, useValue: new AuthSessionStub(canManage) },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(ContactListComponent);
    fixture.detectChanges();
  }

  function flush(items: Contact[] = [CONTACT], page = 0, total = 42, size = 20, query = ''): void {
    http
      .expectOne(`/api/contacts?page=${page}&size=${size}${query}`)
      .flush({ items, page, size, total });
    fixture.detectChanges();
  }

  function submitFilter(): void {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  afterEach(() => http.verify());

  it('shows loading while the initial request is pending', () => {
    setup();
    expect(fixture.nativeElement.textContent).toContain('Loading contacts...');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    flush();
  });

  it('renders canonical contact fields in a table', () => {
    setup();
    flush();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Doe');
    expect(text).toContain('John');
    expect(text).toContain('john@example.test');
    expect(text).toContain('10');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(1);
  });

  it('renders nullable contact fields safely', () => {
    setup();
    flush([{ ...CONTACT, firstName: null, email: null, thirdPartyId: null }]);
    const values = [...fixture.nativeElement.querySelectorAll('tbody td')].map(
      (cell: HTMLElement) => cell.textContent?.trim(),
    );
    expect(values).toEqual(['1', 'Doe', '—', '—', '—']);
  });

  it('renders an empty result', () => {
    setup();
    flush([], 0, 0);
    expect(fixture.nativeElement.textContent).toContain('No contacts found');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows an API error and retries the same request', () => {
    setup();
    http
      .expectOne(DEFAULT_URL)
      .flush(
        { detail: 'Contacts are temporarily unavailable.', code: 'CONTACT_UNAVAILABLE' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Contacts are temporarily unavailable.',
    );

    [...fixture.nativeElement.querySelectorAll('button')]
      .find((button: HTMLButtonElement) => button.textContent?.trim() === 'Retry')
      .click();
    flush();
    expect(fixture.nativeElement.textContent).toContain('Doe');
  });

  it('shows the localized fallback for a network failure', () => {
    setup();
    http.expectOne(DEFAULT_URL).error(new ProgressEvent('error'), {
      status: 0,
      statusText: 'Unknown Error',
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Unable to communicate with Alixar.',
    );
  });

  it('requests server pages and disables pagination at both boundaries', () => {
    setup();
    flush([CONTACT], 0, 42);

    const buttons = (): HTMLButtonElement[] => [
      ...fixture.nativeElement.querySelectorAll('.pagination button'),
    ];
    expect(buttons()[0].disabled).toBe(true);
    expect(buttons()[1].disabled).toBe(false);

    buttons()[1].click();
    flush([CONTACT], 1, 42);
    expect(fixture.nativeElement.textContent).toContain('Page 2');
    expect(buttons()[0].disabled).toBe(false);

    buttons()[0].click();
    flush([CONTACT], 0, 42);
    expect(fixture.nativeElement.textContent).toContain('Page 1');
    expect(buttons()[0].disabled).toBe(true);

    fixture.componentInstance.page(-1);
    fixture.componentInstance.page(1);
    flush([CONTACT], 1, 42);
  });

  it('disables both pagination actions when a single page contains every result', () => {
    setup();
    flush([CONTACT], 0, 1);
    const buttons: HTMLButtonElement[] = [
      ...fixture.nativeElement.querySelectorAll('.pagination button'),
    ];
    expect(buttons.every((button) => button.disabled)).toBe(true);

    fixture.componentInstance.page(-1);
    fixture.componentInstance.page(1);
    http.expectNone(DEFAULT_URL);
  });

  it('applies the ThirdParty filter from page zero and clears it', () => {
    setup();
    flush([CONTACT], 0, 42);

    fixture.nativeElement.querySelector('.pagination button:last-child').click();
    flush([CONTACT], 1, 42);

    fixture.componentInstance.filterForm.controls.thirdPartyId.setValue(10);
    submitFilter();
    flush([CONTACT], 0, 1, 20, '&thirdPartyId=10');

    fixture.nativeElement.querySelector('form button[type=button]').click();
    flush([], 0, 0);
    expect(fixture.componentInstance.filterForm.controls.thirdPartyId.value).toBeNull();
  });

  it('does not create contacts without contacts.manage', () => {
    setup(false);
    flush();
    expect(fixture.nativeElement.querySelector('a[href="/contacts/new"]')).toBeNull();
  });

  it('offers contact creation with contacts.manage', () => {
    setup(true);
    flush();
    const link = fixture.nativeElement.querySelector('a[href="/contacts/new"]');
    expect(link?.textContent?.trim()).toBe('New contact');
  });

  it('does not expose contact editing without contacts.manage', () => {
    setup(false);
    flush();
    expect(fixture.nativeElement.querySelector('a[href="/contacts/1/edit"]')).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Actions');
  });

  it('offers contact editing with contacts.manage', () => {
    setup(true);
    flush();
    const link = fixture.nativeElement.querySelector('a[href="/contacts/1/edit"]');
    expect(link?.textContent?.trim()).toBe('Edit');
    expect(fixture.nativeElement.textContent).toContain('Actions');
  });

  it('does not render any @contact. marker in visible UI text', () => {
    setup();
    flush();
    expect(fixture.nativeElement.textContent).not.toContain('@@contact.');
  });
});
