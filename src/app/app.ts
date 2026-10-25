import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { authErrorMessage, AuthError } from './core/auth/auth-error';
import { AuthSessionService } from './core/auth/auth-session.service';
import { LOGIN_PATH } from './core/auth/auth-navigation';
import { NavigationEntry, visibleNavigationEntries } from './core/navigation/navigation-entry';
import { Permission } from './core/auth/permission';
import { ADMIN_USERS_PATH } from './features/admin-users/admin-users-navigation';
import { ADMIN_ROLES_PATH } from './features/admin-roles/admin-roles-navigation';
import { ADMIN_AUDIT_PATH } from './features/admin-audit/admin-audit-navigation';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.scss',
  templateUrl: './app.html',
})
export class App {
  readonly auth = inject(AuthSessionService);
  private readonly router = inject(Router);

  readonly loggingOut = signal(false);
  readonly logoutError = signal<AuthError | null>(null);

  readonly navigationEntries: readonly NavigationEntry[] = [
    {
      label: $localize`:@@adminUsers.title:Users`,
      route: ADMIN_USERS_PATH,
      requiredPermission: Permission.UsersManage,
    },
    {
      label: $localize`:@@adminRoles.title:Roles`,
      route: ADMIN_ROLES_PATH,
      requiredPermission: Permission.RolesManage,
    },
    {
      label: $localize`:@@adminAudit.title:Audit`,
      route: ADMIN_AUDIT_PATH,
      requiredPermission: Permission.AuditRead,
    },
  ];
  readonly visibleNavigation = computed(() =>
    visibleNavigationEntries(this.navigationEntries, (permission) =>
      this.auth.hasPermission(permission),
    ),
  );

  readonly logoutLabel = computed(() =>
    this.loggingOut()
      ? $localize`:@@auth.action.loggingOut:Signing out...`
      : $localize`:@@auth.action.logout:Log out`,
  );

  readonly logoutErrorMessage = computed(() => {
    const error = this.logoutError();
    return error ? authErrorMessage(error) : null;
  });

  readonly logoutErrorDetail = computed(() => {
    const error = this.logoutError();
    const message = this.logoutErrorMessage();
    return error?.detail && error.detail !== message ? error.detail : null;
  });

  async logout(): Promise<void> {
    if (this.loggingOut()) {
      return;
    }

    this.loggingOut.set(true);
    this.logoutError.set(null);
    const error = await this.auth.logout();
    this.loggingOut.set(false);

    if (error) {
      this.logoutError.set(error);
      return;
    }

    await this.router.navigateByUrl(LOGIN_PATH);
  }
}
