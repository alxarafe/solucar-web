import { HttpErrorResponse, provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { vi } from 'vitest';
import { AuditConfiguration, AuditMode, AuditReadPolicyRule } from '../../core/api/admin-audit-api';
import { AuthSessionService } from '../../core/auth/auth-session.service';
import { AdminAuditConfiguration } from './admin-audit-configuration';
import {
  AdminAuditConfigurationError,
  adminAuditConfigurationErrorMessage,
} from './admin-audit-configuration-error';

const CONFIG_URL = '/api/admin/audit-configuration';
const POLICY_URL = `${CONFIG_URL}/read-policy`;
const CONFIG: AuditConfiguration = {
  id: 'config-id',
  mode: 'BASIC',
  updatedAt: '2026-10-25T10:00:00Z',
};

describe('AdminAuditConfiguration', () => {
  let fixture: ComponentFixture<AdminAuditConfiguration>;
  let http: HttpTestingController;
  let component: AdminAuditConfiguration;
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AdminAuditConfiguration);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });
  afterEach(() => http.verify());
  const policy = (rules: AuditReadPolicyRule[] = []) => ({ configurationId: CONFIG.id, rules });
  function load(mode: AuditMode = 'BASIC', rules: AuditReadPolicyRule[] = []): void {
    http.expectOne(CONFIG_URL).flush({ ...CONFIG, mode });
    http.expectOne(POLICY_URL).flush(policy(rules));
    fixture.detectChanges();
  }
  function button(label: string): HTMLButtonElement {
    const buttons = [...fixture.nativeElement.querySelectorAll('button')] as HTMLButtonElement[];
    return buttons.find((b) => b.textContent?.trim() === label)!;
  }
  function select(id: string, label: string): void {
    const element = fixture.nativeElement.querySelector(id) as HTMLSelectElement;
    element.selectedIndex = [...element.options].findIndex((o) => o.text === label);
    element.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  it('loads both sections independently', () => {
    expect(fixture.nativeElement.textContent).toContain('Loading audit configuration...');
    expect(fixture.nativeElement.textContent).toContain('Loading read audit policy...');
    http.expectOne(CONFIG_URL).flush(CONFIG);
    fixture.detectChanges();
    expect(component.modeLoading()).toBe(false);
    expect(component.policyLoading()).toBe(true);
    expect(fixture.nativeElement.querySelector('#audit-mode')).toBeTruthy();
    http.expectOne(POLICY_URL).flush(policy());
    fixture.detectChanges();
    expect(component.policyLoading()).toBe(false);
    expect(button('Save mode').disabled).toBe(true);
    expect(button('Save read policy').disabled).toBe(true);
  });

  it('keeps policy usable while configuration is loading', () => {
    http.expectOne(POLICY_URL).flush(policy());
    fixture.detectChanges();
    expect(component.modeLoading()).toBe(true);
    expect(fixture.nativeElement.querySelector('#read-USER')).toBeTruthy();
    select('#read-USER', 'Query only');
    expect(button('Save read policy').disabled).toBe(false);
    http.expectOne(CONFIG_URL).flush(CONFIG);
  });

  it.each([
    { modeFailure: true, policyFailure: false },
    { modeFailure: false, policyFailure: true },
    { modeFailure: true, policyFailure: true },
  ])(
    'isolates load failures and retries $modeFailure/$policyFailure',
    ({ modeFailure, policyFailure }) => {
      const mode = http.expectOne(CONFIG_URL);
      const read = http.expectOne(POLICY_URL);
      if (modeFailure) mode.flush(null, { status: 503, statusText: 'Unavailable' });
      else mode.flush(CONFIG);
      if (policyFailure) read.flush(null, { status: 0, statusText: 'Network' });
      else read.flush(policy());
      fixture.detectChanges();
      expect(!!component.modeError()).toBe(modeFailure);
      expect(!!component.policyError()).toBe(policyFailure);
      expect(!!fixture.nativeElement.querySelector('#audit-mode')).toBe(!modeFailure);
      expect(!!fixture.nativeElement.querySelector('#read-USER')).toBe(!policyFailure);
      if (modeFailure) {
        component.loadMode();
        component.loadMode();
        http.expectOne(CONFIG_URL).flush(CONFIG);
      }
      if (policyFailure) {
        component.loadPolicy();
        component.loadPolicy();
        http.expectOne(POLICY_URL).flush(policy());
      }
      expect(component.modeError()).toBeNull();
      expect(component.policyError()).toBeNull();
    },
  );

  it.each<AuditMode>(['OFF', 'BASIC', 'SELECTIVE'])(
    'renders %s semantics and permits preparing policy',
    (mode) => {
      load(mode);
      const text = fixture.nativeElement.textContent;
      if (mode === 'OFF')
        expect(text).toContain('Mandatory audit-policy changes may still be recorded');
      if (mode === 'BASIC')
        expect(text).toContain('instrumented security and administration baseline');
      if (mode === 'SELECTIVE') expect(text).toContain('BASIC baseline and additionally');
      expect(text).toContain('Read policy applies only in selective mode');
      expect(text.includes('stored read policy is currently inactive')).toBe(mode !== 'SELECTIVE');
      select('#read-USER', 'Query and object');
      expect(button('Save read policy').disabled).toBe(false);
      http.expectNone((r) => r.method === 'PUT');
    },
  );

  it('saves only explicitly, prevents duplicate saves and adopts the mode response', () => {
    load();
    select('#audit-mode', 'Selective');
    expect(component.modeDirty()).toBe(true);
    expect(component.policyDirty()).toBe(false);
    http.expectNone((r) => r.method === 'PUT');
    button('Save mode').click();
    component.saveMode();
    component.loadMode();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('fieldset').disabled).toBe(true);
    expect(component.configuration()).toEqual(CONFIG);
    const req = http.expectOne(CONFIG_URL);
    expect(req.request.body).toEqual({ mode: 'SELECTIVE' });
    const response = { ...CONFIG, mode: 'OFF', updatedAt: '2026-10-25T12:00:00Z' };
    req.flush(response);
    fixture.detectChanges();
    expect(component.configuration()).toEqual(response);
    expect(component.modeForm.controls.mode.value).toBe('OFF');
    expect(component.modeDirty()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain(response.updatedAt);
    expect(fixture.nativeElement.textContent).toContain('Configuration saved');
  });

  it('warns before explicitly saving OFF and preserves policy through mode changes', () => {
    load('SELECTIVE', [{ resourceType: 'USER', readLevel: 'QUERY_ONLY' }]);
    for (const mode of ['BASIC', 'OFF'] as const) {
      component.modeForm.controls.mode.setValue(mode);
      fixture.detectChanges();
      if (mode === 'OFF')
        expect(fixture.nativeElement.querySelector('.warning').textContent).toContain(
          'OFF disables ordinary persistent auditing',
        );
      http.expectNone((r) => r.method === 'PUT');
      component.saveMode();
      http.expectOne(CONFIG_URL).flush({ ...CONFIG, mode });
      expect(component.policyForm.controls.USER.value).toBe('QUERY_ONLY');
      http.expectNone(POLICY_URL);
    }
  });

  it('clears dirty state when reverting selections', () => {
    load();
    select('#audit-mode', 'Off');
    select('#audit-mode', 'Basic');
    select('#read-USER', 'Query only');
    select('#read-USER', 'None');
    expect(component.modeDirty()).toBe(false);
    expect(component.policyDirty()).toBe(false);
    component.saveMode();
    component.savePolicy();
    http.expectNone((r) => r.method === 'PUT');
  });

  it.each([
    { rules: [], expected: { USER: 'NONE', ROLE: 'NONE' } },
    {
      rules: [{ resourceType: 'USER' as const, readLevel: 'QUERY_ONLY' as const }],
      expected: { USER: 'QUERY_ONLY', ROLE: 'NONE' },
    },
  ])('normalizes omitted rules as NONE %#', ({ rules, expected }) => {
    load('BASIC', rules);
    expect(component.policyForm.getRawValue()).toEqual(expected);
    expect(component.policyDirty()).toBe(false);
    const selectors = fixture.nativeElement.querySelectorAll('select');
    expect(selectors.length).toBe(3);
    expect(fixture.nativeElement.querySelectorAll('#read-USER option').length).toBe(3);
  });

  it('replaces both fixed resources without duplicates and adopts normalized response', () => {
    load();
    select('#read-USER', 'Query and object');
    select('#read-ROLE', 'Query only');
    http.expectNone((r) => r.method === 'PUT');
    button('Save read policy').click();
    component.savePolicy();
    component.loadPolicy();
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('fieldset')[1].disabled).toBe(true);
    const req = http.expectOne(POLICY_URL);
    expect(req.request.body).toEqual({
      rules: [
        { resourceType: 'USER', readLevel: 'QUERY_AND_OBJECT' },
        { resourceType: 'ROLE', readLevel: 'QUERY_ONLY' },
      ],
    });
    req.flush(policy([{ resourceType: 'ROLE', readLevel: 'QUERY_ONLY' }]));
    fixture.detectChanges();
    expect(component.policyForm.getRawValue()).toEqual({ USER: 'NONE', ROLE: 'QUERY_ONLY' });
    expect(component.policyDirty()).toBe(false);
    expect(component.configuration()?.updatedAt).toBe(CONFIG.updatedAt);
    expect(fixture.nativeElement.textContent).toContain('Read policy saved');
    select('#read-ROLE', 'None');
    component.savePolicy();
    const empty = http.expectOne(POLICY_URL);
    expect(empty.request.body).toEqual({
      rules: [
        { resourceType: 'USER', readLevel: 'NONE' },
        { resourceType: 'ROLE', readLevel: 'NONE' },
      ],
    });
    empty.flush(policy());
    expect(component.policyForm.getRawValue()).toEqual({ USER: 'NONE', ROLE: 'NONE' });
  });

  it.each([
    { status: 400, code: 'AUDIT_INVALID_MODE' },
    { status: 401, code: '' },
    { status: 403, code: '' },
    { status: 503, code: 'AUDIT_UNAVAILABLE' },
    { status: 0, code: '' },
    { status: 500, code: '' },
  ])('keeps the unsaved mode on status $status and never logs out', ({ status, code }) => {
    load();
    const logout = vi.spyOn(TestBed.inject(AuthSessionService), 'logout');
    select('#audit-mode', 'Selective');
    component.saveMode();
    http
      .expectOne(CONFIG_URL)
      .flush({ code, detail: 'Backend detail' }, { status, statusText: 'Failure' });
    fixture.detectChanges();
    expect(component.configuration()).toEqual(CONFIG);
    expect(component.modeDirty()).toBe(true);
    expect(component.modeSaving()).toBe(false);
    expect(component.policyError()).toBeNull();
    expect(component.modeSaved()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Backend detail');
    expect(logout).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent.includes('Sign in again')).toBe(status === 401);
  });

  it.each([400, 401, 403, 503, 0])('keeps unsaved policy on status %i', (status) => {
    load();
    select('#read-USER', 'Query only');
    component.savePolicy();
    http
      .expectOne(POLICY_URL)
      .flush({ code: 'AUDIT_INVALID_READ_POLICY' }, { status, statusText: 'Failure' });
    expect(component.policyDirty()).toBe(true);
    expect(component.policySaving()).toBe(false);
    expect(component.modeError()).toBeNull();
    expect(component.policySaved()).toBe(false);
  });

  it.each([true, false])(
    'isolates simultaneous saves and their outcomes (mode fails: %s)',
    (modeFails) => {
      load();
      select('#audit-mode', 'Selective');
      select('#read-USER', 'Query only');
      component.saveMode();
      component.savePolicy();
      expect(component.modeSaving()).toBe(true);
      expect(component.policySaving()).toBe(true);
      const mode = http.expectOne(CONFIG_URL);
      const read = http.expectOne(POLICY_URL);
      if (modeFails) {
        mode.flush(null, { status: 403, statusText: 'Forbidden' });
        read.flush(policy([{ resourceType: 'USER', readLevel: 'QUERY_ONLY' }]));
        expect(component.modeError()).toBeTruthy();
        expect(component.policySaved()).toBe(true);
        expect(component.modeDirty()).toBe(true);
        expect(component.policyDirty()).toBe(false);
      } else {
        read.flush(null, { status: 503, statusText: 'Unavailable' });
        mode.flush({ ...CONFIG, mode: 'SELECTIVE' });
        expect(component.policyError()).toBeTruthy();
        expect(component.modeSaved()).toBe(true);
        expect(component.policyDirty()).toBe(true);
        expect(component.modeDirty()).toBe(false);
      }
    },
  );
});

