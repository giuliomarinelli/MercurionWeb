import { AbstractControl, AsyncValidatorFn, ValidatorFn } from "@angular/forms";
import { AuthService } from "./services/auth.service";
import { catchError, debounceTime, distinctUntilChanged, of, switchMap } from "rxjs";
import { map } from 'rxjs/operators'

export const matchPassword: ValidatorFn = (control: AbstractControl) => {
  if (!control.parent) {
    return null
  }
  const password = control.parent.get('password')
  const confirm = control
  if (!password) {
    return null
  }
  if (confirm.value === '') return null // lascia che 'required' faccia il suo lavoro
  return password.value === confirm.value ? null : { matchPassword: true }
};

export function emailAvailabilityValidator(auth: AuthService): AsyncValidatorFn {
  return (control: AbstractControl) => {
    if (!control.value) {
      return of(null)
    }

    return of(control.value).pipe(
      debounceTime(200),
      distinctUntilChanged(),
      switchMap(email =>
        auth.isUserAvailableByEmail(email).pipe(
          map(isAvailable => (isAvailable ? null : { emailTaken: true })),
          catchError(() => of({ serverError: true }))
        )
      )
    )
  }
}
