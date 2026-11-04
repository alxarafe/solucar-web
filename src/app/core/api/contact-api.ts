import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export const CONTACTS_PAGE_SIZE = 20;

export interface Contact {
  id: number;
  lastName: string;
  firstName: string | null;
  email: string | null;
  thirdPartyId: number | null;
}

export interface ContactPage {
  items: Contact[];
  page: number;
  size: number;
  total: number;
}

export interface ContactQuery {
  page?: number;
  size?: number;
  thirdPartyId?: number | null;
}

export interface CreateContactRequest {
  lastName: string;
  firstName: string | null;
  email: string | null;
  thirdPartyId: number | null;
}

export interface CreateContactResponse {
  id: number;
}

@Injectable({ providedIn: 'root' })
export class ContactApi {
  private readonly baseUrl = '/api/contacts';

  constructor(private readonly http: HttpClient) {}

  listContacts(query: ContactQuery = {}): Observable<ContactPage> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? CONTACTS_PAGE_SIZE);
    if (query.thirdPartyId !== undefined && query.thirdPartyId !== null) {
      params = params.set('thirdPartyId', query.thirdPartyId);
    }
    return this.http.get<ContactPage>(this.baseUrl, { params });
  }

  getContact(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  createContact(request: CreateContactRequest): Observable<CreateContactResponse> {
    return this.http.post<CreateContactResponse>(this.baseUrl, request);
  }
}
