import Fastify from 'fastify'
import { CONTRACT_VERSION_RESPONSE_HEADERS } from '@mercurion/rest-contracts'
import { registerRestContractVersioningHook } from './contract-versioning-http'

describe('REST contract versioning hook', () => {
  const createApp = () => {
    const app = Fastify()
    const logger = { warn: jest.fn() }
    registerRestContractVersioningHook(app, { isProduction: false, logger })
    app.get('/api/example', async () => ({ ok: true }))
    app.post('/api/graphql', async () => ({ data: { __typename: 'Query' } }))
    return { app, logger }
  }

  it('discloses major 1 and warns for the legacy REST path', async () => {
    const { app, logger } = createApp()

    const response = await app.inject({ method: 'GET', url: '/api/example' })

    expect(response.statusCode).toBe(200)
    expect(response.headers[CONTRACT_VERSION_RESPONSE_HEADERS.currentMajor]).toBe('1')
    expect(response.headers[CONTRACT_VERSION_RESPONSE_HEADERS.supportedMajorRange]).toBe('1-1')
    expect(response.headers.warning).toContain('legacy-unversioned')
    expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('GET /api/example'))
    await app.close()
  })

  it('rejects an unsupported URL major with the canonical REST envelope', async () => {
    const { app } = createApp()

    const response = await app.inject({ method: 'GET', url: '/api/v2/example' })

    expect(response.statusCode).toBe(400)
    expect(response.json()).toMatchObject({
      code: 'CONTRACT_VERSION_UNSUPPORTED',
      status: 400,
      details: {
        selectedMajor: 2,
        currentMajor: 1,
        supportedMajorRange: { minimum: 1, maximum: 1 }
      }
    })
    await app.close()
  })

  it('leaves the GraphQL endpoint to the GraphQL negotiation mechanism', async () => {
    const { app, logger } = createApp()

    const response = await app.inject({
      method: 'POST',
      url: '/api/graphql',
      payload: { query: '{ __typename }' }
    })

    expect(response.statusCode).toBe(200)
    expect(response.headers.warning).toBeUndefined()
    expect(response.headers[CONTRACT_VERSION_RESPONSE_HEADERS.currentMajor]).toBeUndefined()
    expect(logger.warn).not.toHaveBeenCalled()
    await app.close()
  })
})