describe('audit configuration error messages', () => {
  it.each([
    [400, 'AUDIT_INVALID_MODE', 'Select a valid audit mode'],
    [400, 'AUDIT_INVALID_READ_POLICY', 'Check the read audit policy'],
    [400, 'VALIDATION_REQUIRED', 'Complete the required fields'],
    [400, '', 'Check the audit configuration values'],
    [401, '', 'Your session has expired'],
    [403, '', 'permission to configure auditing'],
    [503, 'AUDIT_UNAVAILABLE', 'temporarily unavailable'],
    [0, '', 'Unable to communicate'],
    [500, '', 'Unable to complete the audit configuration request'],
  ])('maps %i %s', (status, code, expected) => {
    expect(
      adminAuditConfigurationErrorMessage(new HttpErrorResponse({ status, error: { code } })),
    ).toContain(expected);
  });

  it('handles non-HTTP errors and malformed bodies', () => {
    expect(adminAuditConfigurationErrorMessage(new Error())).toContain('Unable to complete');
    expect(
      adminAuditConfigurationErrorMessage(new HttpErrorResponse({ status: 400, error: 'broken' })),
    ).toContain('Check the audit configuration');
  });

  it('preserves the configuration return URL when explicitly signing in again', async () => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    const { Router } = await import('@angular/router');
    const router = TestBed.inject(Router);
    vi.spyOn(router, 'url', 'get').mockReturnValue('/admin/audit/configuration');
    const navigate = vi.spyOn(router, 'navigate').mockResolvedValue(true);
    const bootstrap = vi.spyOn(TestBed.inject(AuthSessionService), 'bootstrap').mockResolvedValue();
    const fixture = TestBed.createComponent(AdminAuditConfigurationError);
    fixture.componentRef.setInput('error', new HttpErrorResponse({ status: 401 }));
    fixture.detectChanges();
    await fixture.componentInstance.signIn();
    expect(bootstrap).toHaveBeenCalledOnce();
    expect(navigate).toHaveBeenCalledWith(['/login'], {
      queryParams: { returnUrl: '/admin/audit/configuration' },
    });
  });
});
