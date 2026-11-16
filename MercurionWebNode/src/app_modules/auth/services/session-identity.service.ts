import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { createHmac, UUID } from 'crypto'
import {
    ApplicationErrorCode,
    applicationError
} from 'src/exception-handling/application-error'

@Injectable()
export class SessionIdentityService {

    private readonly secret: string

    constructor(configService: ConfigService) {
        this.secret = configService.get<string>('App.sessionSignatureSecret')!
    }

    public sign(sessionId: UUID): string {
        const signature = createHmac('sha256', this.secret)
            .update(sessionId)
            .digest('hex')
        return `${sessionId}.${signature}`
    }

    public verifyAndParse(signedSessionId: string): UUID {
        const invalidSignature = applicationError(
            ApplicationErrorCode.SESSION_SIGNATURE_INVALID
        )
        const parts = signedSessionId.split('.')
        if (parts.length !== 2) {
            throw invalidSignature
        }

        const [sessionId, signature] = parts
        const expectedSignature = createHmac('sha256', this.secret)
            .update(sessionId)
            .digest('hex')
        if (signature !== expectedSignature) {
            throw invalidSignature
        }

        return sessionId as UUID
    }
}
