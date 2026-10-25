import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRole, AdminRolesApi } from '../../core/api/admin-roles-api';
import { ADMIN_USER_PASSWORD_MIN_LENGTH, AdminUsersApi } from '../../core/api/admin-users-api';
import { AdminRolePicker } from './admin-role-picker';
import { AdminUserError } from './admin-user-error';
import { ADMIN_USERS_PATH } from './admin-users-navigation';

@Component({
  selector: 'app-admin-user-create',
  imports: [ReactiveFormsModule, RouterLink, AdminRolePicker, AdminUserError],
  templateUrl: './admin-user-create.html',
  styleUrl: './admin-users.scss',
})
export class AdminUserCreate implements OnInit {
  private readonly api = inject(AdminUsersApi);
  private readonly rolesApi = inject(AdminRolesApi);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);
  readonly usersPath = ADMIN_USERS_PATH;
  readonly passwordMinLength = ADMIN_USER_PASSWORD_MIN_LENGTH;
  readonly roles = signal<AdminRole[]>([]);
  readonly selectedRoles = signal<string[]>([]);
  readonly loading = signal(false);
  readonly catalogReady = signal(false);
  readonly submitting = signal(false);
  readonly error = signal<unknown>(null);
  readonly form = inject(FormBuilder).nonNullable.group({
    username: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(ADMIN_USER_PASSWORD_MIN_LENGTH)]],
  });

  ngOnInit(): void {
    this.destroyRef.onDestroy(() => this.form.controls.password.reset());
    this.loadRoles();
  }

  loadRoles(): void {
    if (this.loading() || this.submitting()) return;
    this.loading.set(true);
    this.error.set(null);
    this.rolesApi
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (roles) => {
          this.roles.set(roles);
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
    this.api
      .create({ ...this.form.getRawValue(), roleCodes: [...this.selectedRoles()] })
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.form.controls.password.reset();
          this.submitting.set(false);
        }),
      )
      .subscribe({
        next: (user) => {
          void this.router.navigate([ADMIN_USERS_PATH, user.id]);
        },
        error: (error: unknown) => this.error.set(error),
      });
  }
}
