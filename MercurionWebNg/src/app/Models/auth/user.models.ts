export interface UserRegisterDTO {
  firstName: string
  lastName: string
  email: string
  job?: string | null
  gender: UserGender
  password: string
}

export type UserGender = 'M' | 'F' | 'Undefined'
