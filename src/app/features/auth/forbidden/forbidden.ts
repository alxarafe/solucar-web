import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DEFAULT_AUTHENTICATED_PATH } from '../../../core/auth/auth-navigation';

@Component({
  selector: 'app-forbidden',
  imports: [RouterLink],
  templateUrl: './forbidden.html',
  styleUrl: './forbidden.scss',
})
export class Forbidden {
  readonly contactsPath = DEFAULT_AUTHENTICATED_PATH;
}
