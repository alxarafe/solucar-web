import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Forbidden } from './features/auth/forbidden/forbidden';
import { ContactListComponent } from './features/contact/contact-list';
import { ContactComponent } from './features/contact/contact';
import { ContactEditComponent } from './features/contact/contact-edit';
import {
  CONTACTS_EDIT_SEGMENT,
  CONTACTS_NEW_PATH,
  CONTACTS_PATH,
} from './features/contact/contact-navigation';
import { Permission } from './core/auth/permission';
import { requirePermission } from './core/auth/permission.guard';
import {
  ADMIN_USERS_NEW_PATH,
  ADMIN_USERS_PATH,
} from './features/admin-users/admin-users-navigation';
import {
  ADMIN_ROLES_NEW_PATH,
  ADMIN_ROLES_PATH,
} from './features/admin-roles/admin-roles-navigation';
import {
  ADMIN_AUDIT_PATH,
  ADMIN_AUDIT_CONFIGURATION_PATH,
} from './features/admin-audit/admin-audit-navigation';
import {
  DEFAULT_AUTHENTICATED_PATH,
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from './core/auth/auth-navigation';

export const routes: Routes = [
  { path: '', redirectTo: DEFAULT_AUTHENTICATED_PATH, pathMatch: 'full' },
  { path: LOGIN_PATH.slice(1), component: Login },
  { path: FORBIDDEN_PATH.slice(1), component: Forbidden },
  {
    path: CONTACTS_NEW_PATH.slice(1),
    canActivate: [requirePermission(Permission.ContactsManage)],
    component: ContactComponent,
  },
  {
    path: `${CONTACTS_PATH.slice(1)}/:id/${CONTACTS_EDIT_SEGMENT}`,
    canActivate: [
      requirePermission(Permission.ContactsRead),
      requirePermission(Permission.ContactsManage),
    ],
    component: ContactEditComponent,
  },
  {
    path: CONTACTS_PATH.slice(1),
    canActivate: [requirePermission(Permission.ContactsRead)],
    component: ContactListComponent,
  },
  {
    path: ADMIN_USERS_PATH.slice(1),
    canActivate: [requirePermission(Permission.UsersManage)],
    loadComponent: () =>
      import('./features/admin-users/admin-users-list').then((m) => m.AdminUsersList),
  },
  {
    path: ADMIN_USERS_NEW_PATH.slice(1),
    canActivate: [requirePermission(Permission.UsersManage)],
    loadComponent: () =>
      import('./features/admin-users/admin-user-create').then((m) => m.AdminUserCreate),
  },
  {
    path: `${ADMIN_USERS_PATH.slice(1)}/:id`,
    canActivate: [requirePermission(Permission.UsersManage)],
    loadComponent: () =>
      import('./features/admin-users/admin-user-detail').then((m) => m.AdminUserDetail),
  },
  {
    path: ADMIN_ROLES_PATH.slice(1),
    canActivate: [requirePermission(Permission.RolesManage)],
    loadComponent: () =>
      import('./features/admin-roles/admin-roles-list').then((m) => m.AdminRolesList),
  },
  {
    path: ADMIN_ROLES_NEW_PATH.slice(1),
    canActivate: [requirePermission(Permission.RolesManage)],
    loadComponent: () =>
      import('./features/admin-roles/admin-role-create').then((m) => m.AdminRoleCreate),
  },
  {
    path: `${ADMIN_ROLES_PATH.slice(1)}/:code`,
    canActivate: [requirePermission(Permission.RolesManage)],
    loadComponent: () =>
      import('./features/admin-roles/admin-role-detail').then((m) => m.AdminRoleDetail),
  },
  {
    path: ADMIN_AUDIT_PATH.slice(1),
    canActivate: [requirePermission(Permission.AuditRead)],
    loadComponent: () =>
      import('./features/admin-audit/admin-audit-events').then((m) => m.AdminAuditEvents),
  },
  {
    path: ADMIN_AUDIT_CONFIGURATION_PATH.slice(1),
    canActivate: [requirePermission(Permission.AuditConfigure)],
    loadComponent: () =>
      import('./features/admin-audit/admin-audit-configuration').then(
        (m) => m.AdminAuditConfiguration,
      ),
  },
  { path: '**', redirectTo: DEFAULT_AUTHENTICATED_PATH },
];
