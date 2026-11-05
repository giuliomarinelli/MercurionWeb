import { expect, test } from '@playwright/test'
import { join } from 'node:path'
import { emailPreviewFixtures } from '../../scripts/email-preview-fixtures.mjs'
import { EMAIL_TEMPLATE_REGISTRY, assertEmailTemplateContext } from '../../MercurionWebNode/src/app_modules/notification/email-template-registry'
import { DeterministicHandlebarsAdapter } from '../../MercurionWebNode/src/app_modules/notification/email-templates/deterministic-handlebars.adapter'

const templateRoot = join(__dirname, '../../MercurionWebNode/src/app_modules/notification/email-templates')
const previews = []

test.beforeAll(async () => {
  const adapter = new DeterministicHandlebarsAdapter(templateRoot)
  for (const [key, definition] of Object.entries(EMAIL_TEMPLATE_REGISTRY)) {
    const context = emailPreviewFixtures[key]
    assertEmailTemplateContext(key, context)
    const mail = { data: { template: definition.asset, context } }
    await new Promise((resolve, reject) => {
      adapter.compile(mail, error => error ? reject(error) : resolve(), {
        template: { dir: templateRoot, options: { strict: true } },
        options: { partials: { dir: templateRoot } },
      })
    })
    previews.push({ key, html: mail.data.html, url: context.url ?? null })
  }
})

// Runs inside the browser against computed styles, including inline CSS.
function measureEmail() {
  const rgb = color => color.match(/[\d.]+/g).slice(0, 3).map(Number)
  const luminance = color => rgb(color).map(channel => {
    const value = channel / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  }).reduce((sum, value, index) => sum + value * [0.2126, 0.7152, 0.0722][index], 0)
  const contrast = (foreground, background) => {
    const a = luminance(foreground)
    const b = luminance(background)
    return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
  }
  const text = [...document.querySelectorAll('h1,p,li,.footer,.btn-primary')]
    .filter(element => element.getBoundingClientRect().height > 0)
    .map(element => {
      let background = element
      while (background && getComputedStyle(background).backgroundColor === 'rgba(0, 0, 0, 0)') {
        background = background.parentElement
      }
      return {
        contrast: contrast(
          getComputedStyle(element).color,
          background ? getComputedStyle(background).backgroundColor : 'rgb(255,255,255)',
        ),
        overflow: element.scrollWidth > element.clientWidth + 1,
      }
    })
  const cta = document.querySelector('.btn-primary')
  return {
    overflow: document.documentElement.scrollWidth > innerWidth || text.some(item => item.overflow),
    contrast: Math.min(...text.map(item => item.contrast)),
    ctaHeight: cta?.getBoundingClientRect().height ?? null,
    url: cta?.href ?? null,
  }
}

for (const colorScheme of ['light', 'dark']) {
  for (const width of [320, 375, 768, 1280]) {
    test(`email layout: ${colorScheme}, ${width}px`, async ({ page }) => {
      await page.route('**/*', route => route.abort())
      await page.emulateMedia({ colorScheme })
      await page.setViewportSize({ width, height: 812 })
      for (const preview of previews) {
        await test.step(preview.key, async () => {
          await page.setContent(preview.html)
          const result = await page.evaluate(measureEmail)
          expect(result.overflow).toBe(false)
          expect(result.contrast).toBeGreaterThanOrEqual(4.5)
          expect(result.url).toBe(preview.url)
          if (result.ctaHeight !== null) expect(result.ctaHeight).toBeGreaterThanOrEqual(44)
        })
      }
    })
  }
}

test('email fallback keeps readable content and CTA without style tags', async ({ page }) => {
  await page.route('**/*', route => route.abort())
  await page.emulateMedia({ colorScheme: 'light' })
  await page.setViewportSize({ width: 375, height: 812 })
  for (const preview of previews) {
    await test.step(preview.key, async () => {
      await page.setContent(preview.html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ''))
      const result = await page.evaluate(measureEmail)
      expect(result.overflow).toBe(false)
      expect(result.contrast).toBeGreaterThanOrEqual(4.5)
      expect(result.url).toBe(preview.url)
      if (result.ctaHeight !== null) expect(result.ctaHeight).toBeGreaterThanOrEqual(44)
    })
  }
})

test('email CTA retains visible keyboard focus', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setContent(previews.find(preview => preview.key === 'forgotten-password').html)
  await page.keyboard.press('Tab')
  const cta = page.getByRole('link', { name: 'Imposta una nuova password' })
  await expect(cta).toBeFocused()
  const outline = await cta.evaluate(element => ({
    width: getComputedStyle(element).outlineWidth,
    style: getComputedStyle(element).outlineStyle,
  }))
  expect(outline).toEqual({ width: '2px', style: 'solid' })
})

test('email measurements detect unreadable OTP and horizontal overflow', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.setViewportSize({ width: 320, height: 812 })
  await page.setContent(previews.find(preview => preview.key === 'mfa-login-code').html)
  await page.locator('.otp-code').evaluate(element => {
    element.style.setProperty('color', '#111827', 'important')
  })
  expect((await page.evaluate(measureEmail)).contrast).toBeLessThan(4.5)
  await page.locator('.email-wrapper').evaluate(element => {
    element.style.setProperty('min-width', '700px', 'important')
  })
  expect((await page.evaluate(measureEmail)).overflow).toBe(true)
})
