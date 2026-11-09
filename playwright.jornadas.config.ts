/**
 * Jornadas de ponta a ponta (Frente 1.6, passo A03): build de demonstração servido
 * por `vite preview`, em desktop e celular, tema claro e escuro.
 * Uso: npx vite build && npx playwright test -c playwright.jornadas.config.ts
 */
import { defineConfig, devices } from '@playwright/test'

const navegador = process.env.PW_CHROMIUM ? { launchOptions: { executablePath: process.env.PW_CHROMIUM } } : {}

export default defineConfig({
  testDir: './e2e',
  testMatch: /jornadas-.*\.spec\.ts/,
  fullyParallel: true,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/jornadas.json' }]],
  use: { baseURL: 'http://localhost:4174/', trace: 'retain-on-failure', acceptDownloads: true, ...navegador },
  projects: [
    { name: 'desktop-claro', use: { ...devices['Desktop Chrome'], colorScheme: 'light' } },
    { name: 'desktop-escuro', use: { ...devices['Desktop Chrome'], colorScheme: 'dark' } },
    { name: 'celular-claro', use: { ...devices['Pixel 7'], colorScheme: 'light' } },
    { name: 'celular-escuro', use: { ...devices['Pixel 7'], colorScheme: 'dark' } },
  ],
  webServer: { command: 'npx vite preview --port 4174 --strictPort', url: 'http://localhost:4174/', reuseExistingServer: true },
})
