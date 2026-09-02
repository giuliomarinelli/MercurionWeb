import { Transform } from "class-transformer";
import { IsString, Matches } from "class-validator";
import type {
    TotpBodyDTO as TotpBodyContract,
    TotpDTO as TotpContract
} from '@mercurion/rest-contracts'

export class TotpBodyDTO implements TotpBodyContract {
    @IsString()
    @Matches(/^(?!\s*$)(\d{6}|[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4})$/)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    totp: string
}

export class TotpDTO extends TotpBodyDTO implements TotpContract {
    @IsString()
    @Matches(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    @Transform(({ value }) => typeof value === 'string' ? value.trim() : value)
    secureToken: string
}
