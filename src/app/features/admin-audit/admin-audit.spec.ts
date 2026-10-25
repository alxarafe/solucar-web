import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuditEvent, AuditVerification } from '../../core/api/admin-audit-api';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AdminAuditError, adminAuditErrorMessage } from './admin-audit-error';
import { AdminAuditEvents } from './admin-audit-events';
import { auditVerificationFailureLabel } from './admin-audit-labels';

const INITIAL_URL = '/api/admin/audit-events?afterSequence=0&limit=50';
const CHAIN_ID = '00000000-0000-0000-0000-000000000001';
const ACTOR_ID = '3c15acbf-6e74-4af1-8cfe-1452a2935870';

function makeEvent(sequence: number, overrides: Partial<AuditEvent> = {}): AuditEvent {
  return {
    id: `event-${sequence}`,
    chainId: CHAIN_ID,
    sequence,
    occurredAt: '2026-10-25T10:00:00Z',
    actorUserId: ACTOR_ID,
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
    ...overrides,
  };
}

function eventsBetween(from: number, to: number): AuditEvent[] {
  return Array.from({ length: to - from + 1 }, (_, index) => makeEvent(from + index));
}

function setup(): void {
  TestBed.configureTestingModule({
    providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
  });
}

function buttonByText(fixture: ComponentFixture<unknown>, text: string): HTMLButtonElement {
  const buttons = [
    ...fixture.nativeElement.querySelectorAll('button'),
  ] as HTMLButtonElement[];
  const button = buttons.find((candidate) => candidate.textContent?.trim() === text);
  if (!button) throw new Error(`Button not found: ${text}`);
  return button;
}

function submitFilters(fixture: ComponentFixture<unknown>): void {
  fixture.nativeElement
    .querySelector('form')
    .dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
}

