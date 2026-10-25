import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Forbidden } from './features/auth/forbidden/forbidden';
import { ContactComponent } from './features/contact/contact';
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
  DEFAULT_AUTHENTICATED_PATH,
  FORBIDDEN_PATH,
  LOGIN_PATH,
} from './core/auth/auth-navigation';

export const routes: Routes = [
  { path: '', redirectTo: DEFAULT_AUTHENTICATED_PATH, pathMatch: 'full' },
  { path: LOGIN_PATH.slice(1), component: Login },
  { path: FORBIDDEN_PATH.slice(1), component: Forbidden },
  { path: 'contacts', component: ContactComponent },
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
  { path: '**', redirectTo: DEFAULT_AUTHENTICATED_PATH },
];
