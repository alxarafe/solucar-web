import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { Contact } from '../../core/api/contact-api';
import { ContactEditComponent } from './contact-edit';

const CONTACT: Contact = {
  id: 42,
  lastName: 'Doe',
  firstName: 'John',
  email: 'john@example.test',
  thirdPartyId: 10,
};

const CONTACT_URL = '/api/contacts/42';

describe('ContactEditComponent', () => {
  let fixture: ComponentFixture<ContactEditComponent>;
  let http: HttpTestingController;
  let navigateSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ContactEditComponent],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: '42' })) },
        },
      ],
    });
    http = TestBed.inject(HttpTestingController);
    navigateSpy = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ContactEditComponent);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function component(): ContactEditComponent {
    return fixture.componentInstance;
  }

  function flushLoad(contact: Contact = CONTACT): void {
    http.expectOne(CONTACT_URL).flush(contact);
    fixture.detectChanges();
  }

  function submit(): void {
    fixture.nativeElement
      .querySelector('form')
      .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    fixture.detectChanges();
  }

  function change(value: Partial<Contact>): void {
    component().form.patchValue(value);
    fixture.detectChanges();
  }

  function button(text: string): HTMLButtonElement {
    const match = [...fixture.nativeElement.querySelectorAll('button')].find(
      (element: HTMLButtonElement) => element.textContent?.trim() === text,
    );
    expect(match).toBeTruthy();
    return match as HTMLButtonElement;
  }

  function startDeletion(): void {
    button('Delete contact').click();
    fixture.detectChanges();
    button('Delete permanently').click();
    fixture.detectChanges();
  }

  it('shows a loading state until the contact is retrieved', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading contact...');
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
    flushLoad();
    expect(fixture.nativeElement.textContent).not.toContain('Loading contact...');
  });

  it('loads the contact from the canonical GET endpoint and populates the form', () => {
    const req = http.expectOne(CONTACT_URL);
    expect(req.request.method).toBe('GET');
    req.flush(CONTACT);
    fixture.detectChanges();

    expect(component().form.getRawValue()).toEqual({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: 10,
    });
    expect(component().contactId()).toBe(42);
    expect(fixture.nativeElement.textContent).toContain('Edit contact #42');
    expect(component().changed()).toBe(false);
  });

  it('shows loading errors without rendering the form', () => {
    http
      .expectOne(CONTACT_URL)
      .flush(
        { detail: 'Contact with ID 42 not found.', code: 'CONTACT_NOT_FOUND' },
        { status: 404, statusText: 'Not Found' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Contact with ID 42 not found.',
    );
    expect(fixture.nativeElement.querySelector('form')).toBeNull();
  });

  it('sends only changed fields as a merge patch with the canonical content type', () => {
    flushLoad();
    change({ lastName: 'Smith', email: 'jane@example.test' });

    submit();

    const req = http.expectOne(CONTACT_URL);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
    expect(req.request.body).toEqual({
      lastName: 'Smith',
      email: 'jane@example.test',
    });
    expect(req.request.body).not.toHaveProperty('id');
    req.flush({ ...CONTACT, lastName: 'Smith', email: 'jane@example.test' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.contact__success')?.textContent).toContain(
      'Contact saved successfully.',
    );
  });

  it('sends null when an optional field is cleared', () => {
    flushLoad();
    change({ firstName: '', email: null, thirdPartyId: null });

    submit();

    const req = http.expectOne(CONTACT_URL);
    expect(req.request.body).toEqual({
      firstName: null,
      email: null,
      thirdPartyId: null,
    });
    req.flush({ ...CONTACT, firstName: null, email: null, thirdPartyId: null });
    fixture.detectChanges();
  });

  it('does not send a mutation when the effective values have not changed', () => {
    flushLoad();

    submit();

    http.expectNone(CONTACT_URL);
    expect(component().success()).toBeNull();
    expect(component().error()).toBeNull();
  });

  it('refreshes the displayed values from the successful PATCH response', () => {
    flushLoad();
    const updated: Contact = {
      ...CONTACT,
      firstName: 'Jane',
      email: null,
      thirdPartyId: null,
    };
    change({ firstName: 'Jane', email: '', thirdPartyId: null });

    submit();
    http.expectOne(CONTACT_URL).flush(updated);
    fixture.detectChanges();

    expect(component().contact()).toEqual(updated);
    expect(component().form.getRawValue()).toEqual({
      lastName: 'Doe',
      firstName: 'Jane',
      email: null,
      thirdPartyId: null,
    });
    expect(component().changed()).toBe(false);
  });

  it('rejects a blank last name without sending a request', () => {
    flushLoad();
    change({ lastName: '   ' });

    expect(component().form.controls.lastName.hasError('nonBlank')).toBe(true);
    submit();

    http.expectNone(CONTACT_URL);
    expect(fixture.nativeElement.textContent).toContain('Last name is required.');
  });

  it('rejects a non-positive ThirdParty reference without sending a request', () => {
    flushLoad();
    change({ thirdPartyId: 0 });

    expect(component().form.controls.thirdPartyId.hasError('positiveInteger')).toBe(true);
    submit();

    http.expectNone(CONTACT_URL);
    expect(fixture.nativeElement.textContent).toContain(
      'Third party ID must be a positive integer.',
    );
  });

  it('rejects a non-integer ThirdParty reference without sending a request', () => {
    flushLoad();
    change({ thirdPartyId: 1.5 });

    expect(component().form.controls.thirdPartyId.hasError('positiveInteger')).toBe(true);
    submit();

    http.expectNone(CONTACT_URL);
  });

  it('preserves entered values and shows the canonical detail on a failed update', () => {
    flushLoad();
    change({ email: 'new@example.test' });
    submit();

    http.expectOne(CONTACT_URL).flush(
      {
        type: 'urn:alixar:error:contact-invalid-third-party',
        title: 'Invalid Reference',
        status: 422,
        detail: 'Third party with ID 999 does not exist.',
        code: 'CONTACT_INVALID_THIRD_PARTY_REFERENCE',
      },
      { status: 422, statusText: 'Unprocessable Entity' },
    );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Third party with ID 999 does not exist.',
    );
    expect(component().form.controls.email.value).toBe('new@example.test');
    expect(component().success()).toBeNull();
  });

  it.each([
    { status: 400, code: 'VALIDATION_REQUIRED', detail: 'The contact data is invalid.' },
    { status: 404, code: 'CONTACT_NOT_FOUND', detail: 'Contact with ID 42 not found.' },
    {
      status: 422,
      code: 'CONTACT_INVALID_THIRD_PARTY_REFERENCE',
      detail: 'Third party does not exist.',
    },
    {
      status: 503,
      code: 'AUDIT_UNAVAILABLE',
      detail: 'Audit is temporarily unavailable.',
    },
  ])('shows the canonical detail for a $status response', ({ status, code, detail }) => {
    flushLoad();
    change({ firstName: 'Jane' });
    submit();

    http
      .expectOne(CONTACT_URL)
      .flush(
        { type: 'urn:alixar:error', title: 'Error', status, detail, code },
        { status, statusText: 'Error' },
      );
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(detail);
    expect(component().success()).toBeNull();
  });

  it('shows a saving state and disables the action until the response arrives', () => {
    flushLoad();
    change({ lastName: 'Smith' });

    submit();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('.contact__button');
    expect(button.disabled).toBe(true);
    expect(button.textContent).toContain('Saving...');

    http.expectOne(CONTACT_URL).flush({ ...CONTACT, lastName: 'Smith' });
    fixture.detectChanges();

    expect(button.textContent).toContain('Save changes');
    expect(component().saving()).toBe(false);
  });

  it('offers deletion only after the contact has loaded', () => {
    expect(component().contact()).toBeNull();
    expect(fixture.nativeElement.textContent).not.toContain('Delete contact');
    flushLoad();
    expect(button('Delete contact')).toBeTruthy();
  });

  it('does not send DELETE before explicit confirmation', () => {
    flushLoad();

    button('Delete contact').click();
    fixture.detectChanges();

    http.expectNone(CONTACT_URL);
    expect(component().confirmingDelete()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('This action is permanent');
    expect(fixture.nativeElement.textContent).toContain('Delete contact #42 (Doe, John)?');
  });

  it('cancels the confirmation without sending DELETE', () => {
    flushLoad();
    button('Delete contact').click();
    fixture.detectChanges();

    button('Cancel').click();
    fixture.detectChanges();

    http.expectNone(CONTACT_URL);
    expect(component().confirmingDelete()).toBe(false);
    expect(component().contact()).toEqual(CONTACT);
    expect(button('Delete contact')).toBeTruthy();
  });

  it('warns that unsaved changes will be discarded', () => {
    flushLoad();
    change({ lastName: 'Smith' });

    button('Delete contact').click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Unsaved changes will be discarded.');
  });

  it('deletes after confirmation, navigates to Contacts and never reads the contact again', () => {
    flushLoad();
    startDeletion();

    const req = http.expectOne(CONTACT_URL);
    expect(req.request.method).toBe('DELETE');
    expect(req.request.body).toBeNull();
    expect(component().success()).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.contact__success')).toBeNull();

    req.flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/contacts']);
    expect(component().contact()).toBeNull();
    http.expectNone(CONTACT_URL);
  });

  it('prevents duplicate DELETE requests', () => {
    flushLoad();
    button('Delete contact').click();
    fixture.detectChanges();

    const confirmButton = button('Delete permanently');
    confirmButton.click();
    confirmButton.click();
    fixture.detectChanges();

    const requests = http.match(CONTACT_URL);
    expect(requests.length).toBe(1);

    requests[0].flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();
    expect(navigateSpy).toHaveBeenCalledWith(['/contacts']);
  });

  it.each([
    { status: 404, code: 'CONTACT_NOT_FOUND', detail: 'Contact with ID 42 not found.' },
    { status: 403, code: 'FORBIDDEN', detail: 'You are not allowed to delete this contact.' },
    {
      status: 503,
      code: 'AUDIT_UNAVAILABLE',
      detail: 'Audit is temporarily unavailable.',
    },
  ])(
    'keeps the contact and shows the canonical detail after a $status failure',
    ({ status, code, detail }) => {
      flushLoad();
      startDeletion();

      http
        .expectOne(CONTACT_URL)
        .flush(
          { type: 'urn:alixar:error', title: 'Error', status, detail, code },
          { status, statusText: 'Error' },
        );
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(detail);
      expect(component().contact()).toEqual(CONTACT);
      expect(component().success()).toBeNull();
      expect(navigateSpy).not.toHaveBeenCalled();
      expect(component().deleting()).toBe(false);
    },
  );

  it('keeps the contact and shows the localized fallback on a network failure', () => {
    flushLoad();
    startDeletion();

    http
      .expectOne(CONTACT_URL)
      .error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role=alert]').textContent).toContain(
      'Unable to communicate with Alixar.',
    );
    expect(component().contact()).toEqual(CONTACT);
    expect(component().success()).toBeNull();
    expect(navigateSpy).not.toHaveBeenCalled();
  });

  it('shows a deleting state and disables the actions until the response arrives', () => {
    flushLoad();
    startDeletion();

    const confirmButton = fixture.nativeElement.querySelectorAll(
      '.contact__filter-actions button',
    )[0];
    expect(confirmButton.disabled).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Deleting...');
    expect(fixture.nativeElement.querySelector('form button[type=submit]').disabled).toBe(true);

    http.expectOne(CONTACT_URL).flush(null, { status: 204, statusText: 'No Content' });
    fixture.detectChanges();

    expect(component().deleting()).toBe(false);
  });

  it('does not render any @contact. marker in visible UI text', () => {
    flushLoad();
    expect(fixture.nativeElement.textContent).not.toContain('@@contact.');
  });
});
