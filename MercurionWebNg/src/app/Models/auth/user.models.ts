import { FormControl } from '@angular/forms';

export type UserGenderControl = 'M' | 'F' | 'Undefined' | '';

export type UserGender = Omit<UserGenderControl, ''>

export interface UserRegisterDTO {
  firstName: string;
  lastName: string;
  email: string;
  job?: string | null;
  gender: UserGenderControl;
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
  gender: FormControl<UserGenderControl>;
  password: FormControl<string>;
  confirmPassword: FormControl<string>;
};

