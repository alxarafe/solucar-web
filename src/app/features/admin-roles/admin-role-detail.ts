import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { EMPTY, catchError, finalize, forkJoin, switchMap } from 'rxjs';
import { AdminPermission, AdminRole, AdminRolesApi } from '../../core/api/admin-roles-api';
import { AdminPermissionPicker } from './admin-permission-picker';
import { AdminRoleError } from './admin-role-error';
import { ADMIN_ROLES_PATH } from './admin-roles-navigation';
import { nonBlankValidator } from './admin-role-validation';

@Component({
  selector: 'app-admin-role-detail',
  imports: [ReactiveFormsModule, RouterLink, AdminPermissionPicker, AdminRoleError],
  templateUrl: './admin-role-detail.html',
  styleUrl: './admin-roles.scss',
})
export class AdminRoleDetail implements OnInit {
  private readonly api = inject(AdminRolesApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly rolesPath = ADMIN_ROLES_PATH;
  readonly role = signal<AdminRole | null>(null);
  readonly permissions = signal<AdminPermission[]>([]);
  readonly selectedPermissions = signal<string[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<unknown>(null);
  readonly success = signal<string | null>(null);
  readonly confirmingDelete = signal(false);
  readonly nameForm = this.fb.nonNullable.group({
    name: ['', [Validators.required, nonBlankValidator]],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.role.set(null);
          this.loading.set(true);
          this.error.set(null);
          this.success.set(null);
          this.confirmingDelete.set(false);
          return forkJoin({
            role: this.api.get(params.get('code')!),
            permissions: this.api.listPermissions(),
          }).pipe(
            catchError((error: unknown) => {
              this.error.set(error);
              return EMPTY;
            }),
            finalize(() => this.loading.set(false)),
          );
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ role, permissions }) => {
        this.permissions.set(permissions);
        this.applyRole(role);
      });
  }

  saveName(): void {
    const role = this.role();
    if (!role || role.builtIn || this.busy()) return;
    if (this.nameForm.invalid) {
      this.nameForm.markAllAsTouched();
      return;
    }
    this.startOperation();
    this.api
      .updateName(role.code, this.nameForm.getRawValue().name)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          if (this.role()?.code === role.code) {
            this.applyRole(updated);
            this.success.set($localize`:@@adminRoles.save.success:Role saved successfully.`);
          }
        },
        error: (error: unknown) => {
          if (this.role()?.code === role.code) this.error.set(error);
        },
      });
  }

  savePermissions(): void {
    const role = this.role();
    if (!role || role.builtIn || this.busy()) return;
    this.startOperation();
    this.api
      .replacePermissions(role.code, [...this.selectedPermissions()])
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (updated) => {
          if (this.role()?.code === role.code) {
            this.applyRole(updated);
            this.success.set(
              $localize`:@@adminRoles.permissions.success:Permissions saved successfully.`,
            );
          }
        },
        error: (error: unknown) => {
          if (this.role()?.code === role.code) this.error.set(error);
        },
      });
  }

  requestDelete(): void {
    if (!this.role() || this.role()!.builtIn || this.busy()) return;
    this.confirmingDelete.set(true);
  }

  cancelDelete(): void {
    this.confirmingDelete.set(false);
  }

  confirmDelete(): void {
    const role = this.role();
    if (!role || role.builtIn || this.busy() || !this.confirmingDelete()) return;
    this.confirmingDelete.set(false);
    this.startOperation();
    this.api
      .delete(role.code)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: () => {
          void this.router.navigate([ADMIN_ROLES_PATH]);
        },
        error: (error: unknown) => {
          if (this.role()?.code === role.code) this.error.set(error);
        },
      });
  }

  private startOperation(): void {
    this.busy.set(true);
    this.error.set(null);
    this.success.set(null);
  }

  private applyRole(role: AdminRole): void {
    this.role.set(role);
    this.nameForm.reset({ name: role.name });
    this.selectedPermissions.set([...role.permissionCodes]);
  }
}
