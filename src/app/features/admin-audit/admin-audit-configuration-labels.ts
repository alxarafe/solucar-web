import {
  AuditMode,
  AuditReadLevel,
  AuditConfigurableResourceType,
} from '../../core/api/admin-audit-api';

export function modeLabel(mode: AuditMode): string {
  switch (mode) {
    case 'OFF':
      return $localize`:@@adminAuditConfiguration.mode.off:Off`;
    case 'BASIC':
      return $localize`:@@adminAuditConfiguration.mode.basic:Basic`;
    case 'SELECTIVE':
      return $localize`:@@adminAuditConfiguration.mode.selective:Selective`;
  }
}

export function modeDescription(mode: AuditMode): string {
  switch (mode) {
    case 'OFF':
      return $localize`:@@adminAuditConfiguration.mode.offDescription:OFF disables ordinary persistent auditing. Mandatory audit-policy changes may still be recorded.`;
    case 'BASIC':
      return $localize`:@@adminAuditConfiguration.mode.basicDescription:Records the instrumented security and administration baseline. Read-policy rules are stored but not active.`;
    case 'SELECTIVE':
      return $localize`:@@adminAuditConfiguration.mode.selectiveDescription:Records the BASIC baseline and additionally applies the configured read-audit policy.`;
  }
}

export function readLevelLabel(level: AuditReadLevel): string {
  switch (level) {
    case 'NONE':
      return $localize`:@@adminAuditConfiguration.level.none:None`;
    case 'QUERY_ONLY':
      return $localize`:@@adminAuditConfiguration.level.queryOnly:Query only`;
    case 'QUERY_AND_OBJECT':
      return $localize`:@@adminAuditConfiguration.level.queryAndObject:Query and object`;
  }
}

export function readLevelDescription(level: AuditReadLevel): string {
  switch (level) {
    case 'NONE':
      return $localize`:@@adminAuditConfiguration.level.noneDescription:No reads of this resource type are audited by this policy.`;
    case 'QUERY_ONLY':
      return $localize`:@@adminAuditConfiguration.level.queryOnlyDescription:In SELECTIVE mode, audits query and list reads, but not single-object reads.`;
    case 'QUERY_AND_OBJECT':
      return $localize`:@@adminAuditConfiguration.level.queryAndObjectDescription:In SELECTIVE mode, audits query, list and single-object reads.`;
  }
}

export function resourceLabel(resource: AuditConfigurableResourceType): string {
  switch (resource) {
    case 'USER':
      return $localize`:@@adminAuditConfiguration.resource.user:User reads`;
    case 'ROLE':
      return $localize`:@@adminAuditConfiguration.resource.role:Role reads`;
  }
}
