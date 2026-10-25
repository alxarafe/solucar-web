export function auditResultLabel(result: string): string {
  switch (result) {
    case 'SUCCESS':
      return $localize`:@@adminAudit.result.success:Success`;
    case 'FAILURE':
      return $localize`:@@adminAudit.result.failure:Failure`;
    case 'DENIED':
      return $localize`:@@adminAudit.result.denied:Denied`;
    default:
      return result;
  }
}

export function auditVerificationFailureLabel(failure: string | null): string {
  switch (failure) {
    case 'CHAIN_HEAD_MISSING':
      return $localize`:@@adminAudit.failure.chainHeadMissing:The audit chain head is missing.`;
    case 'EVENT_MISSING':
      return $localize`:@@adminAudit.failure.eventMissing:An audit event is missing.`;
    case 'SEQUENCE_MISMATCH':
      return $localize`:@@adminAudit.failure.sequenceMismatch:An event sequence does not match.`;
    case 'CHAIN_ID_MISMATCH':
      return $localize`:@@adminAudit.failure.chainIdMismatch:An event chain identifier does not match.`;
    case 'UNSUPPORTED_FORMAT_VERSION':
      return $localize`:@@adminAudit.failure.unsupportedFormatVersion:An event uses an unsupported integrity format version.`;
    case 'PREVIOUS_HASH_MISMATCH':
      return $localize`:@@adminAudit.failure.previousHashMismatch:An event previous hash does not match.`;
    case 'EVENT_HASH_MISMATCH':
      return $localize`:@@adminAudit.failure.eventHashMismatch:An event hash does not match.`;
    case 'UNEXPECTED_EVENT':
      return $localize`:@@adminAudit.failure.unexpectedEvent:An unexpected event exists after the chain head.`;
    case 'HEAD_HASH_MISMATCH':
      return $localize`:@@adminAudit.failure.headHashMismatch:The chain head hash does not match.`;
    case null:
      return $localize`:@@adminAudit.failure.unknown:Unknown verification failure.`;
    default:
      return failure;
  }
}
