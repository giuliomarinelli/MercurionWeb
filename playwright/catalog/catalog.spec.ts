import { expect, test } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Mercurion UI Catalog' })).toBeVisible();
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  });
  await page.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all(
      [...document.fonts]
        .filter(font => font.status === 'loading')
        .map(font => font.loaded),
    );
  });
});

test('light theme canonical primitive matrix', async ({ page }) => {
  await expect(page).toHaveScreenshot('catalog-light-desktop.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
});

test('dark theme canonical primitive matrix', async ({ page }) => {
  await page.getByRole('button', { name: 'Use dark theme' }).click();
  await expect(page.locator('.catalog-shell')).toHaveClass(/dark/);
  await expect(page).toHaveScreenshot('catalog-dark-desktop.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
});

test('mobile responsive primitive matrix', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page).toHaveScreenshot('catalog-light-mobile.png', {
    fullPage: true,
    animations: 'disabled',
    caret: 'hide',
    scale: 'css',
  });
});
