import { AbstractControl, ValidationErrors } from '@angular/forms';

export const UUID_SYNTAX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function uuidValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value.length === 0 || UUID_SYNTAX.test(value) ? null : { uuid: true };
}
