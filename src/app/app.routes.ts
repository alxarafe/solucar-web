import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { Forbidden } from './features/auth/forbidden/forbidden';
import { ContactComponent } from './features/contact/contact';
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
  { path: '**', redirectTo: DEFAULT_AUTHENTICATED_PATH },
];
