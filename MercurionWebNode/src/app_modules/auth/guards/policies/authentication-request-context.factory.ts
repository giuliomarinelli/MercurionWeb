import { ExecutionContext, Injectable } from '@nestjs/common'
import { GqlContextType, GqlExecutionContext } from '@nestjs/graphql'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UUID } from 'node:crypto'

import type {
  AuthenticationRequestContext,
  AuthenticationTransportKind
} from './authentication-policy.types'

@Injectable()
export class AuthenticationRequestContextFactory {
  supports(context: ExecutionContext): boolean {
    return context.getType() === 'http'
      || context.getType<GqlContextType>() === 'graphql'
  }

  create(
    context: ExecutionContext,
    isSoftAuth: boolean
  ): AuthenticationRequestContext {
    const transport = context.getType<GqlContextType>() as AuthenticationTransportKind
    let request: FastifyRequest
    let reply: FastifyReply

    if (transport === 'graphql') {
      const gqlContext = GqlExecutionContext.create(context).getContext<{
        request: FastifyRequest
        reply: FastifyReply
      }>()
      request = gqlContext.request
      reply = gqlContext.reply
    } else {
      request = context.switchToHttp().getRequest<FastifyRequest>()
      reply = context.switchToHttp().getResponse<FastifyReply>()
    }

    return {
      executionContext: context,
      transport,
      request,
      reply,
      isSoftAuth,
      sessionId: request.headers['x-session-id'] as UUID | undefined,
      deviceId: request.headers['x-device-id'] as string | undefined
    }
  }
}
