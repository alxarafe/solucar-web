import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Contact {
  id: number;
  lastName: string;
  firstName: string | null;
  email: string | null;
  thirdPartyId: number | null;
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

export interface ProblemDetail {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  field?: string;
}

@Injectable({ providedIn: 'root' })
export class ContactApi {
  private readonly baseUrl = '/api/contacts';

  constructor(private readonly http: HttpClient) {}

  getContact(id: number): Observable<Contact> {
    return this.http.get<Contact>(`${this.baseUrl}/${id}`);
  }

  createContact(request: CreateContactRequest): Observable<CreateContactResponse> {
    return this.http.post<CreateContactResponse>(this.baseUrl, request);
  }
}