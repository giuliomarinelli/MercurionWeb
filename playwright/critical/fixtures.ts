import { test as base, expect, type Page } from '@playwright/test'

const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:8888'

const confirmation = {
  statusCode: 200,
  timestamp: '2026-01-01T00:00:00.000Z',
  message: 'OK'
}

async function mockAuthentication(page: Page, { mfa = false } = {}): Promise<void> {
  await page.route('**/api/authentication/login/0', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(confirmation)
  }))

  await page.route('**/api/authentication/login/1', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...confirmation,
      needsMfa: mfa,
      enabledMfaStrategies: mfa ? ['EMAIL_OTP'] : [],
      suspiciousAttempt: false,
      preAuthorizationToken: mfa ? 'test-pre-auth' : undefined,
      accessToken: mfa ? undefined : 'test-access-token',
      ws_accessToken: mfa ? undefined : 'test-ws-access-token',
      initials: 'QA',
      deviceId: 'test-device'
    })
  }))

  await page.route('**/api/authentication/login/EMAIL_OTP/3**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({
      ...confirmation,
      accessToken: 'test-access-token',
      ws_accessToken: 'test-ws-access-token',
      initials: 'QA',
      deviceId: 'test-device'
    })
  }))
}

async function mockCollections(page: Page): Promise<void> {
  let created = false
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
