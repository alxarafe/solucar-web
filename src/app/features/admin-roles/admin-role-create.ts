import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminPermission, AdminRolesApi } from '../../core/api/admin-roles-api';
import { AdminPermissionPicker } from './admin-permission-picker';
import { AdminRoleError } from './admin-role-error';
import { ADMIN_ROLES_PATH } from './admin-roles-navigation';
import { nonBlankValidator, roleCodeValidator } from './admin-role-validation';

@Component({
  selector: 'app-admin-role-create',
  imports: [ReactiveFormsModule, RouterLink, AdminPermissionPicker, AdminRoleError],
  templateUrl: './admin-role-create.html',
  styleUrl: './admin-roles.scss',
})
export class AdminRoleCreate implements OnInit {
  private readonly api = inject(AdminRolesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly rolesPath = ADMIN_ROLES_PATH;
  readonly permissions = signal<AdminPermission[]>([]);
  readonly selectedPermissions = signal<string[]>([]);
  readonly loading = signal(false);
  readonly catalogReady = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<unknown>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    code: ['', [Validators.required, roleCodeValidator]],
    name: ['', [Validators.required, nonBlankValidator]],
  });

  ngOnInit(): void {
    this.loadPermissions();
  }

  loadPermissions(): void {
    if (this.loading() || this.submitting()) return;
    this.loading.set(true);
    this.error.set(null);
    this.api
      .listPermissions()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (permissions) => {
          this.permissions.set(permissions);
          this.catalogReady.set(true);
        },
        error: (error: unknown) => this.error.set(error),
      });
  }

  submit(): void {
    if (this.submitting() || !this.catalogReady()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.error.set(null);
    const { code, name } = this.form.getRawValue();
    this.api
      .create({ code, name, permissionCodes: [...this.selectedPermissions()] })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.submitting.set(false)),
      )
      .subscribe({
        next: (role) => {
          void this.router.navigate([ADMIN_ROLES_PATH, role.code]);
        },
        error: (error: unknown) => this.error.set(error),
      });
  }
}
