import { test, expect } from './fixtures'

test.describe('critical anonymous and authentication journeys', () => {
  test('renders the anonymous login shell and its client-side validation state', async ({ page }) => {
    await page.goto('/login')

    await expect(page.getByRole('heading', { name: 'Piacere di averti qui.' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Registrati' })).toBeVisible()

    await page.getByLabel('Indirizzo e-mail').fill('not-an-email')
    await expect(page.getByRole('button', { name: /Continua con l. e-mail inserita/ })).toBeDisabled()
  })

  test('completes the login-to-MFA handoff and session activation', async ({ mfaPage }) => {
    await mfaPage.goto('/login')
    await mfaPage.getByLabel('Indirizzo e-mail').fill('qa@example.test')
    await mfaPage.getByRole('button', { name: /Continua con l. e-mail inserita/ }).click()
    await expect(mfaPage.getByLabel('Password')).toBeVisible()
    await mfaPage.getByLabel('Password').fill('fixture-password')
    await mfaPage.getByRole('button', { name: 'Accedi al tuo account' }).click()

    await expect(mfaPage).toHaveURL(/\/login\/mfa\/EMAIL_OTP$/)
    await mfaPage.getByLabel('Codice monouso').fill('123456')
    await mfaPage.getByRole('button', { name: 'Verifica' }).click()
    await expect(mfaPage).toHaveURL(/\/profile\/dashboard$/)
  })
})

test.describe('critical molecule and collection workflow', () => {
  test('shows the deterministic empty state and creates a collection', async ({ authenticatedPage }) => {
    await authenticatedPage.goto('/login')
    await authenticatedPage.getByLabel('Indirizzo e-mail').fill('qa@example.test')
    await authenticatedPage.getByRole('button', { name: /Continua con l. e-mail inserita/ }).click()
    await authenticatedPage.getByLabel('Password').fill('fixture-password')
    await authenticatedPage.getByRole('button', { name: 'Accedi al tuo account' }).click()
    await authenticatedPage.goto('/molecules/collections')

    await expect(authenticatedPage.getByRole('heading', { name: 'Le mie collezioni molecolari' })).toBeVisible()
    await expect(authenticatedPage.getByRole('status')).toContainText('Nessuna collezione molecolare.')

    await authenticatedPage.getByRole('button', { name: 'Crea una o più nuove collezioni' }).click()
    await authenticatedPage.getByLabel('Nome nuova collezione').fill('QA smoke collection')
    await authenticatedPage.getByRole('button', { name: 'Aggiungi' }).click()
    await expect(authenticatedPage.getByRole('listitem', { name: 'QA smoke collection' })).toBeVisible()
    await authenticatedPage.getByRole('button', { name: 'Crea le collezioni' }).click()

    await expect(authenticatedPage.getByText('QA smoke collection')).toBeVisible()
  })
})
