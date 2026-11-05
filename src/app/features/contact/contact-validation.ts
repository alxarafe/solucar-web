import { AbstractControl, ValidationErrors } from '@angular/forms';

export function contactNonBlankValidator(control: AbstractControl): ValidationErrors | null {
  const value = typeof control.value === 'string' ? control.value.trim() : '';
  return value.length ? null : { nonBlank: true };
}

export function positiveIntegerValidator(control: AbstractControl): ValidationErrors | null {
  const value = control.value;
  if (value === null || value === undefined || value === '') {
    return null;
  }
  return typeof value === 'number' && Number.isInteger(value) && value > 0
    ? null
    : { positiveInteger: true };
}
