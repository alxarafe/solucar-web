import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

const AUDIT_CONFIGURATION_PATH = '/api/admin/audit-configuration';
const AUDIT_READ_POLICY_PATH = `${AUDIT_CONFIGURATION_PATH}/read-policy`;

const AUDIT_EVENTS_PATH = '/api/admin/audit-events';
const AUDIT_VERIFICATION_PATH = `${AUDIT_EVENTS_PATH}/verification`;

export const AUDIT_EVENTS_PAGE_SIZE = 50;

export const AUDIT_ACTIONS = [
  'USER_ENABLED',
  'USER_DISABLED',
  'ADMIN_USER_CREATED',
  'ADMIN_USER_USERNAME_CHANGED',
  'ADMIN_USER_PASSWORD_RESET',
  'ADMIN_USER_ROLES_REPLACED',
  'USER_USERNAME_CHANGED',
  'USER_PASSWORD_CHANGED',
  'PASSWORD_RESET_COMPLETED',
  'API_TOKEN_CREATED',
  'API_TOKEN_REVOKED',
  'ROLE_CREATED',
  'ROLE_RENAMED',
  'ROLE_PERMISSIONS_REPLACED',
  'ROLE_DELETED',
  'AUDIT_MODE_CHANGED_TO_BASIC',
  'AUDIT_MODE_CHANGED_TO_OFF',
  'AUDIT_MODE_CHANGED_TO_SELECTIVE',
  'AUDIT_READ_POLICY_RULE_CHANGED_TO_NONE',
  'AUDIT_READ_POLICY_RULE_CHANGED_TO_QUERY_ONLY',
  'AUDIT_READ_POLICY_RULE_CHANGED_TO_QUERY_AND_OBJECT',
  'READ_QUERY',
  'READ_OBJECT',
  'LOGIN_SUCCEEDED',
  'LOGIN_FAILED',
  'LOGOUT',
  'ACCESS_DENIED',
] as const;

export const AUDIT_RESOURCE_TYPES = [
  'USER',
  'API_TOKEN',
  'ROLE',
  'AUDIT_CONFIGURATION',
  'AUDIT_READ_POLICY',
  'AUTHENTICATION',
  'HTTP_REQUEST',
] as const;

export const AUDIT_RESULTS = ['SUCCESS', 'FAILURE', 'DENIED'] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];
export type AuditResourceType = (typeof AUDIT_RESOURCE_TYPES)[number];
export type AuditResult = (typeof AUDIT_RESULTS)[number];

export interface AuditEvent {
  id: string;
  chainId: string;
  sequence: number;
  occurredAt: string;
  actorUserId: string | null;
  actorUsername: string | null;
  authenticationType: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  requestId: string | null;
  integrityFormatVersion: number;
  previousHash: string;
  eventHash: string;
}

export interface AuditEventQuery {
  afterSequence?: number;
  limit?: number;
  action?: AuditAction;
  resourceType?: AuditResourceType;
  resourceId?: string;
  actorUserId?: string;
  result?: AuditResult;
}

export interface AuditVerification {
  chainId: string;
  valid: boolean;
  checkedEvents: number;
  failure: string | null;
  failedSequence: number | null;
}

export const AUDIT_MODES = ['OFF', 'BASIC', 'SELECTIVE'] as const;
export const AUDIT_READ_LEVELS = ['NONE', 'QUERY_ONLY', 'QUERY_AND_OBJECT'] as const;
// This contractual subset is intentionally independent of the event viewer catalogue.
export const AUDIT_CONFIGURABLE_RESOURCE_TYPES = ['USER', 'ROLE'] as const;
export type AuditMode = (typeof AUDIT_MODES)[number];
export type AuditReadLevel = (typeof AUDIT_READ_LEVELS)[number];
export type AuditConfigurableResourceType = (typeof AUDIT_CONFIGURABLE_RESOURCE_TYPES)[number];

export interface AuditConfiguration {
  id: string;
  mode: AuditMode;
  updatedAt: string;
}

export interface AuditReadPolicyRule {
  resourceType: AuditConfigurableResourceType;
  readLevel: AuditReadLevel;
}

export interface AuditReadPolicy {
  configurationId: string;
  rules: AuditReadPolicyRule[];
}

@Injectable({ providedIn: 'root' })
export class AdminAuditApi {
  private readonly http = inject(HttpClient);

  getConfiguration(): Observable<AuditConfiguration> {
    return this.http.get<AuditConfiguration>(AUDIT_CONFIGURATION_PATH);
  }

  updateConfiguration(mode: AuditMode): Observable<AuditConfiguration> {
    return this.http.put<AuditConfiguration>(AUDIT_CONFIGURATION_PATH, { mode });
  }

  getReadPolicy(): Observable<AuditReadPolicy> {
    return this.http.get<AuditReadPolicy>(AUDIT_READ_POLICY_PATH);
  }

  replaceReadPolicy(rules: AuditReadPolicyRule[]): Observable<AuditReadPolicy> {
    return this.http.put<AuditReadPolicy>(AUDIT_READ_POLICY_PATH, { rules });
  }

  listEvents(query: AuditEventQuery): Observable<AuditEvent[]> {
    let params = new HttpParams();
    if (query.afterSequence !== undefined) {
      params = params.set('afterSequence', query.afterSequence);
    }
    if (query.limit !== undefined) params = params.set('limit', query.limit);
    if (query.action) params = params.set('action', query.action);
    if (query.resourceType) params = params.set('resourceType', query.resourceType);
    if (query.resourceId) params = params.set('resourceId', query.resourceId);
    if (query.actorUserId) params = params.set('actorUserId', query.actorUserId);
    if (query.result) params = params.set('result', query.result);
    return this.http.get<AuditEvent[]>(AUDIT_EVENTS_PATH, { params });
  }

  verifyIntegrity(): Observable<AuditVerification> {
    return this.http.get<AuditVerification>(AUDIT_VERIFICATION_PATH);
  }
}
