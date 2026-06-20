import { AbstractControl, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';

export function getTodayDateString(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function minDateValidator(minDate: string): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (!value) {
      return null;
    }

    return value < minDate ? { minDate: true } : null;
  };
}

export function expiryDateValidators(minDate = getTodayDateString()) {
  return [Validators.required, minDateValidator(minDate)];
}

export function optionalExpiryDateValidators(minDate = getTodayDateString()) {
  return [minDateValidator(minDate)];
}
