export interface UserData {
  email?: string | null
  ts?: number
}

export interface ChangePasswordDTO {
    oldPassword?: string
    newPassword: string
}
