import { ConfigModule, ConfigService } from '@nestjs/config'
import { Environment } from './config/config'
import { ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common'
import { GraphQLError } from 'graphql'
import { GraphQLModule } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { join } from 'path'
import { FastifyReply, FastifyRequest } from 'fastify'
import { RpcException } from '@nestjs/microservices'
import GraphQLJSON from 'graphql-type-json'

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

                const sanitizedErrors = errors.map((err: GraphQLError) => {
                    const original = err.originalError

                    // 🔐 1) Unauthorized → UNAUTHENTICATED SEMPRE, anche in prod
                    if (original instanceof UnauthorizedException) {
                        ctx.reply.statusCode = 401

                        if (['Fatal: unauthenticated', 'Unauthenticated'].includes(original.message)) {
                            return {
                                message: original.message,
                                path: err.path,
                                extensions: {
                                    code: 'UNAUTHENTICATED',
                                },
                            }
                        }

                        return {
                            message: 'Unauthorized',
                            path: err.path,
                            extensions: {
                                code: 'UNAUTHORIZED',
                            },
                        }
                    }

                    // 🔐 2) Forbidden → FORBIDDEN SEMPRE, anche in prod
                    if ((original instanceof RpcException && ['Forbidden::Cannot publish on a closed ticket', 'Forbidden::missing permissions'].includes(original.message)) || original instanceof ForbiddenException) {
                        ctx.reply.statusCode = 403

                        if (['Forbidden::Cannot publish on a closed ticket', 'Forbidden::missing permissions'].includes(original.message)) {
                            return {
                                message: original.message,
                                path: err.path,
                                extensions: {
                                    code: 'FORBIDDEN',
                                },
                            }
                        }

                        return {
                            message: 'Forbidden',
                            path: err.path,
                            extensions: {
                                code: 'FORBIDDEN',
                            },
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

                        // qui puoi decidere tu le tue "code"
                        const code =
                            status === 400
                                ? 'BAD_USER_INPUT'
                                : status === 403
                                    ? 'FORBIDDEN'
                                    : 'INTERNAL_SERVER_ERROR'

                        ctx.reply.statusCode = status

                        // in prod magari nascondi il messaggio tranne per BAD_USER_INPUT
                        const exposedMessage =
                            isNotDev && code !== 'BAD_USER_INPUT'
                                ? 'Internal server error'
                                : message

                        return {
                            message: exposedMessage,
                            path: err.path,
                            extensions: { code },
                        }
                    }

                    // 🔹 3) fallback sul tuo comportamento attuale
                    const code = (err.extensions?.code as string) ?? 'INTERNAL_SERVER_ERROR'

                    const isUserFacingCode =
                        code === 'BAD_USER_INPUT' ||
                        code === 'GRAPHQL_VALIDATION_FAILED'

                    if (isUserFacingCode) {
                        return {
                            message: err.message,
                            path: err.path,
                            extensions: { code },
                        }
                    }

                    const message = isNotDev ? 'Internal server error' : err.message

                    return {
                        message,
                        path: err.path,
                        extensions: {
                            code: isNotDev ? 'INTERNAL_SERVER_ERROR' : code,
                        },
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
