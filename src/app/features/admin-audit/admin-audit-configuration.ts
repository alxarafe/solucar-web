import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { finalize } from 'rxjs';
import {
  AdminAuditApi,
  AuditConfiguration,
  AuditMode,
  AuditReadLevel,
  AuditReadPolicy,
  AUDIT_MODES,
  AUDIT_READ_LEVELS,
  AUDIT_CONFIGURABLE_RESOURCE_TYPES,
} from '../../core/api/admin-audit-api';
import { AdminAuditConfigurationError } from './admin-audit-configuration-error';
import {
  modeLabel,
  modeDescription,
  readLevelLabel,
  readLevelDescription,
  resourceLabel,
} from './admin-audit-configuration-labels';

@Component({
  selector: 'app-admin-audit-configuration',
  imports: [ReactiveFormsModule, AdminAuditConfigurationError],
  templateUrl: './admin-audit-configuration.html',
  styleUrl: './admin-audit-configuration.scss',
})
export class AdminAuditConfiguration implements OnInit {
  private readonly api = inject(AdminAuditApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly modes = AUDIT_MODES;
  readonly levels = AUDIT_READ_LEVELS;
  readonly resources = AUDIT_CONFIGURABLE_RESOURCE_TYPES;
  readonly modeLabel = modeLabel;
  readonly modeDescription = modeDescription;
  readonly readLevelLabel = readLevelLabel;
  readonly readLevelDescription = readLevelDescription;
  readonly resourceLabel = resourceLabel;
  readonly configuration = signal<AuditConfiguration | null>(null);
  readonly policy = signal<AuditReadPolicy | null>(null);
  readonly modeLoading = signal(false);
  readonly policyLoading = signal(false);
  readonly modeSaving = signal(false);
  readonly policySaving = signal(false);
  readonly modeError = signal<unknown>(null);
  readonly policyError = signal<unknown>(null);
  readonly modeSaved = signal(false);
  readonly policySaved = signal(false);
  readonly modeForm = new FormGroup({
    mode: new FormControl<AuditMode>('BASIC', { nonNullable: true }),
  });
  readonly policyForm = new FormGroup({
    USER: new FormControl<AuditReadLevel>('NONE', { nonNullable: true }),
    ROLE: new FormControl<AuditReadLevel>('NONE', { nonNullable: true }),
  });

  ngOnInit(): void {
    this.loadMode();
    this.loadPolicy();
  }

  modeDirty(): boolean {
    return (
      !!this.configuration() && this.modeForm.controls.mode.value !== this.configuration()!.mode
    );
  }

  policyDirty(): boolean {
    const policy = this.policy();
    return (
      !!policy &&
      this.resources.some(
        (resource) =>
          this.policyForm.controls[resource].value !==
          (policy.rules.find((rule) => rule.resourceType === resource)?.readLevel ?? 'NONE'),
      )
    );
  }

  loadMode(): void {
    if (this.modeLoading() || this.modeSaving() || this.configuration()) return;
    this.modeLoading.set(true);
    this.modeError.set(null);
    this.api
      .getConfiguration()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.modeLoading.set(false)),
      )
      .subscribe({
        next: (configuration) => this.applyConfiguration(configuration),
        error: (error: unknown) => this.modeError.set(error),
      });
  }

  loadPolicy(): void {
    if (this.policyLoading() || this.policySaving() || this.policy()) return;
    this.policyLoading.set(true);
    this.policyError.set(null);
    this.api
      .getReadPolicy()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.policyLoading.set(false)),
      )
      .subscribe({
        next: (policy) => this.applyPolicy(policy),
        error: (error: unknown) => this.policyError.set(error),
      });
  }

  saveMode(): void {
    if (this.modeLoading() || this.modeSaving() || !this.modeDirty()) return;
    this.modeSaving.set(true);
    this.modeError.set(null);
    this.modeSaved.set(false);
    this.api
      .updateConfiguration(this.modeForm.controls.mode.value)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.modeSaving.set(false)),
      )
      .subscribe({
        next: (configuration) => {
          this.applyConfiguration(configuration);
          this.modeSaved.set(true);
        },
        error: (error: unknown) => this.modeError.set(error),
      });
  }

  savePolicy(): void {
    if (this.policyLoading() || this.policySaving() || !this.policyDirty()) return;
    this.policySaving.set(true);
    this.policyError.set(null);
    this.policySaved.set(false);
    const rules = this.resources.map((resourceType) => ({
      resourceType,
      readLevel: this.policyForm.controls[resourceType].value,
    }));
    this.api
      .replaceReadPolicy(rules)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.policySaving.set(false)),
      )
      .subscribe({
        next: (policy) => {
          this.applyPolicy(policy);
          this.policySaved.set(true);
        },
        error: (error: unknown) => this.policyError.set(error),
      });
  }

  private applyConfiguration(configuration: AuditConfiguration): void {
    this.configuration.set(configuration);
    this.modeForm.reset({ mode: configuration.mode });
  }

  private applyPolicy(policy: AuditReadPolicy): void {
    this.policy.set(policy);
    this.policyForm.reset({
      USER: policy.rules.find((rule) => rule.resourceType === 'USER')?.readLevel ?? 'NONE',
      ROLE: policy.rules.find((rule) => rule.resourceType === 'ROLE')?.readLevel ?? 'NONE',
    });
  }
}
