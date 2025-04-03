import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { UUID } from 'crypto';
import { FastifyRequest } from 'fastify';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';

export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const RequiresTokenType = (type: TokenType) => SetMetadata('tokenType', type)

export const AuthenticatedUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.switchToHttp().getRequest<FastifyRequest>()
        return req.headers['x-user-id'] as UUID
    }
)

export const AuthenticatedSessionId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.switchToHttp().getRequest<FastifyRequest>()
        return req.headers['x-session-id'] as UUID
    }
)

export const DeviceId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.switchToHttp().getRequest<FastifyRequest>()
        return req.headers['x-device-id'] as UUID
    }
)

export const Authorization = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.switchToHttp().getRequest<FastifyRequest>()
        const authorizationHeader = req.headers['authorization'] as string
        if (
            !authorizationHeader ||
            !authorizationHeader.trim() ||
            !new RegExp(/^Bearer\s[\w-]+(?:\.[\w-]+){2}$/).test(authorizationHeader)
        ) {
            throw new UnauthorizedException()
        }
        return authorizationHeader.split(/\s/)[1]
    }
)
