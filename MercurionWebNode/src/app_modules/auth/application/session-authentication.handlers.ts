import { Injectable } from '@nestjs/common'
import { UUID } from 'crypto'

import { SessionDTO } from '../Models/DTO/session.dto'
import { TokenType } from '../Models/enums/token-type.enum'
import { JwtToolsService } from '../services/jwt-tools.service'
import { SessionService } from '../services/session.service'

export interface LogoutCommand {
    sessionId: UUID
    deviceId: UUID
}

export interface LogoutResult {
    completed: true
}

@Injectable()
export class LogoutHandler {
    constructor(private readonly sessionService: SessionService) { }

    public async execute(command: LogoutCommand): Promise<LogoutResult> {
        try {
            const jtiList =
                await this.sessionService.getJtiListBySessionId(command.sessionId)
            await this.sessionService.destroySession(
                command.sessionId,
                command.deviceId
            )
            await Promise.all(
                jtiList.map(jti => this.sessionService.revokeToken(jti))
            )
        } catch {
            // Logout is intentionally idempotent and transport cleanup still proceeds.
        }
        return { completed: true }
    }
}

export interface RevokeSessionCommand {
    userId: UUID
    signedSessionId: string
    currentSessionId: UUID
}

export interface RevokeSessionResult {
    revokedCurrentSession: boolean
}

@Injectable()
export class RevokeSessionHandler {
    constructor(private readonly sessionService: SessionService) { }

    public async execute(
        command: RevokeSessionCommand
    ): Promise<RevokeSessionResult> {
        await this.sessionService.destroySessionAndRevokeAllTokensBySignedSessionId(
            command.signedSessionId,
            command.userId
        )
        const [targetSessionId] = command.signedSessionId.split('.')
        return {
            revokedCurrentSession: targetSessionId === command.currentSessionId
        }
    }
}

export interface RevokeAllSessionsCommand {
    userId: UUID
}

export interface RevokeAllSessionsResult {
    revokedCurrentSession: true
}

@Injectable()
export class RevokeAllSessionsHandler {
    constructor(private readonly sessionService: SessionService) { }

    public async execute(
        command: RevokeAllSessionsCommand
    ): Promise<RevokeAllSessionsResult> {
        await this.sessionService.destroyAllSessionsAndRevokeAllTokensByUserId(
            command.userId
        )
        return { revokedCurrentSession: true }
    }
}

export interface RefreshWsAccessTokenCommand {
    userId: UUID
    sessionId: UUID
}

export interface RefreshWsAccessTokenResult {
    wsAccessToken: string
}

@Injectable()
export class RefreshWsAccessTokenHandler {
    constructor(private readonly jwtTools: JwtToolsService) { }

    public async execute(
        command: RefreshWsAccessTokenCommand
    ): Promise<RefreshWsAccessTokenResult> {
        return {
            wsAccessToken: await this.jwtTools.generateToken(
                command.userId,
                TokenType.ws_AccessToken,
                command.sessionId
            )
        }
    }
}

export interface ListActiveSessionsQuery {
    userId: UUID
    currentSessionId: UUID
}

@Injectable()
export class ListActiveSessionsHandler {
    constructor(private readonly sessionService: SessionService) { }

    public async execute(query: ListActiveSessionsQuery): Promise<SessionDTO[]> {
        return this.sessionService.getAllActiveSessionsByUserIdAsDTOs(
            query.userId,
            query.currentSessionId
        )
    }
}
