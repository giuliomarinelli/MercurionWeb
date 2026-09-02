import { FormControl } from '@angular/forms';
import type { UserGenderControl, UserRegisterDTO } from '@mercurion/rest-contracts'

export type {
  UserGender,
  UserGenderControl,
  UserRegisterDTO
} from '@mercurion/rest-contracts'

export type UserRegistrationFormValue = Omit<UserRegisterDTO, 'gender'> & {
  gender: UserGenderControl
  confirmPassword: string
}


export type UserRegistrationFormControls = {
  firstName: FormControl<string>
  lastName: FormControl<string>
  email: FormControl<string>
  job: FormControl<string | null>
  gender: FormControl<UserGenderControl>
  password: FormControl<string>
  confirmPassword: FormControl<string>
}
