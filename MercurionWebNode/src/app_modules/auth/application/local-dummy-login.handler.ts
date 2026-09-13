import { Injectable } from '@nestjs/common'
import { UUID } from 'crypto'
import type {
    FingerprintData,
    SessionDeviceInfo
} from '@mercurion/rest-contracts'
import type { FastifyRequest } from 'fastify'

import { LocalDummyAuthService } from '../services/local-dummy-auth.service'
import { SercurityService } from '../services/sercurity.service'

export interface LocalDummyLoginCommand {
    requestHeaders: FastifyRequest['headers']
    deviceId: UUID
    ip: string
    sessionDeviceInfo: SessionDeviceInfo
    fingerprintData: FingerprintData
}

export type LocalDummyLoginResult =
    | {
        outcome: 'authenticated'
        accessToken: string
        ws_accessToken: string
        sessionId: UUID
        signedDeviceId: string
    }
    | { outcome: 'not-found' }

@Injectable()
export class LocalDummyLoginHandler {
    constructor(
        private readonly localDummyAuth: LocalDummyAuthService,
        private readonly securityService: SercurityService
    ) { }

    public async execute(
        command: LocalDummyLoginCommand
    ): Promise<LocalDummyLoginResult> {
        if (!this.localDummyAuth.acceptsActivationRequest({
            headers: command.requestHeaders
        })) {
            return { outcome: 'not-found' }
        }

        return {
            outcome: 'authenticated',
            ...await this.localDummyAuth.createAuthenticatedSession(
                command.deviceId,
                command.ip,
                command.sessionDeviceInfo,
                command.fingerprintData
            ),
            signedDeviceId: this.securityService.signDeviceId(command.deviceId)
        }
    }
}
