import { DatePipe } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { EMPTY, Observable, catchError, finalize, forkJoin, switchMap } from 'rxjs';
import {
  ADMIN_USER_PASSWORD_MIN_LENGTH,
  AdminRole,
  AdminUser,
  AdminUsersApi,
} from '../../core/api/admin-users-api';
import { AdminRolePicker } from './admin-role-picker';
import { AdminUserError } from './admin-user-error';
import { ADMIN_USERS_PATH } from './admin-users-navigation';

@Component({
  selector: 'app-admin-user-detail',
  imports: [DatePipe, ReactiveFormsModule, RouterLink, AdminRolePicker, AdminUserError],
  templateUrl: './admin-user-detail.html',
  styleUrl: './admin-users.scss',
})
export class AdminUserDetail implements OnInit {
  private readonly api = inject(AdminUsersApi);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  readonly usersPath = ADMIN_USERS_PATH;
  readonly passwordMinLength = ADMIN_USER_PASSWORD_MIN_LENGTH;
  readonly user = signal<AdminUser | null>(null);
  readonly roles = signal<AdminRole[]>([]);
  readonly selectedRoles = signal<string[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal<unknown>(null);
  readonly success = signal<string | null>(null);
  readonly confirmingEnabled = signal(false);
  readonly usernameForm = this.fb.nonNullable.group({ username: ['', Validators.required] });
  readonly passwordForm = this.fb.nonNullable.group({
    newPassword: ['', [Validators.required, Validators.minLength(ADMIN_USER_PASSWORD_MIN_LENGTH)]],
  });

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          this.user.set(null);
          this.loading.set(true);
          this.error.set(null);
          this.success.set(null);
          this.confirmingEnabled.set(false);
          this.passwordForm.reset();
          return forkJoin({
            user: this.api.get(params.get('id')!),
            roles: this.api.listRoles(),
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
      .subscribe(({ user, roles }) => {
        this.roles.set(roles);
        this.applyUser(user);
      });
    this.destroyRef.onDestroy(() => this.passwordForm.reset());
  }

  saveUsername(): void {
    if (this.usernameForm.invalid) {
      this.usernameForm.markAllAsTouched();
      return;
    }
    const user = this.user();
    if (!user || this.busy()) return;
    this.update(this.api.updateUsername(user.id, this.usernameForm.getRawValue().username));
  }

  confirmEnabled(): void {
    const user = this.user();
    if (!user || this.busy() || !this.confirmingEnabled()) return;
    this.confirmingEnabled.set(false);
    this.update(this.api.updateEnabled(user.id, !user.enabled));
  }

  saveRoles(): void {
    const user = this.user();
    if (!user || this.busy()) return;
    this.update(this.api.replaceRoles(user.id, [...this.selectedRoles()]));
  }

  resetPassword(): void {
    const user = this.user();
    if (!user || this.busy()) return;
    if (this.passwordForm.invalid) {
      this.passwordForm.markAllAsTouched();
      return;
    }
    this.startOperation();
    this.api
      .resetPassword(user.id, this.passwordForm.getRawValue().newPassword)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => {
          this.passwordForm.reset();
          this.busy.set(false);
        }),
      )
      .subscribe({
        next: () => {
          if (this.user()?.id === user.id) {
            this.success.set(
              $localize`:@@adminUsers.password.success:Password reset successfully.`,
            );
          }
        },
        error: (error: unknown) => {
          if (this.user()?.id === user.id) this.error.set(error);
        },
      });
  }

  private update(request: Observable<AdminUser>): void {
    const id = this.user()!.id;
    this.startOperation();
    request
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.busy.set(false)),
      )
      .subscribe({
        next: (user) => {
          if (this.user()?.id === id) {
            this.applyUser(user);
            this.success.set($localize`:@@adminUsers.save.success:User saved successfully.`);
          }
        },
        error: (error: unknown) => {
          if (this.user()?.id === id) this.error.set(error);
        },
      });
  }

  private startOperation(): void {
    this.busy.set(true);
    this.error.set(null);
    this.success.set(null);
  }

  private applyUser(user: AdminUser): void {
    this.user.set(user);
    this.usernameForm.reset({ username: user.username });
    this.selectedRoles.set([...user.roles]);
  }
}
