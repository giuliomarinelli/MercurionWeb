import type { ExecutionContext } from '@nestjs/common'
import type { FastifyReply, FastifyRequest } from 'fastify'
import type { UUID } from 'node:crypto'

import type { AppJwtPayload } from '../../Models/interfaces/app-jwt-payload.interface'

export type AuthenticationTransportKind = 'http' | 'graphql'
export type AccessTokenAuthenticationMode = 'current' | 'refresh'
export type AuthenticationPolicyStage =
  | 'credential'
  | 'authentication'
  | 'authorization'
  | 'session'
  | 'refresh'
  | 'principal'

export interface AuthenticationRequestContext {
  readonly executionContext: ExecutionContext
  readonly transport: AuthenticationTransportKind
  readonly request: FastifyRequest
  readonly reply: FastifyReply
  readonly isSoftAuth: boolean
  readonly sessionId?: UUID
  readonly deviceId?: string
}

export interface AccessTokenAuthenticationResult {
  readonly mode: AccessTokenAuthenticationMode
  readonly payload: AppJwtPayload
}

export interface AuthenticationAttemptState {
  stage: AuthenticationPolicyStage
  accessToken?: string
  refreshedToken?: string
  payload?: AppJwtPayload
  userId?: UUID
}
