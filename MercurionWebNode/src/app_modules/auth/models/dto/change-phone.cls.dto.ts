import { Transform } from 'class-transformer'
import { Equals, IsString, Matches } from 'class-validator'
import type { ChangePhoneDTO as ChangePhoneContract } from '@mercurion/rest-contracts'

export class PhoneDTO {
  @IsString()
  @Matches(/^\d{6,15}$/)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  phoneNumber!: string
}

export class ChangePhoneDTO extends PhoneDTO implements ChangePhoneContract {
  @IsString()
  @Equals('+39', { message: 'Sono supportati solo numeri italiani con prefisso +39.' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  internationalPrefix!: string
}
