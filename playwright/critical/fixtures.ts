import { test as base, expect, type Page } from '@playwright/test'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8888'

const confirmation = {
  statusCode: 200,
  timestamp: '2026-01-01T00:00:00.000Z',
  message: 'OK'
}

const tokenPayload = Buffer.from(JSON.stringify({
  sub: 'qa-user',
  sid: 'qa-session',
  iat: 1_767_225_600,
  exp: 4_102_444_800,
  scp: 'molecule-collection:read molecule-collection:write'
})).toString('base64url')
const fixtureToken = `eyJhbGciOiJub25lIiwidHlwIjoiSldUIn0.${tokenPayload}.fixture`

async function mockAuthentication(page: Page, { mfa = false } = {}): Promise<void> {
  await page.route('**/api/authentication/login/0', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(confirmation)
  }))

  await page.route('**/api/authentication/login/1', async route => {
    if (!mfa) {
      await page.context().addCookies([{ name: '__logged_in', value: 'true', url: baseUrl }])
    }
    await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...confirmation,
      needsMfa: mfa,
      enabledMfaStrategies: mfa ? ['EMAIL_OTP'] : [],
      suspiciousAttempt: false,
      preAuthorizationToken: mfa ? fixtureToken : undefined,
      accessToken: mfa ? undefined : fixtureToken,
      ws_accessToken: mfa ? undefined : fixtureToken,
      initials: 'QA',
      deviceId: 'test-device'
    })
    })
  })

  await page.route('**/api/authentication/login/EMAIL_OTP/2**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(confirmation)
  }))

  await page.route('**/api/authentication/login/EMAIL_OTP/3**', async route => {
    await page.context().addCookies([{ name: '__logged_in', value: 'true', url: baseUrl }])
    await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...confirmation,
      accessToken: fixtureToken,
      ws_accessToken: fixtureToken,
      initials: 'QA',
      deviceId: 'test-device'
    })
    })
  })
}

async function mockCollections(page: Page): Promise<void> {
  let created = false
  await page.route('**/api/account/profile-registry**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      firstName: 'Quality',
      lastName: 'Assurance',
      gender: 'Undefined',
      job: null,
      obscuredEmail: 'q***@example.test',
      obscuredPhone: null,
      avatarId: null,
      recentHistory: [],
      personalMoleculeCount: 0,
      chemblMoleculeCount: 0,
      collectionCount: 0,
      initials: 'QA'
    })
  }))
  await page.route('**/api/account/email', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ email: 'qa@example.test', provider: 'Mercurion' })
  }))
  await page.route('**/api/history**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      items: [],
      itemCount: 0,
      totalItems: 0,
      itemsPerPage: 25,
      totalPages: 1,
      currentPage: 1
    })
  }))
  await page.route('**/graphql', async route => {
    const operationName = route.request().postDataJSON()?.operationName
    if (operationName === 'CreateManyMoleculeCollections') {
      created = true
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: { createManyMoleculeCollections: true } })
      })
      return
    }

    if (operationName === 'PaginatedCollections') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          data: {
            myMoleculeCollectionsPaginated: {
              items: created
                ? [{
                    id: 'collection-qa-009',
                    name: 'QA smoke collection',
                    createdAt: '2026-01-01T00:00:00.000Z',
                    updatedAt: '2026-01-01T00:00:00.000Z',
                    touchedAt: null,
                    itemsCount: 0
                  }]
                : [],
              itemCount: created ? 1 : 0,
              totalPages: 1,
              totalItems: created ? 1 : 0,
              itemsPerPage: 25,
              currentPage: 1
            }
          }
        })
      })
      return
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ data: {} })
    })
  })
}

export const test = base.extend<{ authenticatedPage: Page; mfaPage: Page }>({
  page: async ({ page }, use) => {
    await page.routeWebSocket('**', () => {})
    await page.route('**/*', async route => {
      const url = new URL(route.request().url())
      if (url.origin !== baseUrl) {
        await route.abort()
        return
      }
      await route.continue()
    })
    await use(page)
  },
  authenticatedPage: async ({ page }, use) => {
    await mockAuthentication(page)
    await mockCollections(page)
    await use(page)
  },
  mfaPage: async ({ page }, use) => {
    await mockAuthentication(page, { mfa: true })
    await use(page)
  }
})

export { expect }