describe('AdminAuditEvents', () => {
  let fixture: ComponentFixture<AdminAuditEvents>;
  let http: HttpTestingController;

  beforeEach(() => {
    setup();
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminAuditEvents);
    fixture.detectChanges();
  });
  afterEach(() => http.verify());

  function flushInitial(events = [makeEvent(1)]): void {
    http.expectOne(INITIAL_URL).flush(events);
    fixture.detectChanges();
  }

  it('shows loading while the initial request is pending', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading audit events...');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    flushInitial();
  });

  it('renders the main event fields in ascending backend order', () => {
    flushInitial([makeEvent(1), makeEvent(2)]);
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('1');
    expect(text).toContain('2');
    expect(text).toContain('2026-10-25T10:00:00Z');
    expect(text).toContain('alice');
    expect(text).toContain(ACTOR_ID);
    expect(text).toContain('ADMIN_USER_CREATED');
    expect(text).toContain('USER');
    expect(text).toContain('user-1');
    expect(text).toContain('Success');
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(2);
    const sequences = [...fixture.nativeElement.querySelectorAll('tbody tr td:first-child')].map(
      (cell: HTMLElement) => cell.textContent?.trim(),
    );
    expect(sequences).toEqual(['1', '2']);
  });

  it('shows the empty state', () => {
    flushInitial([]);
    expect(fixture.nativeElement.textContent).toContain('No audit events found');
    expect(fixture.nativeElement.querySelector('table')).toBeNull();
  });

  it('shows the initial error and retries with the active filters', () => {
    http
      .expectOne(INITIAL_URL)
      .flush(
        { code: 'AUDIT_INVALID_QUERY', detail: 'Invalid audit action' },
        { status: 400, statusText: 'Bad Request' },
      );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Check the audit filters');
    expect(text).toContain('Invalid audit action');
    buttonByText(fixture, 'Retry').click();
    http.expectOne(INITIAL_URL).flush([makeEvent(1)]);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('ADMIN_USER_CREATED');
  });

  it('supports events without a usable actor and optional fields', () => {
    flushInitial([
      makeEvent(1, {
        actorUserId: null,
        actorUsername: null,
        authenticationType: null,
        resourceId: null,
        requestId: null,
      }),
    ]);
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('—');
  });

  it('shows the complete event detail including full hashes', () => {
    const event = makeEvent(1);
    flushInitial([event]);
    const details: HTMLDetailsElement = fixture.nativeElement.querySelector('details');
    details.open = true;
    fixture.detectChanges();
    const detail = details.querySelector('dl')!.textContent;
    expect(detail).toContain(event.id);
    expect(detail).toContain(event.chainId);
    expect(detail).toContain(event.authenticationType!);
    expect(detail).toContain(event.requestId!);
    expect(detail).toContain(String(event.integrityFormatVersion));
    expect(detail).toContain(event.previousHash);
    expect(detail).toContain(event.eventHash);
    expect(detail).toContain('a'.repeat(64));
    expect(detail).toContain('b'.repeat(64));
  });

  it('applies every supported filter, trims resource IDs and resets the cursor', () => {
    flushInitial([makeEvent(1)]);
    fixture.componentInstance.form.setValue({
      action: 'LOGIN_FAILED',
      resourceType: 'AUTHENTICATION',
      result: 'DENIED',
      resourceId: ' token-1 ',
      actorUserId: ACTOR_ID,
    });
    submitFilters(fixture);
    const req = http.expectOne(
      `/api/admin/audit-events?afterSequence=0&limit=50&action=LOGIN_FAILED&resourceType=AUTHENTICATION&resourceId=token-1&actorUserId=${ACTOR_ID}&result=DENIED`,
    );
    req.flush([makeEvent(2, { action: 'LOGIN_FAILED' })]);
    fixture.detectChanges();
    const tableText = fixture.nativeElement.querySelector('tbody').textContent;
    expect(tableText).not.toContain('ADMIN_USER_CREATED');
    expect(tableText).toContain('LOGIN_FAILED');
    expect(fixture.componentInstance.form.controls.action.value).toBe('LOGIN_FAILED');
    expect(fixture.componentInstance.form.controls.resourceId.value).toBe(' token-1 ');
  });

  it('clears filters and reloads from the beginning', () => {
    flushInitial([makeEvent(1)]);
    fixture.componentInstance.form.patchValue({
      action: 'LOGIN_FAILED',
      resourceType: 'AUTHENTICATION',
      result: 'DENIED',
      resourceId: 'token-1',
      actorUserId: ACTOR_ID,
    });
    submitFilters(fixture);
    http
      .expectOne(
        `/api/admin/audit-events?afterSequence=0&limit=50&action=LOGIN_FAILED&resourceType=AUTHENTICATION&resourceId=token-1&actorUserId=${ACTOR_ID}&result=DENIED`,
      )
      .flush([makeEvent(2)]);
    fixture.detectChanges();

    buttonByText(fixture, 'Clear filters').click();
    http.expectOne(INITIAL_URL).flush([makeEvent(1)]);
    fixture.detectChanges();
    expect(fixture.componentInstance.form.getRawValue()).toEqual({
      action: '',
      resourceType: '',
      result: '',
      resourceId: '',
      actorUserId: '',
    });
    expect(fixture.nativeElement.textContent).toContain('ADMIN_USER_CREATED');
  });

  it('refreshes from the beginning while preserving applied filters', () => {
    flushInitial([makeEvent(1)]);
    fixture.componentInstance.form.patchValue({
      action: 'LOGIN_FAILED',
      resourceType: 'AUTHENTICATION',
      result: 'DENIED',
      resourceId: 'token-1',
      actorUserId: ACTOR_ID,
    });
    submitFilters(fixture);
    const filteredUrl = `/api/admin/audit-events?afterSequence=0&limit=50&action=LOGIN_FAILED&resourceType=AUTHENTICATION&resourceId=token-1&actorUserId=${ACTOR_ID}&result=DENIED`;
    http.expectOne(filteredUrl).flush([makeEvent(2)]);
    fixture.detectChanges();

    buttonByText(fixture, 'Refresh').click();
    http.expectOne(filteredUrl).flush([makeEvent(3, { action: 'LOGIN_FAILED' })]);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('tbody').textContent).toContain('LOGIN_FAILED');
    expect(fixture.componentInstance.form.controls.resourceId.value).toBe('token-1');
  });

  it('rejects an invalid actor UUID without sending a request', () => {
    flushInitial();
    fixture.componentInstance.form.patchValue({ actorUserId: 'not-a-uuid' });
    submitFilters(fixture);
    fixture.detectChanges();
    http.expectNone(() => true);
    expect(fixture.nativeElement.textContent).toContain('Enter a valid UUID.');
  });

  it('does not query on every keystroke', () => {
    flushInitial();
    fixture.componentInstance.form.patchValue({ resourceId: 'abc', actorUserId: ACTOR_ID });
    fixture.detectChanges();
    http.expectNone(() => true);
  });

  it('loads more with afterSequence set to the last loaded sequence', () => {
    flushInitial(eventsBetween(1, 50));
    expect(fixture.nativeElement.textContent).not.toContain('End of audit events');
    buttonByText(fixture, 'Load more').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 100));
    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(100);
    const sequences = [...rows].map((row: HTMLElement) =>
      row.querySelector('td:first-child')?.textContent?.trim(),
    );
    expect(sequences[0]).toBe('1');
    expect(sequences.at(-1)).toBe('100');
    expect(new Set(sequences).size).toBe(100);
    expect(fixture.nativeElement.textContent).toContain('Events loaded');
    expect(fixture.nativeElement.textContent).toContain('100');
  });

  it('treats a batch smaller than the limit as the current end', () => {
    flushInitial(eventsBetween(1, 50));
    buttonByText(fixture, 'Load more').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 55));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(55);
    expect(fixture.nativeElement.textContent).toContain('End of audit events');
    expect(() => buttonByText(fixture, 'Load more')).toThrow();
  });

  it('ignores duplicate events returned by the backend', () => {
    flushInitial(eventsBetween(1, 50));
    buttonByText(fixture, 'Load more').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush([makeEvent(50), makeEvent(51)]);
    fixture.detectChanges();
    const rows = fixture.nativeElement.querySelectorAll('tbody tr');
    expect(rows.length).toBe(51);
    const sequences = [...rows].map((row: HTMLElement) =>
      row.querySelector('td:first-child')?.textContent?.trim(),
    );
    expect(new Set(sequences).size).toBe(51);
  });

  it('keeps loaded events when load more fails and allows retrying', () => {
    flushInitial(eventsBetween(1, 50));
    buttonByText(fixture, 'Load more').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(
        { code: 'AUDIT_UNAVAILABLE', detail: 'Audit storage unavailable' },
        { status: 503, statusText: 'Service Unavailable' },
      );
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(50);
    expect(fixture.nativeElement.textContent).toContain('Audit is temporarily unavailable');
    expect(fixture.nativeElement.textContent).toContain('Audit storage unavailable');

    buttonByText(fixture, 'Retry').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 52));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('tbody tr').length).toBe(52);
  });

  it('prevents duplicate load-more requests', () => {
    flushInitial(eventsBetween(1, 50));
    fixture.componentInstance.loadMore();
    fixture.componentInstance.loadMore();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 52));
  });

  it('does not apply filters while a load-more request is pending', () => {
    flushInitial(eventsBetween(1, 50));
    fixture.componentInstance.loadMore();
    fixture.componentInstance.applyFilters();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 52));
  });

  it('does not verify automatically', () => {
    flushInitial();
    http.expectNone('/api/admin/audit-events/verification');
    expect(fixture.nativeElement.textContent).toContain('Verify integrity');
    expect(fixture.nativeElement.textContent).not.toContain('Integrity valid');
  });

  it('verifies the chain only on explicit request and shows a valid result', () => {
    flushInitial();
    const verification: AuditVerification = {
      chainId: CHAIN_ID,
      valid: true,
      checkedEvents: 123,
      failure: null,
      failedSequence: null,
    };
    buttonByText(fixture, 'Verify integrity').click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Verifying...');
    expect(buttonByText(fixture, 'Verifying...').disabled).toBe(true);
    http.expectOne('/api/admin/audit-events/verification').flush(verification);
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Integrity valid');
    expect(text).toContain('123');
    expect(text).toContain(CHAIN_ID);
    expect(buttonByText(fixture, 'Verify integrity').disabled).toBe(false);
  });

  it('reports an invalid verification without attributing a cause', () => {
    flushInitial();
    buttonByText(fixture, 'Verify integrity').click();
    http.expectOne('/api/admin/audit-events/verification').flush({
      chainId: CHAIN_ID,
      valid: false,
      checkedEvents: 41,
      failure: 'EVENT_HASH_MISMATCH',
      failedSequence: 42,
    });
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Integrity verification failed');
    expect(text).toContain('An event hash does not match.');
    expect(text).toContain('42');
    expect(text).toContain('41');
    expect(text.toLowerCase()).not.toContain('tampering');
    expect(text.toLowerCase()).not.toContain('manipulation');
    expect(text.toLowerCase()).not.toContain('attack');
  });

  it('shows an unknown verification failure canonically', () => {
    flushInitial();
    buttonByText(fixture, 'Verify integrity').click();
    http.expectOne('/api/admin/audit-events/verification').flush({
      chainId: CHAIN_ID,
      valid: false,
      checkedEvents: 0,
      failure: 'FUTURE_FAILURE',
      failedSequence: null,
    });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('FUTURE_FAILURE');
    expect(auditVerificationFailureLabel('FUTURE_FAILURE')).toBe('FUTURE_FAILURE');
  });

  it('shows a verification error and allows retrying', () => {
    flushInitial();
    buttonByText(fixture, 'Verify integrity').click();
    http
      .expectOne('/api/admin/audit-events/verification')
      .flush(null, { status: 0, statusText: 'Unknown Error' });
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Unable to communicate with Alixar');
    expect(buttonByText(fixture, 'Verify integrity').disabled).toBe(false);
    expect(fixture.componentInstance.verification()).toBeNull();
  });

  it('prevents duplicate verification requests', () => {
    flushInitial();
    fixture.componentInstance.verify();
    fixture.componentInstance.verify();
    http
      .expectOne('/api/admin/audit-events/verification')
      .flush({
        chainId: CHAIN_ID,
        valid: true,
        checkedEvents: 1,
        failure: null,
        failedSequence: null,
      });
  });

  it('does not block the list after verification', () => {
    flushInitial(eventsBetween(1, 50));
    fixture.componentInstance.verify();
    http
      .expectOne('/api/admin/audit-events/verification')
      .flush({
        chainId: CHAIN_ID,
        valid: false,
        checkedEvents: 1,
        failure: 'EVENT_HASH_MISMATCH',
        failedSequence: 2,
      });
    fixture.detectChanges();
    buttonByText(fixture, 'Load more').click();
    http
      .expectOne('/api/admin/audit-events?afterSequence=50&limit=50')
      .flush(eventsBetween(51, 52));
  });
});

