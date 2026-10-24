import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import {
  ADMIN_USERS_PAGE_SIZE,
  AdminUserPage,
  AdminUserQuery,
  AdminUsersApi,
} from '../../core/api/admin-users-api';
import { AdminUserError } from './admin-user-error';
import { ADMIN_USERS_NEW_PATH, ADMIN_USERS_PATH } from './admin-users-navigation';

@Component({
  selector: 'app-admin-users-list',
  imports: [ReactiveFormsModule, RouterLink, AdminUserError],
  templateUrl: './admin-users-list.html',
  styleUrl: './admin-users.scss',
})
export class AdminUsersList implements OnInit {
  private readonly api = inject(AdminUsersApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly usersPath = ADMIN_USERS_PATH;
  readonly newPath = ADMIN_USERS_NEW_PATH;
  readonly form = inject(FormBuilder).nonNullable.group({ q: '', enabled: '' });
  readonly loading = signal(false);
  readonly error = signal<unknown>(null);
  readonly result = signal<AdminUserPage | null>(null);
  private query: AdminUserQuery = { page: 0, size: ADMIN_USERS_PAGE_SIZE };

  ngOnInit(): void {
    this.load();
  }

  search(): void {
    if (this.loading()) return;
    const { q, enabled } = this.form.getRawValue();
    this.query = {
      page: 0,
      size: ADMIN_USERS_PAGE_SIZE,
      q: q.trim(),
      enabled: enabled === '' ? undefined : enabled === 'true',
    };
    this.load();
  }

  page(offset: number): void {
    const result = this.result();
    if (this.loading() || !result) return;
    const page = result.page + offset;
    if (page < 0 || page * result.size >= result.total) return;
    this.query = { ...this.query, page };
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.result.set(null);
    this.api
      .list(this.query)
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (result) => this.result.set(result),
        error: (error: unknown) => this.error.set(error),
      });
  }
}
