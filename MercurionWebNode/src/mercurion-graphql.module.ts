import { ConfigModule, ConfigService } from '@nestjs/config'
import { Environment } from './config/config'
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common'
import { GraphQLError } from 'graphql'
import { GraphQLModule } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { join } from 'path'
import { FastifyReply, FastifyRequest } from 'fastify'
import GraphQLJSON from 'graphql-type-json'
import {
    getApplicationError,
    getApplicationErrorMessage
} from './exception-handling/application-error'
import { getApplicationErrorDefinition, isApplicationErrorEnvelopeCode } from '@mercurion/rest-contracts'
import {
    createApplicationErrorEnvelope,
    createCorrelationId,
    createGraphQLErrorExtensions
} from './exception-handling/application-error-envelope'

export const MercurionGraphQLModule = GraphQLModule.forRootAsync<MercuriusDriverConfig>({
    driver: MercuriusDriver,
    imports: [ConfigModule],
    inject: [ConfigService],
    useFactory: (config: ConfigService): MercuriusDriverConfig => {

        const env = config.get<Environment>('App.env')!
        const isNotDev = env !== Environment.Development

        return {
            driver: MercuriusDriver,
            autoSchemaFile: join(process.cwd(), 'src', 'schema.graphql'),
            sortSchema: true,
            buildSchemaOptions: {
                addNewlineAtEnd: true,
            },
            path: '/api/graphql',
            graphiql: !isNotDev,

            context: (request: FastifyRequest, reply: FastifyReply) => ({
                request,
                reply
            }),

            resolvers: { JSON: GraphQLJSON },

            errorFormatter: (executionResult, ctx) => {
                const { errors, data } = executionResult

                if (!errors || errors.length === 0) {
                    return {
                        statusCode: ctx.reply.statusCode ?? 200,
                        response: { data },
                    }
                }
                const request = ctx.reply.request as FastifyRequest | undefined
                const headers = request?.headers ?? {}
                const correlationId = createCorrelationId(headers['x-correlation-id'] ?? headers['x-request-id'] ?? request?.id)


                const sanitizedErrors = errors.map((err: GraphQLError) => {
                    const original = err.originalError

                    const applicationError = getApplicationError(original)
                    if (applicationError) {
                        const definition = getApplicationErrorDefinition(applicationError.code)
                        const envelope = createApplicationErrorEnvelope({
                            status: definition.httpStatus,
                            code: applicationError.code,
                            message: getApplicationErrorMessage(applicationError, isNotDev),
                            details: applicationError.details,
                            correlationId,
                            isProduction: isNotDev
                        })
                        ctx.reply.statusCode = definition.graphQlStatus ?? definition.httpStatus
                        return {
                            message: envelope.message,
                            path: err.path,
                            extensions: createGraphQLErrorExtensions(envelope),
                        }
                    }

                    if (original instanceof UnauthorizedException) {
                        const envelope = createApplicationErrorEnvelope({
                            status: 401,
                            code: 'UNAUTHORIZED',
                            message: 'Unauthorized',
                            correlationId,
                            isProduction: isNotDev
                        })
                        ctx.reply.statusCode = envelope.status
                        return {
                            message: envelope.message,
                            path: err.path,
                            extensions: createGraphQLErrorExtensions(envelope),
                        }
                    }

                    if (original instanceof ForbiddenException) {
                        const envelope = createApplicationErrorEnvelope({
                            status: 403,
                            code: 'FORBIDDEN',
                            message: 'Forbidden',
                            correlationId,
                            isProduction: isNotDev
                        })
                        ctx.reply.statusCode = envelope.status

                        return {
                            message: envelope.message,
                            path: err.path,
                            extensions: createGraphQLErrorExtensions(envelope),
                        }
                    }

                    // 🔐 3) Altre HttpException 
                    if (original instanceof HttpException) {
                        const status = original.getStatus()
                        const response = original.getResponse() as
                            | string
                            | { message?: string | string[];[key: string]: any }

                        let message: string

                        if (typeof response === 'string') {
                            message = response
                        } else if (Array.isArray(response.message)) {
                            message = response.message[0]
                        } else {
                            message = response.message ?? err.message
                        }

                        const code =
                            status === 400 || status === 422
                                ? 'BAD_USER_INPUT'
                                : status === 401
                                    ? 'UNAUTHORIZED'
                                    : status === 403
                                        ? 'FORBIDDEN'
                                        : status === 404
                                            ? 'NOT_FOUND'
                                            : status === 429
                                                ? 'RATE_LIMITED'
                                                : 'INTERNAL_SERVER_ERROR'
                        const details = typeof response === 'object' && !Array.isArray(response)
                            ? response.details as Readonly<Record<string, unknown>> | undefined
                            : undefined
                        const envelope = createApplicationErrorEnvelope({
                            status,
                            code,
                            message,
                            details,
                            correlationId,
                            isProduction: isNotDev
                        })

                        ctx.reply.statusCode = envelope.status

                        return {
                            message: envelope.message,
                            path: err.path,
                            extensions: createGraphQLErrorExtensions(envelope),
                        }
                    }

                    const rawCode = err.extensions?.code
                    const code = isApplicationErrorEnvelopeCode(rawCode)
                        ? rawCode
                        : err.path
                            ? 'INTERNAL_SERVER_ERROR'
                            : 'GRAPHQL_VALIDATION_FAILED'
                    const envelope = createApplicationErrorEnvelope({
                        status: code === 'BAD_USER_INPUT' || code === 'GRAPHQL_VALIDATION_FAILED' ? 400 : 500,
                        code,
                        message: err.message,
                        correlationId,
                        isProduction: isNotDev
                    })

                    return {
                        message: envelope.message,
                        path: err.path,
                        extensions: createGraphQLErrorExtensions(envelope),
                    }
                })

                return {
                    statusCode: ctx.reply.statusCode ?? 200,
                    response: {
                        data,
                        errors: sanitizedErrors,
                    },
                }
            },
        }
    },
})
