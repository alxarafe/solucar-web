import { TestBed } from '@angular/core/testing';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { LOCALE_ID } from '@angular/core';
import { ContactApi, Contact, CreateContactRequest } from './contact-api';
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
});