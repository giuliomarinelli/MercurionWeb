import { GraphQLModule } from '@nestjs/graphql'
import { MercuriusDriver, MercuriusDriverConfig } from '@nestjs/mercurius'
import { join } from 'path'
import { FastifyRequest, FastifyReply } from 'fastify'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { Environment } from './config/config'



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

                const sanitizedErrors = errors.map((err) => {
                    const code = (err.extensions?.code as string) ?? 'INTERNAL_SERVER_ERROR'

                    const isUserFacingCode =
                        code === 'BAD_USER_INPUT' ||
                        code === 'GRAPHQL_VALIDATION_FAILED'

                    // 🔹 Errori di input → messaggio visibile SEMPRE
                    if (isUserFacingCode) {
                        return {
                            message: err.message,
                            path: err.path,
                            extensions: { code },
                        }
                    }

                    // 🔹 Tutto il resto:
                    // - in prod: messaggio generico
                    // - in dev: messaggio completo (utile per debug)
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