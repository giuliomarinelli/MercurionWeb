import { test as base, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const environmentPath = resolve('MercurionWebNode/env/.env.development')

function readEnvironmentValue(name: string): string | undefined {
  const configured = process.env[name]
  if (configured) {
    return configured
  }

  if (!existsSync(environmentPath)) {
    return undefined
  }

  const line = readFileSync(environmentPath, 'utf8')
    .split(/\r?\n/)
    .find(value => value.startsWith(`${name}=`))

  return line?.slice(name.length + 1).trim() || undefined
}

export const test = base.extend<{
  testAccount: { email: string; password: string }
}>({
  testAccount: async ({}, use, testInfo) => {
    const email = readEnvironmentValue('LOCAL_TEST_ACCOUNT_EMAIL')
    const password = readEnvironmentValue('LOCAL_TEST_ACCOUNT_PASSWORD')

    if (!email || !password) {
      throw new Error(
        `System tests require LOCAL_TEST_ACCOUNT_EMAIL and LOCAL_TEST_ACCOUNT_PASSWORD (${testInfo.project.name})`
      )
    }

    await use({ email, password })
  },
  page: async ({ page }, use) => {
    await use(page)

    const logoutResponse = await page.evaluate(async () => {
      const response = await fetch('/api/authentication/logout', {
        method: 'DELETE',
        credentials: 'same-origin'
      })
      return response.status
    })
    expect([204, 401]).toContain(logoutResponse)
  }
})

export { expect }
