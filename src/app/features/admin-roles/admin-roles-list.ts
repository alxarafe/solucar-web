import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { AdminRole, AdminRolesApi } from '../../core/api/admin-roles-api';
import { AdminRoleError } from './admin-role-error';
import { ADMIN_ROLES_NEW_PATH, ADMIN_ROLES_PATH } from './admin-roles-navigation';

@Component({
  selector: 'app-admin-roles-list',
  imports: [RouterLink, AdminRoleError],
  templateUrl: './admin-roles-list.html',
  styleUrl: './admin-roles.scss',
})
export class AdminRolesList implements OnInit {
  private readonly api = inject(AdminRolesApi);
  private readonly destroyRef = inject(DestroyRef);
  readonly rolesPath = ADMIN_ROLES_PATH;
  readonly newPath = ADMIN_ROLES_NEW_PATH;
  readonly loading = signal(false);
  readonly error = signal<unknown>(null);
  readonly roles = signal<AdminRole[] | null>(null);

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    if (this.loading()) return;
    this.loading.set(true);
    this.error.set(null);
    this.roles.set(null);
    this.api
      .list()
      .pipe(
        takeUntilDestroyed(this.destroyRef),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: (roles) => this.roles.set(roles),
        error: (error: unknown) => this.error.set(error),
      });
  }
}
