import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AdminAuditApi, AuditEvent, AuditVerification } from './admin-audit-api';

const EVENT: AuditEvent = {
  id: '8f796219-e501-44e8-a4ab-4c014821ba58',
  chainId: '00000000-0000-0000-0000-000000000001',
  sequence: 7,
  occurredAt: '2026-10-25T10:00:00Z',
  actorUserId: '3c15acbf-6e74-4af1-8cfe-1452a2935870',
  actorUsername: 'alice',
  authenticationType: 'SESSION',
  action: 'ADMIN_USER_CREATED',
  resourceType: 'USER',
  resourceId: 'user-1',
  result: 'SUCCESS',
  requestId: 'request-1',
  integrityFormatVersion: 1,
  previousHash: 'a'.repeat(64),
  eventHash: 'b'.repeat(64),
};

const VERIFICATION: AuditVerification = {
  chainId: EVENT.chainId,
  valid: true,
  checkedEvents: 123,
  failure: null,
  failedSequence: null,
};

describe('AdminAuditApi', () => {
  let api: AdminAuditApi;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AdminAuditApi);
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('lists events without optional query parameters', () => {
    api.listEvents({}).subscribe((result) => expect(result).toEqual([EVENT]));
    const req = http.expectOne('/api/admin/audit-events');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(false);
    req.flush([EVENT]);
  });

  it('sends the keyset cursor and limit', () => {
    api.listEvents({ afterSequence: 0, limit: 50 }).subscribe();
    http
      .expectOne('/api/admin/audit-events?afterSequence=0&limit=50')
      .flush([]);
  });

  it('sends every supported filter with its canonical value', () => {
    const query = {
      afterSequence: 50,
      limit: 200,
      action: 'LOGIN_FAILED' as const,
      resourceType: 'AUTHENTICATION' as const,
      resourceId: 'token-1',
      actorUserId: '3c15acbf-6e74-4af1-8cfe-1452a2935870',
      result: 'DENIED' as const,
    };
    api.listEvents(query).subscribe((result) => expect(result).toEqual([EVENT]));
    const req = http.expectOne(
      '/api/admin/audit-events?afterSequence=50&limit=200&action=LOGIN_FAILED&resourceType=AUTHENTICATION&resourceId=token-1&actorUserId=3c15acbf-6e74-4af1-8cfe-1452a2935870&result=DENIED',
    );
    expect(req.request.method).toBe('GET');
    req.flush([EVENT]);
  });

  it('maps the complete canonical event contract', () => {
    api.listEvents({}).subscribe((result) => expect(result[0]).toEqual(EVENT));
    http.expectOne('/api/admin/audit-events').flush([EVENT]);
  });

  it('verifies the integrity chain without automatic requests', () => {
    api.verifyIntegrity().subscribe((result) => expect(result).toEqual(VERIFICATION));
    const req = http.expectOne('/api/admin/audit-events/verification');
    expect(req.request.method).toBe('GET');
    expect(req.request.withCredentials).toBe(false);
    req.flush(VERIFICATION);
  });
});
