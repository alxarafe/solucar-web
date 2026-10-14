import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { vi } from 'vitest';
import { ContactComponent } from './contact';
import { acceptLanguageInterceptor } from '../../core/api/accept-language.interceptor';

describe('ContactComponent', () => {
  let httpMock: HttpTestingController;

  function setup(locale: 'en' | 'es' = 'en') {
    TestBed.configureTestingModule({
      imports: [ContactComponent],
      providers: [
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: locale },
      ],
    });
    httpMock = TestBed.inject(HttpTestingController);
    const fixture = TestBed.createComponent(ContactComponent);
    fixture.detectChanges();
    return fixture;
  }

  function getCreateForm(fixture: ReturnType<typeof TestBed.createComponent>) {
    const section = fixture.nativeElement.querySelector('.contact__section--create');
    return section?.querySelector('form');
  }

  function getSearchForm(fixture: ReturnType<typeof TestBed.createComponent>) {
    const section = fixture.nativeElement.querySelector('.contact__section--search');
    return section?.querySelector('form');
  }

  function submitCreateForm(
    fixture: ReturnType<typeof TestBed.createComponent>,
    data: { lastName: string; firstName: string | null; email: string | null; thirdPartyId: number | null },
    createdId = 27
  ) {
    const component = fixture.componentInstance as ContactComponent;
    component.createForm.patchValue(data);
    fixture.detectChanges();

    const form = getCreateForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const postReq = httpMock.expectOne('/api/contacts');
    expect(postReq.request.method).toBe('POST');
    expect(postReq.request.body).toEqual(data);
    postReq.flush({ id: createdId });
    fixture.detectChanges();

    const getReq = httpMock.expectOne(`/api/contacts/${createdId}`);
    expect(getReq.request.method).toBe('GET');
    return { postReq, getReq, component };
  }

  afterEach(() => {
    if (httpMock) {
      httpMock.verify();
    }
  });

  it('should create the component', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('should render page title', () => {
    const fixture = setup();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__title')?.textContent).toContain('Contacts');
  });

  it('should render search section', () => {
    const fixture = setup();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#search-title')?.textContent).toContain('Find contact');
    expect(compiled.querySelector('input[id="contactId"]')).toBeTruthy();
    expect(getSearchForm(fixture)?.querySelector('button[type="submit"]')?.textContent).toContain('Search');
  });

  it('should render create section', () => {
    const fixture = setup();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('#create-title')?.textContent).toContain('Create contact');
    expect(compiled.querySelector('input[id="lastName"]')).toBeTruthy();
    expect(compiled.querySelector('input[id="firstName"]')).toBeTruthy();
    expect(compiled.querySelector('input[id="email"]')).toBeTruthy();
    expect(compiled.querySelector('input[id="thirdPartyId"]')).toBeTruthy();
    expect(getCreateForm(fixture)?.querySelector('button[type="submit"]')?.textContent).toContain('Create contact');
  });

  it('should not submit create form when lastName is blank', () => {
    const fixture = setup();
    const component = fixture.componentInstance;
    const createSpy = vi.spyOn(component, 'createContact');

    component.createForm.patchValue({
      lastName: '',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    const form = getCreateForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    expect(createSpy).toHaveBeenCalled();
    expect(component.createForm.get('lastName')?.hasError('required')).toBe(true);
    httpMock.expectNone('/api/contacts');
  });

  it('should invoke ContactApi with canonical payload on valid create', () => {
    const fixture = setup();
    const { getReq, component } = submitCreateForm(fixture, {
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });

    getReq.flush({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    expect(component.createdId()).toBe(27);
    expect(component.contact()).toEqual({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
  });

  it('should display created ID after successful creation', () => {
    const fixture = setup();
    const { getReq } = submitCreateForm(fixture, {
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });

    getReq.flush({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__success')?.textContent).toContain('Contact created with ID 27');
  });

  it('should automatically retrieve created contact after POST', () => {
    const fixture = setup();
    const { getReq, component } = submitCreateForm(fixture, {
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });

    getReq.flush({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    expect(component.contact()).toEqual({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
  });

  it('should render retrieved contact with canonical values', () => {
    const fixture = setup();
    const { getReq } = submitCreateForm(fixture, {
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });

    getReq.flush({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__detail-value')?.textContent).toContain('Doe');
    expect(compiled.querySelectorAll('.contact__detail-value')[1]?.textContent).toContain('John');
    expect(compiled.querySelectorAll('.contact__detail-value')[2]?.textContent).toContain('john@example.test');
    expect(compiled.querySelectorAll('.contact__detail-value')[3]?.textContent).toContain('—');
  });

  it('should render nullable values safely', () => {
    const fixture = setup();
    const { getReq } = submitCreateForm(fixture, {
      lastName: 'Doe',
      firstName: null,
      email: null,
      thirdPartyId: null,
    });

    getReq.flush({
      id: 28,
      lastName: 'Doe',
      firstName: null,
      email: null,
      thirdPartyId: null,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const values = compiled.querySelectorAll('.contact__detail-value');
    expect(values[1]?.textContent).toContain('—');
    expect(values[2]?.textContent).toContain('—');
    expect(values[3]?.textContent).toContain('—');
  });

  it('should search contact by ID and display it', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 42 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/42');
    expect(req.request.method).toBe('GET');
    req.flush({
      id: 42,
      lastName: 'Smith',
      firstName: 'Jane',
      email: 'jane@example.test',
      thirdPartyId: 5,
    });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__section--result .contact__section-title')?.textContent).toContain('Contact #42');
    expect(compiled.querySelector('.contact__detail-value')?.textContent).toContain('Smith');
    expect(compiled.querySelectorAll('.contact__detail-value')[1]?.textContent).toContain('Jane');
    expect(compiled.querySelectorAll('.contact__detail-value')[2]?.textContent).toContain('jane@example.test');
    expect(compiled.querySelectorAll('.contact__detail-value')[3]?.textContent).toContain('5');
  });

  it('should display ProblemDetail.detail on 400 validation error', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.createForm.patchValue({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: 99999,
    });
    fixture.detectChanges();

    const form = getCreateForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts');
    req.flush(
      {
        type: 'urn:alixar:error:validation-required',
        title: 'Validation Error',
        status: 400,
        detail: 'The field Third party ID must reference an existing third party.',
        instance: '/api/contacts',
        code: 'VALIDATION_REQUIRED',
        field: 'thirdPartyId',
      },
      { status: 400, statusText: 'Bad Request' }
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__error-banner')?.textContent).toContain('The field Third party ID must reference an existing third party.');
  });

  it('should display ProblemDetail.detail on 404 error', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 999 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/999');
    req.flush(
      {
        type: 'urn:alixar:error:contact-not-found',
        title: 'Not Found',
        status: 404,
        detail: 'Contact with ID 999 not found.',
        instance: '/api/contacts/999',
        code: 'CONTACT_NOT_FOUND',
      },
      { status: 404, statusText: 'Not Found' }
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__error-banner')?.textContent).toContain('Contact with ID 999 not found.');
  });

  it('should display ProblemDetail.detail on 422 error', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.createForm.patchValue({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: 999,
    });
    fixture.detectChanges();

    const form = getCreateForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts');
    req.flush(
      {
        type: 'urn:alixar:error:invalid-third-party',
        title: 'Invalid Reference',
        status: 422,
        detail: 'Third party with ID 999 does not exist.',
        instance: '/api/contacts',
        code: 'CONTACT_INVALID_THIRD_PARTY_REFERENCE',
        field: 'thirdPartyId',
      },
      { status: 422, statusText: 'Unprocessable Entity' }
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__error-banner')?.textContent).toContain('Third party with ID 999 does not exist.');
  });

  it('should display localized fallback on network error', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 1 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/1');
    req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__error-banner')?.textContent).toContain('Unable to communicate with Alixar.');
  });

  it('should display localized fallback on unexpected 5xx error', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 1 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/1');
    req.flush(
      { message: 'Internal Server Error' },
      { status: 500, statusText: 'Internal Server Error' }
    );
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('.contact__error-banner')?.textContent).toContain('Unable to communicate with Alixar.');
  });

  it('should send Accept-Language: en for English locale', () => {
    const fixture = setup('en');
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 1 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/1');
    expect(req.request.headers.get('Accept-Language')).toBe('en');
  });

  it('should send Accept-Language: es for Spanish locale', () => {
    const fixture = setup('es');
    const component = fixture.componentInstance;

    component.searchForm.patchValue({ contactId: 1 });
    fixture.detectChanges();

    const form = getSearchForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const req = httpMock.expectOne('/api/contacts/1');
    expect(req.request.headers.get('Accept-Language')).toBe('es');
  });

  it('should disable submit button while request is pending', () => {
    const fixture = setup();
    const component = fixture.componentInstance;

    component.createForm.patchValue({
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    const form = getCreateForm(fixture);
    expect(form).toBeTruthy();
    form!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();

    const button = getCreateForm(fixture)?.querySelector('button[type="submit"]');
    expect(button?.disabled).toBe(true);

    const postReq = httpMock.expectOne('/api/contacts');
    postReq.flush({ id: 27 });
    fixture.detectChanges();

    const getReq = httpMock.expectOne('/api/contacts/27');
    getReq.flush({
      id: 27,
      lastName: 'Doe',
      firstName: 'John',
      email: 'john@example.test',
      thirdPartyId: null,
    });
    fixture.detectChanges();

    expect(button?.disabled).toBe(false);
  });
});