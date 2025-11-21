export interface TotpBodyDTO {
  totp: string
}

export interface TotpDTO extends TotpBodyDTO {
  secureToken: string
}
