import { AbstractControl, ValidatorFn } from "@angular/forms";

export const matchPassword: ValidatorFn = (control: AbstractControl) => {
  if (!control.parent) return null;
  const password = control.parent.get('password');
  const confirm = control;
  if (!password) return null;
  if (confirm.value === '') return null; // lascia che 'required' faccia il suo lavoro
  return password.value === confirm.value ? null : { matchPassword: true };
};
