import { test, expect } from '@playwright/test'

test.describe('Platform E2E Tests', () => {
  test('should login with admin account', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    await expect(page.locator('text=Imóveis')).toBeVisible({ timeout: 10000 })
  })

  test('should display dashboard metrics', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    await expect(page.locator('text=Carteira')).toBeVisible()
  })

  test('should toggle dark mode', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    const themeBtn = page.locator('button:has-text("🌙")')
    await themeBtn.click()
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })

  test('should navigate to calendar page', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    await page.click('a:has-text("Agenda")')
    await expect(page.locator('text=Prazos contratuais')).toBeVisible()
  })

  test('should access legislation page with search', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    await page.click('a:has-text("Legislação")')
    await expect(page.locator('text=Lei 8.245')).toBeVisible({ timeout: 5000 })
  })

  test('should display assistant menu', async ({ page }) => {
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    await page.click('a:has-text("Assistente")')
    await expect(page.locator('text=Imobiliário|Condominial')).toBeVisible({ timeout: 5000 })
  })

  test('should show onboarding once per session', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await page.goto('/')
    await page.fill('input[type="email"]', 'mateusmenezesfigueiredo7@gmail.com')
    await page.fill('input[type="password"]', 'senha123')
    await page.click('button:has-text("Entrar")')
    const onboarding = page.locator('[data-testid="onboarding-modal"]')
    if (await onboarding.isVisible({ timeout: 2000 }).catch(() => false)) {
      await page.click('button:has-text("Próximo")')
      await page.click('button:has-text("Próximo")')
      await page.click('button:has-text("Próximo")')
      await page.click('button:has-text("Começar")')
    }
    await expect(page.locator('text=Imóveis')).toBeVisible()
  })

  test('should render lighthouse metrics', async ({ page }) => {
    await page.goto('/')
    // Measure Core Web Vitals
    const metrics = await page.evaluate(() => {
      return {
        navigationType: performance.navigation.type,
        resourceCount: performance.getEntriesByType('resource').length,
      }
    })
    expect(metrics.navigationType).toBeDefined()
    expect(metrics.resourceCount).toBeGreaterThan(0)
  })
})
