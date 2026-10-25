import { Component, input, output } from '@angular/core';
import { AdminPermission } from '../../core/api/admin-roles-api';

@Component({
  selector: 'app-admin-permission-picker',
  template: `
    <fieldset [disabled]="disabled()">
      <legend i18n="@@adminRoles.field.permissions">Permissions</legend>
      @for (permission of permissions(); track permission.code) {
        <label style="display: block">
          <input
            #permissionCheckbox
            type="checkbox"
            [checked]="selected().includes(permission.code)"
            (change)="toggle(permission.code, permissionCheckbox.checked)"
          />
          <code>{{ permission.code }}</code> — {{ permission.description }}
        </label>
      } @empty {
        <p i18n="@@adminRoles.permissions.unavailable">No permissions available.</p>
      }
    </fieldset>
  `,
})
export class AdminPermissionPicker {
  readonly permissions = input.required<AdminPermission[]>();
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
