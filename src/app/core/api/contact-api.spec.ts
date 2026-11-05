import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ContactApi, Contact, CreateContactRequest, UpdateContactRequest } from './contact-api';
import { acceptLanguageInterceptor } from './accept-language.interceptor';

describe('ContactApi', () => {
  let api: ContactApi;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ContactApi,
        provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
        provideHttpClientTesting(),
        { provide: LOCALE_ID, useValue: 'en' },
      ],
    });
    api = TestBed.inject(ContactApi);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(api).toBeTruthy();
  });

  describe('listContacts', () => {
    it('should issue GET /api/contacts with default page and size', () => {
      const page = {
        items: [
          {
            id: 1,
            lastName: 'Doe',
            firstName: 'John',
            email: 'john@example.test',
            thirdPartyId: 10,
          },
        ],
        page: 0,
        size: 20,
        total: 1,
      };

      api.listContacts().subscribe((result) => {
        expect(result).toEqual(page);
      });

      const req = httpMock.expectOne('/api/contacts?page=0&size=20');
      expect(req.request.method).toBe('GET');
      req.flush(page);
    });

    it('should send the optional ThirdParty filter', () => {
      api.listContacts({ page: 2, size: 20, thirdPartyId: 10 }).subscribe();

      const req = httpMock.expectOne('/api/contacts?page=2&size=20&thirdPartyId=10');
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], page: 2, size: 20, total: 0 });
    });

    it('should omit an absent ThirdParty filter', () => {
      api.listContacts({ page: 1, size: 50, thirdPartyId: null }).subscribe();

      const req = httpMock.expectOne('/api/contacts?page=1&size=50');
      expect(req.request.method).toBe('GET');
      req.flush({ items: [], page: 1, size: 50, total: 0 });
    });

    it('should send Accept-Language header', () => {
      api.listContacts().subscribe();

      const req = httpMock.expectOne('/api/contacts?page=0&size=20');
      expect(req.request.headers.get('Accept-Language')).toBe('en');
    });
  });

  describe('getContact', () => {
    it('should issue GET /api/contacts/:id and map response', () => {
      const mockContact: Contact = {
        id: 42,
        lastName: 'Doe',
        firstName: 'John',
        email: 'john@example.test',
        thirdPartyId: null,
      };

      api.getContact(42).subscribe((contact) => {
        expect(contact).toEqual(mockContact);
      });

      const req = httpMock.expectOne('/api/contacts/42');
      expect(req.request.method).toBe('GET');
      req.flush(mockContact);
    });

    it('should send Accept-Language: en for English locale', () => {
      api.getContact(1).subscribe();

      const req = httpMock.expectOne('/api/contacts/1');
      expect(req.request.headers.get('Accept-Language')).toBe('en');
    });

    it('should send Accept-Language: es for Spanish locale', () => {
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [
          ContactApi,
          provideHttpClient(withInterceptors([acceptLanguageInterceptor])),
          provideHttpClientTesting(),
          { provide: LOCALE_ID, useValue: 'es' },
        ],
      });
      const esApi = TestBed.inject(ContactApi);
      const esHttpMock = TestBed.inject(HttpTestingController);

      esApi.getContact(1).subscribe();

      const req = esHttpMock.expectOne('/api/contacts/1');
      expect(req.request.headers.get('Accept-Language')).toBe('es');
    });
  });

  describe('createContact', () => {
    it('should issue POST /api/contacts with canonical payload and return created ID', () => {
      const request: CreateContactRequest = {
        lastName: 'Doe',
        firstName: 'John',
        email: 'john@example.test',
        thirdPartyId: null,
      };
      const response = { id: 22 };

      api.createContact(request).subscribe((result) => {
        expect(result).toEqual(response);
      });

      const req = httpMock.expectOne('/api/contacts');
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(request);
      req.flush(response);
    });

    it('should send optional fields as null when not provided', () => {
      const request: CreateContactRequest = {
        lastName: 'Doe',
        firstName: null,
        email: null,
        thirdPartyId: null,
      };

      api.createContact(request).subscribe();

      const req = httpMock.expectOne('/api/contacts');
      expect(req.request.body).toEqual(request);
    });

    it('should send Accept-Language header', () => {
      const request: CreateContactRequest = {
        lastName: 'Doe',
        firstName: 'John',
        email: 'john@example.test',
        thirdPartyId: null,
      };

      api.createContact(request).subscribe();

      const req = httpMock.expectOne('/api/contacts');
      expect(req.request.headers.get('Accept-Language')).toBe('en');
    });
  });

  describe('updateContact', () => {
    const updated: Contact = {
      id: 42,
      lastName: 'Smith',
      firstName: null,
      email: 'jane@example.test',
      thirdPartyId: 5,
    };

    it('should issue PATCH /api/contacts/:id with merge-patch content type and return the contact', () => {
      const request: UpdateContactRequest = {
        lastName: 'Smith',
        firstName: null,
        email: 'jane@example.test',
        thirdPartyId: 5,
      };

      api.updateContact(42, request).subscribe((contact) => {
        expect(contact).toEqual(updated);
      });

      const req = httpMock.expectOne('/api/contacts/42');
      expect(req.request.method).toBe('PATCH');
      expect(req.request.headers.get('Content-Type')).toBe('application/merge-patch+json');
      expect(req.request.body).toEqual(request);
      expect(req.request.body).not.toHaveProperty('id');
      req.flush(updated);
    });

    it('should omit unchanged fields from the patch body', () => {
      api.updateContact(42, { firstName: 'Jane' }).subscribe();

      const req = httpMock.expectOne('/api/contacts/42');
      expect(req.request.body).toEqual({ firstName: 'Jane' });
      req.flush(updated);
    });

    it('should send explicit null to clear an optional field', () => {
      api.updateContact(42, { email: null }).subscribe();

      const req = httpMock.expectOne('/api/contacts/42');
      expect(req.request.body).toEqual({ email: null });
      req.flush(updated);
    });

    it('should send Accept-Language header', () => {
      api.updateContact(42, { lastName: 'Smith' }).subscribe();

      const req = httpMock.expectOne('/api/contacts/42');
      expect(req.request.headers.get('Accept-Language')).toBe('en');
      req.flush(updated);
    });
  });
});
