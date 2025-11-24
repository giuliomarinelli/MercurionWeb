import { IsString, Matches } from "class-validator";

export class TotpBodyDTO {
    @IsString()
    @Matches(/^(?!\s*$)(\d{6}|[a-fA-F0-9]{4}-[a-fA-F0-9]{4}-[a-fA-F0-9]{4})$/)
    totp: string
}

export class TotpDTO extends TotpBodyDTO {
    @IsString()
    @Matches(/^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/)
    secureToken: string
}


