import { AbstractControl, ValidationErrors } from '@angular/forms';

export const ROLE_CODE_MAX_LENGTH = 100;
export const ROLE_CODE_SYNTAX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function roleCodeValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value : '';
  const normalized = value.trim().toLowerCase();
  return normalized.length <= ROLE_CODE_MAX_LENGTH && ROLE_CODE_SYNTAX.test(normalized)
    ? null
    : { roleCode: true };
}

export function nonBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value.length ? null : { nonBlank: true };
}
