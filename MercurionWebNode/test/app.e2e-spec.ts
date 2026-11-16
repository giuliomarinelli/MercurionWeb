import { createE2eApplicationFixture, type E2eApplicationFixture } from './e2e-application.fixture'

describe('Nest public application boundary (e2e)', () => {
  let fixture: E2eApplicationFixture

  beforeAll(async () => {
    fixture = await createE2eApplicationFixture()
  })

  afterAll(async () => {
    await fixture?.close()
  })

  beforeEach(() => {
    fixture.verifyEmail.execute.mockReset()
    fixture.verifyEmail.execute.mockResolvedValue({ verified: true })
    fixture.logout.execute.mockClear()
    fixture.listTickets.mockClear()
  })

  it('serves public REST endpoints through the real Fastify transport', async () => {
    const response = await fixture.app.getHttpAdapter().getInstance().inject({
      method: 'GET',
      url: '/test'
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(expect.objectContaining({
      message: 'TEST DEL BACKEND OK',
      statusCode: 200
    }))
  })

  it('maps anonymous authentication failures to the canonical REST envelope', async () => {
    fixture.verifyEmail.execute.mockResolvedValue({ verified: false })

    const response = await fixture.app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/authentication/login/0',
      payload: { email: 'missing@example.test' }
    })

    expect(response.statusCode).toBe(401)
    expect(response.json()).toEqual(expect.objectContaining({
      code: 'UNAUTHORIZED',
      status: 401,
      category: 'authentication',
      message: expect.any(String)
    }))
    expect(response.json()).not.toHaveProperty('stack')
  })

  it('creates and revokes a session at the logout transport boundary', async () => {
    const response = await fixture.app.getHttpAdapter().getInstance().inject({
      method: 'DELETE',
      url: '/authentication/logout',
      headers: {
        'x-session-id': '00000000-0000-7000-8000-000000000001',
        'x-device-id': '00000000-0000-7000-8000-000000000002'
      }
    })

    expect(response.statusCode).toBe(204)
    expect(fixture.logout.execute).toHaveBeenCalledWith({
      sessionId: '00000000-0000-7000-8000-000000000001',
      deviceId: '00000000-0000-7000-8000-000000000002'
    })
  })

  it('executes a representative GraphQL query over HTTP', async () => {
    const response = await fixture.app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/graphql',
      payload: {
        query: '{ myTickets(page: 1, limit: 20) { currentPage totalItems } }'
      }
    })

    expect(response.statusCode).toBe(200)
    expect(response.json()).toEqual(expect.objectContaining({
      data: {
        myTickets: {
          currentPage: 1,
          totalItems: 0
        }
      }
    }))
    expect(fixture.listTickets).toHaveBeenCalled()
  })

  it('maps GraphQL validation errors to the canonical error code', async () => {
    const response = await fixture.app.getHttpAdapter().getInstance().inject({
      method: 'POST',
      url: '/api/graphql',
      payload: { query: '{ fieldThatDoesNotExist }' }
    })

    expect(response.statusCode).toBe(400)
    expect(response.json().errors[0].extensions).toEqual(expect.objectContaining({
      code: 'GRAPHQL_VALIDATION_FAILED',
      status: 400,
      category: 'validation'
    }))
  })
})