describe('adminAuditErrorMessage', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  it.each([
    [400, 'Check the audit filters'],
    [401, 'Your session has expired'],
    [403, 'permission to read audit events'],
    [503, 'temporarily unavailable'],
    [0, 'Unable to communicate'],
    [500, 'Unable to complete the audit request'],
  ])('maps status %i', (status, expected) => {
    expect(adminAuditErrorMessage(new HttpErrorResponse({ status }))).toContain(expected);
  });

  it('shows ProblemDetail detail as secondary information', () => {
    const fixture = TestBed.createComponent(AdminAuditError);
    fixture.componentRef.setInput(
      'error',
      new HttpErrorResponse({
        status: 400,
        error: { code: 'AUDIT_INVALID_QUERY', detail: 'Invalid audit action' },
      }),
    );
    fixture.detectChanges();
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Check the audit filters');
    expect(text).toContain('Invalid audit action');
  });

  it('offers sign-in on 401 without logging out', () => {
    const auth = TestBed.inject(AuthSessionService);
    const logout = vi.spyOn(auth, 'logout');
    const fixture = TestBed.createComponent(AdminAuditError);
    fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Sign in again');
    expect(logout).not.toHaveBeenCalled();
  });

  it('reports 403 without logging out or offering sign-in', () => {
    const auth = TestBed.inject(AuthSessionService);
    const logout = vi.spyOn(auth, 'logout');
    const fixture = TestBed.createComponent(AdminAuditError);
    fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 403 }));
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('permission to read audit events');
    expect(fixture.nativeElement.textContent).not.toContain('Sign in again');
    expect(logout).not.toHaveBeenCalled();
  });
});
