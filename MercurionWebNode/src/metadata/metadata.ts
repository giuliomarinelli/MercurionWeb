import { createParamDecorator, ExecutionContext, SetMetadata, UnauthorizedException } from '@nestjs/common'
import { GqlExecutionContext } from '@nestjs/graphql';
import { UUID } from 'crypto';
import { FastifyRequest } from 'fastify';
import { FingerprintData } from 'src/app_modules/auth/Models/DTO/fingerprints.dtos';
import { TokenType } from 'src/app_modules/auth/Models/enums/token-type.enum';
import { Scope } from 'src/app_modules/user/Models/enums/scope.enum';


export const IS_PUBLIC_KEY = 'isPublic'
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true)

export const RequiresTokenType = (type: TokenType) => SetMetadata('tokenType', type)

export const SCOPES_KEY = 'required_scopes'

export const HasScopes = (...scopes: Scope[]) => {
    return SetMetadata(SCOPES_KEY, scopes)
}

export const AuthenticatedUserId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
        return req.headers['x-user-id'] as UUID
    }
)


export const SessionId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
        return req.headers['x-session-id'] as UUID
    }
)

export const DeviceId = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
        return req.headers['x-device-id'] as UUID
    }
)

export const Authorization = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
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

export const Fingerprint = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): FingerprintData => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
        const fingerprint = req.headers['x-fingerprint']

        if (!fingerprint || typeof fingerprint !== 'string') {
            throw new UnauthorizedException('Missing or invalid fingerprint header')
        }

        return JSON.parse(atob(fingerprint)) as FingerprintData
    }
)

export const DeviceInfo = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): InputDeviceInfo => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)
        const deviceInfo = req.headers['x-device-info']

        if (!deviceInfo || typeof deviceInfo !== 'string') {
            throw new UnauthorizedException('Missing or invalid device info header')
        }

        return JSON.parse(atob(deviceInfo)) as InputDeviceInfo
    }
)

export const ClientIp = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): string => {
        const req = ctx.getType() === 'http' ? ctx.switchToHttp().getRequest<FastifyRequest>()
            :
            (GqlExecutionContext.create(ctx).getContext().request as FastifyRequest)

        const ip = req.headers['x-client-ip']

        if (!ip || typeof ip !== 'string') {
            throw new UnauthorizedException('Missing client IP')
        }

        return ip
    }
)

