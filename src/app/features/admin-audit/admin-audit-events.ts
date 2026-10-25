import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AUDIT_ACTIONS,
  AUDIT_EVENTS_PAGE_SIZE,
  AUDIT_RESOURCE_TYPES,
  AUDIT_RESULTS,
  AuditAction,
  AuditEvent,
  AuditEventQuery,
  AuditResourceType,
  AuditResult,
  AuditVerification,
  AdminAuditApi,
} from '../../core/api/admin-audit-api';
import { AdminAuditError } from './admin-audit-error';
import { auditResultLabel, auditVerificationFailureLabel } from './admin-audit-labels';
import { uuidValidator } from './admin-audit-validation';

@Component({
  selector: 'app-admin-audit-events',
  imports: [ReactiveFormsModule, AdminAuditError],
  templateUrl: './admin-audit-events.html',
  styleUrl: './admin-audit.scss',
})
export class AdminAuditEvents implements OnInit {
  private readonly api = inject(AdminAuditApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly actions = AUDIT_ACTIONS;
  readonly resourceTypes = AUDIT_RESOURCE_TYPES;
  readonly results = AUDIT_RESULTS;
  readonly form = inject(FormBuilder).nonNullable.group({
    action: '',
    resourceType: '',
    result: '',
    resourceId: '',
    actorUserId: ['', uuidValidator],
  });
  readonly events = signal<AuditEvent[] | null>(null);
  readonly loading = signal(false);
  readonly loadingMore = signal(false);
  readonly error = signal<unknown>(null);
  readonly loadMoreError = signal<unknown>(null);
  readonly endReached = signal(false);
  readonly verifying = signal(false);
  readonly verification = signal<AuditVerification | null>(null);
  readonly verificationError = signal<unknown>(null);
  readonly listBusy = computed(() => this.loading() || this.loadingMore());
  readonly resultLabel = auditResultLabel;
  readonly failureLabel = auditVerificationFailureLabel;
  private activeFilters: AuditEventQuery = {};

  ngOnInit(): void {
    this.loadFirstBatch();
  }

  applyFilters(): void {
    if (this.listBusy()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.activeFilters = this.readFilters();
    this.loadFirstBatch();
  }

  clearFilters(): void {
    if (this.listBusy()) return;
    this.form.reset({
      action: '',
      resourceType: '',
      result: '',
      resourceId: '',
      actorUserId: '',
    });
    this.activeFilters = {};
    this.loadFirstBatch();
  }

  refresh(): void {
    if (this.listBusy()) return;
    this.loadFirstBatch();
  }

  loadMore(): void {
    const events = this.events();
    const last = events?.at(-1);
    if (!events || !last || this.listBusy() || this.endReached()) return;

    this.loadingMore.set(true);
    this.loadMoreError.set(null);
    this.api
      .listEvents({
        ...this.activeFilters,
        afterSequence: last.sequence,
        limit: AUDIT_EVENTS_PAGE_SIZE,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loadingMore.set(false)),
      )
      .subscribe({
        next: (batch) => {
          const current = this.events() ?? [];
          const known = new Set(current.map((event) => event.id));
          const appended = batch.filter(
            (event) => event.sequence > last.sequence && !known.has(event.id),
          );
          this.events.set([...current, ...appended]);
          if (batch.length < AUDIT_EVENTS_PAGE_SIZE) this.endReached.set(true);
        },
        error: (error: unknown) => this.loadMoreError.set(error),
      });
  }

  verify(): void {
    if (this.verifying()) return;
    this.verifying.set(true);
    this.verificationError.set(null);
    this.verification.set(null);
    this.api
      .verifyIntegrity()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.verifying.set(false)),
      )
      .subscribe({
        next: (verification) => this.verification.set(verification),
        error: (error: unknown) => this.verificationError.set(error),
      });
  }

  private readFilters(): AuditEventQuery {
    const raw = this.form.getRawValue();
    return {
      action: raw.action ? (raw.action as AuditAction) : undefined,
      resourceType: raw.resourceType ? (raw.resourceType as AuditResourceType) : undefined,
      resourceId: raw.resourceId.trim() || undefined,
      actorUserId: raw.actorUserId.trim() || undefined,
      result: raw.result ? (raw.result as AuditResult) : undefined,
    };
  }

  private loadFirstBatch(): void {
    this.loading.set(true);
    this.error.set(null);
    this.loadMoreError.set(null);
    this.endReached.set(false);
    this.events.set(null);
    this.api
      .listEvents({
        ...this.activeFilters,
        afterSequence: 0,
        limit: AUDIT_EVENTS_PAGE_SIZE,
      })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (events) => {
          this.events.set(events);
          if (events.length < AUDIT_EVENTS_PAGE_SIZE) this.endReached.set(true);
        },
        error: (error: unknown) => this.error.set(error),
      });
  }
}
