import { ConfigService } from '@nestjs/config'
import type { FastifyReply, FastifyRequest } from 'fastify'
import { GraphQLError } from 'graphql'
import { Environment } from './config/config.schema'
import {
  CONTRACT_VERSION_HEADER,
  CONTRACT_VERSION_RESPONSE_HEADERS
} from '@mercurion/rest-contracts'
import { createMercurionGraphQLConfig } from './mercurion-graphql.module'

describe('Mercurion GraphQL contract versioning', () => {
  type ContextFactory = (
    request: FastifyRequest,
    reply: FastifyReply
  ) => Record<string, unknown> | Promise<Record<string, unknown>>
  type PreExecutionHook = (
    schema: unknown,
    document: unknown,
    context: unknown,
    variables: unknown
  ) => void | Promise<void>
  type ErrorFormatter = (
    result: { data: null; errors: readonly GraphQLError[] },
    context: { reply: FastifyReply }
  ) => unknown

  const createConfig = () => createMercurionGraphQLConfig({
    getOrThrow: jest.fn().mockReturnValue(Environment.Development)
  } as unknown as ConfigService)

  const createRequestReply = (major?: string) => {
    const responseHeaders = new Map<string, string>()
    const request = {
      id: 'graphql-contract-test',
      headers: major === undefined ? {} : { [CONTRACT_VERSION_HEADER]: major }
    } as unknown as FastifyRequest
    const reply = {
      statusCode: 200,
      request,
      header: jest.fn((name: string, value: string) => {
        responseHeaders.set(name.toLowerCase(), value)
        return reply
      })
    } as unknown as FastifyReply
    return { request, reply, responseHeaders }
  }

  it('discloses canonical response metadata without a legacy warning for major 1', async () => {
    const config = createConfig()
    const { request, reply, responseHeaders } = createRequestReply('1')
    const contextFactory = config.context as ContextFactory

    const context = await contextFactory(request, reply)

    expect(context).toMatchObject({ contractVersion: { kind: 'supported', selectedMajor: 1 } })
    expect(responseHeaders.get(CONTRACT_VERSION_RESPONSE_HEADERS.currentMajor)).toBe('1')
    expect(responseHeaders.get(CONTRACT_VERSION_RESPONSE_HEADERS.supportedMajorRange)).toBe('1-1')
    expect(responseHeaders.get('warning')).toBeUndefined()
  })

  it('warns when the GraphQL version declaration is absent', async () => {
    const config = createConfig()
    const { request, reply, responseHeaders } = createRequestReply()
    const contextFactory = config.context as ContextFactory

    const context = await contextFactory(request, reply)

    expect(context).toMatchObject({ contractVersion: { kind: 'legacy-unversioned', selectedMajor: 1 } })
    expect(responseHeaders.get('warning')).toContain('legacy-unversioned')
  })

  it('turns an unsupported major into a formatted GraphQL error', async () => {
    const config = createConfig()
    const { request, reply } = createRequestReply('2')
    const contextFactory = config.context as ContextFactory
    const context = await contextFactory(request, reply)
    const preExecution = config.hooks?.preExecution as PreExecutionHook

    await expect(async () => {
      await preExecution({}, {}, context, {})
    }).rejects.toMatchObject({
      message: 'Unsupported contract major version',
      extensions: { code: 'CONTRACT_VERSION_UNSUPPORTED' }
    })

    const error: GraphQLError = await (async () => {
      try {
        await preExecution({}, {}, context, {})
      } catch (caught) {
        if (caught instanceof GraphQLError) return caught
        throw caught
      }
      throw new Error('Expected the GraphQL contract hook to reject major 2')
    })()
    const errorFormatter = config.errorFormatter as unknown as ErrorFormatter
    const formatted: unknown = errorFormatter({ data: null, errors: [error] }, { reply })

    expect(formatted).toMatchObject({
      statusCode: 200,
      response: {
        data: null,
        errors: [{
          message: 'Unsupported contract major version',
          extensions: {
            code: 'CONTRACT_VERSION_UNSUPPORTED',
            status: 400,
            details: {
              selectedMajor: 2,
              currentMajor: 1,
              supportedMajorRange: { minimum: 1, maximum: 1 }
            }
          }
        }]
      }
    })
  })
})
