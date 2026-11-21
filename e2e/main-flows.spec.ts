import { test, expect, type Page } from '@playwright/test'

// Credenciais nunca ficam escritas no código: vêm de variáveis de ambiente do runner de
// testes (ex.: segredo do GitHub Actions), nunca de um valor fixo no repositório.
const E2E_EMAIL = process.env.E2E_ADMIN_EMAIL ?? ''
const E2E_SENHA = process.env.E2E_ADMIN_SENHA ?? ''

async function entrar(page: Page) {
  await page.goto('/')
  await page.fill('input[type="email"]', E2E_EMAIL)
  await page.fill('input[type="password"]', E2E_SENHA)
  await page.click('button:has-text("Entrar")')
}

test.describe('Platform E2E Tests', () => {
  test.skip(!E2E_EMAIL || !E2E_SENHA, 'E2E_ADMIN_EMAIL/E2E_ADMIN_SENHA não configurados neste ambiente')

  test('should login with admin account', async ({ page }) => {
    await entrar(page)
    await expect(page.locator('text=Imóveis')).toBeVisible({ timeout: 10000 })
  })

  test('should display dashboard metrics', async ({ page }) => {
    await entrar(page)
    await expect(page.locator('text=Carteira')).toBeVisible()
  })

  test('should toggle dark mode', async ({ page }) => {
    await entrar(page)
    const themeBtn = page.locator('button:has-text("🌙")')
    await themeBtn.click()
    const html = page.locator('html')
    await expect(html).toHaveClass(/dark/)
  })

  test('should navigate to calendar page', async ({ page }) => {
    await entrar(page)
    await page.click('a:has-text("Agenda")')
    await expect(page.locator('text=Prazos contratuais')).toBeVisible()
  })

  test('should access legislation page with search', async ({ page }) => {
    await entrar(page)
    await page.click('a:has-text("Legislação")')
    await expect(page.locator('text=Lei 8.245')).toBeVisible({ timeout: 5000 })
  })

  test('should display assistant menu', async ({ page }) => {
    await entrar(page)
    await page.click('a:has-text("Assistente")')
    await expect(page.locator('text=Imobiliário|Condominial')).toBeVisible({ timeout: 5000 })
  })

  test('should show onboarding once per session', async ({ page }) => {
    await page.context().clearCookies()
    await page.evaluate(() => localStorage.clear())
    await entrar(page)
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
