import { Component, input, output } from '@angular/core';
import { AdminRole } from '../../core/api/admin-users-api';

@Component({
  selector: 'app-admin-role-picker',
  template: `
    <fieldset [disabled]="disabled()">
      <legend i18n="@@adminUsers.field.roles">Roles</legend>
      @for (role of roles(); track role.code) {
        <label style="display: block">
          <input
            #roleCheckbox
            type="checkbox"
            [checked]="selected().includes(role.code)"
            (change)="toggle(role.code, roleCheckbox.checked)"
          />
          {{ role.name }} ({{ role.code }})
        </label>
      } @empty {
        <p i18n="@@adminUsers.roles.empty">No roles available.</p>
      }
    </fieldset>
  `,
})
export class AdminRolePicker {
  readonly roles = input.required<AdminRole[]>();
  readonly selected = input.required<string[]>();
  readonly disabled = input(false);
  readonly selectedChange = output<string[]>();

  toggle(code: string, checked: boolean): void {
    if (this.disabled()) return;
    this.selectedChange.emit(
      checked
        ? [...new Set([...this.selected(), code])]
        : this.selected().filter((value) => value !== code),
    );
  }
}
