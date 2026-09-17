import { test, expect } from './system-fixtures'

const canonicalOrigin = 'http://localhost:8888'

test.describe('same-version frontend/backend system journeys', () => {
  test('serves an anonymous Angular journey and real REST response through nginx', async ({
    page
  }) => {
    const apiOrigins = new Set<string>()
    page.on('request', request => {
      const pathname = new URL(request.url()).pathname
      if (pathname === '/health' || pathname.startsWith('/api/')) {
        apiOrigins.add(new URL(request.url()).origin)
      }
    })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Piacere di averti qui.' })).toBeVisible()

    const response = await page.evaluate(async () => {
      const result = await fetch('/health', { credentials: 'same-origin' })
      return { status: result.status, body: await result.json() }
    })

    expect(response.status).toBe(200)
    expect(response.body).toEqual(expect.objectContaining({
      statusCode: 200,
      message: 'Health OK'
    }))
    expect(apiOrigins).toEqual(new Set([canonicalOrigin]))
  })

  test('authenticates through Angular and proves a protected REST session', async ({
    page,
    testAccount
  }) => {
    const apiResponses: number[] = []
    page.on('response', response => {
      if (response.url().startsWith(`${canonicalOrigin}/api/`)) {
        apiResponses.push(response.status())
      }
    })

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByLabel('Indirizzo e-mail').fill(testAccount.email)
    await page.getByRole('button', { name: "Continua con l'e-mail inserita" }).click()
    await expect(page.getByLabel('Password')).toBeVisible()
    await page.getByLabel('Password').fill(testAccount.password)
    await page.getByRole('button', { name: 'Accedi al tuo account' }).click()

    await expect(page).toHaveURL(/\/dashboard$/)
    const cookies = await page.context().cookies(canonicalOrigin)
    const sessionCookie = cookies.find(cookie => cookie.name === '__node_session_id')
    const loginMarkerCookie = cookies.find(cookie => cookie.name === '__logged_in')
    expect(sessionCookie).toBeDefined()
    expect(sessionCookie?.httpOnly).toBe(true)
    expect(sessionCookie?.sameSite).toBe('Strict')
    expect(loginMarkerCookie).toBeDefined()
    expect(loginMarkerCookie?.httpOnly).toBe(false)
    expect(loginMarkerCookie?.sameSite).toBe('Strict')
    expect(apiResponses.some(status => status === 200)).toBe(true)
  })
})
