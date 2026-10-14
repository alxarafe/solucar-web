import { Routes } from '@angular/router';
import { ContactComponent } from './features/contact/contact';

export const routes: Routes = [
  { path: '', redirectTo: '/contacts', pathMatch: 'full' },
  { path: 'contacts', component: ContactComponent },
  { path: '**', redirectTo: '/contacts' },
];