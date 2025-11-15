    import { ConfigModule, ConfigService } from '@nestjs/config'
    import { Environment } from './config/config'
    import { HttpException, UnauthorizedException } from '@nestjs/common'
    import { GraphQLError } from 'graphql'
    import { GraphQLModule } from '@nestjs/graphql'
    import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
    import { join } from 'path'
    import { FastifyReply, FastifyRequest } from 'fastify'

    export const MercurionGraphQLModule = GraphQLModule.forRootAsync<MercuriusDriverConfig>({
        driver: MercuriusDriver,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (config: ConfigService): MercuriusDriverConfig => {
            const env = config.get<Environment>('App.env')
            const isProd = env === Environment.Production

            return {
                driver: MercuriusDriver,
                autoSchemaFile: join(process.cwd(), 'src', 'schema.graphql'),
                path: '/api/graphql',
                graphiql: !isProd,

                context: (request: FastifyRequest, reply: FastifyReply) => ({
                    request,
                    reply,
                }),

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

                            if (original.message === 'Fatal: unauthenticated') {
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

                        // 🔐 2) Altre HttpException (400, 403, 404, ecc.)
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
                                isProd && code !== 'BAD_USER_INPUT'
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

                        const message = isProd ? 'Internal server error' : err.message

                        return {
                            message,
                            path: err.path,
                            extensions: {
                                code: isProd ? 'INTERNAL_SERVER_ERROR' : code,
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
