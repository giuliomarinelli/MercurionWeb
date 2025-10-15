import { FormControl, FormGroup, Validators, ValidatorFn, NonNullableFormBuilder, AbstractControl } from '@angular/forms';

export type UserGender = 'M' | 'F' | 'Undefined';

export interface UserRegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  job?: string | null;
  gender: UserGender;
  password: string;
}

export interface UserRegistrationFormValue extends UserRegisterDTO {
  confirmPassword: string;
}

/** <-- QUESTA è la mappa dei CONTROLLI, non dei valori **/
export type UserRegistrationFormControls = {
  firstName: FormControl<string>;
  lastName: FormControl<string>;
  email: FormControl<string>;
  job: FormControl<string | null>;            // opzionale/nullable
  gender: FormControl<UserGender>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
};
