import { Routes } from '@angular/router';
import { Login } from './features/auth/login/login';
import { ContactComponent } from './features/contact/contact';
import { DEFAULT_AUTHENTICATED_PATH, LOGIN_PATH } from './core/auth/auth-navigation';

export const routes: Routes = [
  { path: '', redirectTo: DEFAULT_AUTHENTICATED_PATH, pathMatch: 'full' },
  { path: LOGIN_PATH.slice(1), component: Login },
  { path: 'contacts', component: ContactComponent },
  { path: '**', redirectTo: DEFAULT_AUTHENTICATED_PATH },
];
