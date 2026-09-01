export interface TotpBodyDTO {
  totp: string
}

export interface TotpDTO extends TotpBodyDTO {
  secureToken: string
}

export interface BackupCodeDTO {
  code: string
}

export interface VerifyBodyDTO {
  kind: VerifyKind
  payload: TotpBodyDTO | BackupCodeDTO
}

export type VerifyKind =  'totp' | 'backup'

export interface VerifyBodyDTO {
  kind: VerifyKind
  payload: TotpBodyDTO | BackupCodeDTO
}

