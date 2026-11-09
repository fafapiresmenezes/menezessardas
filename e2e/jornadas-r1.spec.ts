/**
 * Frente 1.6 · passo A03 · 15 jornadas completas de ponta a ponta (Régua Global R1).
 * Rodam no build de demonstração (sem VITE_SUPABASE_*), com banco falso em memória
 * para as telas que gravam dados. Cada jornada roda em 4 combinações: desktop e
 * celular, tema claro e escuro (ver playwright.jornadas.config.ts). Dados fictícios.
 * Cada jornada falha se houver erro de JavaScript na página.
 */
import { test, expect, type Page } from '@playwright/test'
import { instalarBancoFalso } from './apoio/supabase-falso'

const errosJs = new WeakMap<Page, string[]>()

test.beforeEach(async ({ page }) => {
  const erros: string[] = []
  errosJs.set(page, erros)
  page.on('pageerror', e => erros.push(e.message))
  await instalarBancoFalso(page)
  // Pessoa que já viu a apresentação inicial (a apresentação tem teste próprio).
  await page.addInitScript(() => { try { localStorage.setItem('lsm-boas-vindas-v1', '2026-11-06') } catch { /* sem armazenamento */ } })
  await page.goto('./')
  await page.getByLabel(/e-mail/i).first().fill('admin@exemplo.com')
  await page.getByLabel(/senha/i).first().fill('senha123')
  await page.locator('button[type=submit]').click()
  await expect(page).toHaveURL(/#\/(inicio|dashboard|meu-dia)/)
  await fecharApresentacao(page)
})

test.afterEach(async ({ page }) => {
  expect(errosJs.get(page), 'erros de JavaScript na jornada').toEqual([])
})

async function fecharApresentacao(page: Page) {
  const fechar = page.getByRole('button', { name: 'Fechar apresentação' })
  if (await fechar.isVisible().catch(() => false)) await fechar.click()
}
async function ir(page: Page, rota: string) {
  await page.goto(`./#/${rota}`)
  await fecharApresentacao(page)
}
const botao = (page: Page, nome: string | RegExp) => page.getByRole('button', { name: nome }).first()
async function marcar(page: Page, valor: string) {
  await page.locator(`input[value="${valor}"]`).first().check({ force: true })
}

test('J01 cadastrar imóvel em 6 passos e encontrá-lo na carteira', async ({ page }) => {
  await ir(page, 'imoveis/novo')
  await marcar(page, 'apartamento'); await botao(page, /continuar/i).click()
  await marcar(page, 'vago'); await botao(page, /continuar/i).click()
  await marcar(page, 'RJ'); await botao(page, /continuar/i).click()
  await page.locator('#endereco, [aria-label="Endereço completo"]').first().or(page.getByLabel(/endereço completo/i)).first().fill('Rua Jornada Teste 101, Lagoa')
  await page.getByLabel(/^cidade/i).first().fill('Rio de Janeiro')
  await page.getByLabel(/proprietário/i).first().fill('Cliente Fictício J01')
  await page.getByLabel(/matrícula/i).first().fill('99.001')
  await botao(page, /continuar/i).click()
  await botao(page, /continuar/i).click()
  await botao(page, /concluir/i).click()
  await expect(page).toHaveURL(/#\/imoveis$/)
  await page.getByLabel(/buscar imóvel/i).fill('Jornada Teste')
  await expect(page.getByText('Rua Jornada Teste 101, Lagoa').first()).toBeVisible()
})

test('J02 cadastrar contrato de locação residencial para um imóvel da carteira', async ({ page }) => {
  await ir(page, 'contrato/novo')
  await botao(page, /^continuar$/i).click()
  await marcar(page, 'locacao_residencial'); await botao(page, /continuar/i).click()
  await page.getByLabel(/locatário/i).first().fill('Locatário Fictício J02')
  await botao(page, /continuar/i).click()
  await page.locator('#valor').fill('4500')
  await botao(page, /continuar/i).click()
  await botao(page, /continuar/i).click()
  await expect(page.getByText('Locatário Fictício J02').first()).toBeVisible()
  await botao(page, /concluir/i).click()
  await expect(page.getByText('Locatário Fictício J02').first()).toBeVisible()
})

test('J03 calcular o reajuste do contrato pelo índice oficial', async ({ page }) => {
  await ir(page, 'contrato/1')
  await botao(page, /calcular reajuste/i).click()
  await expect(page.getByText(/reajust/i).nth(1)).toBeVisible()
  await expect(page.getByText(/R\$\s?\d/).first()).toBeVisible()
})

test('J04 cadastrar OABs para a captura diária de intimações', async ({ page }) => {
  await ir(page, 'intimacoes')
  const campo = page.getByLabel(/OABs do escritório/i)
  await campo.fill('123456/RJ, 98765/RJ')
  await botao(page, /salvar oabs/i).click()
  await expect(campo).toHaveValue(/123456\/RJ/)
  await expect(page.getByRole('alert').filter({ hasText: /erro|falh/i })).toHaveCount(0)
})

test('J05 criar um caso a partir de modelo, com etapas e prazos', async ({ page }) => {
  await ir(page, 'projetos')
  await page.getByLabel('Nome do caso').fill('Caso Fictício J05')
  await page.getByTestId('criar-caso').click()
  const projeto = page.getByLabel('Projeto')
  await expect(projeto.locator('option:checked')).toHaveText('Caso Fictício J05')
  await expect(page.getByText(/caminho crítico/i).first()).toBeVisible()
  await expect(page.getByText('NaN')).toHaveCount(0)
})

test('J06 exportar a agenda para o Outlook/Google (arquivo iCal)', async ({ page }) => {
  await ir(page, 'agenda')
  const baixa = page.waitForEvent('download')
  await botao(page, /exportar ical/i).click()
  expect((await baixa).suggestedFilename()).toMatch(/\.ics$/)
})

test('J07 filtrar alertas vencidos e baixar a lista em planilha', async ({ page }) => {
  await ir(page, 'alertas')
  await botao(page, /vencidos/i).click()
  const baixa = page.waitForEvent('download')
  await botao(page, /baixar csv/i).click()
  expect((await baixa).suggestedFilename()).toMatch(/\.csv$/)
})

test('J08 achar um modelo de peça e abrir para usar', async ({ page }) => {
  await ir(page, 'modelos')
  await page.getByLabel(/procurar modelo/i).fill('despejo')
  await page.getByRole('button', { name: /ação de despejo/i }).first().click()
  await expect(page.getByText(/despejo/i).nth(1)).toBeVisible()
})

test('J09 fazer uma pergunta ao assistente jurídico', async ({ page }) => {
  await ir(page, 'assistente')
  await page.getByLabel('Pergunta', { exact: true }).first().fill('Posso reajustar o aluguel antes de 12 meses?')
  await page.getByRole('button', { name: /^perguntar$/i }).last().click()
  await expect(page.getByText('Resposta direta').first()).toBeVisible()
  await expect(page.getByText(/Fontes consultadas/).first()).toBeVisible()
  await expect(page.getByRole('button', { name: 'Copiar resposta' }).first()).toBeVisible()
})

test('J10 responder o diagnóstico de compliance e ver a nota', async ({ page }) => {
  await ir(page, 'compliance')
  await page.getByLabel(/empresa avaliada/i).fill('Empresa Fictícia J10 Ltda')
  const sim = page.getByRole('radio', { name: 'Sim', exact: true })
  const n = await sim.count()
  for (let i = 0; i < n; i++) await sim.nth(i).click()
  await expect(page.getByText(/%|nota|pontua/i).first()).toBeVisible()
})

test('J11 abrir o cadastro de novo fornecedor', async ({ page }) => {
  await ir(page, 'fornecedores')
  await botao(page, /novo fornecedor/i).click()
  await expect(page.getByLabel(/cnpj/i).first()).toBeVisible()
})

test('J12 ajustar preferências de aviso e salvar', async ({ page }) => {
  await ir(page, 'settings')
  await page.getByLabel(/antecedência dos alertas/i).fill('45')
  await botao(page, /salvar preferências/i).click()
  await expect(page.getByText(/salv/i).nth(1)).toBeVisible()
})

test('J13 baixar o relatório do período em planilha', async ({ page }) => {
  await ir(page, 'relatorios')
  const baixa = page.waitForEvent('download')
  await botao(page, /^baixar csv$/i).click()
  expect((await baixa).suggestedFilename()).toMatch(/\.csv$/)
})

test('J14 lançar horas trabalhadas para um cliente', async ({ page }) => {
  await ir(page, 'horas')
  await page.getByTestId('h-cliente').fill('Cliente Fictício J14')
  await page.getByTestId('h-horas').fill('2')
  await page.getByTestId('h-desc').fill('Revisão de contrato de locação (teste)')
  await page.getByTestId('h-salvar').click()
  await expect(page.getByText('Revisão de contrato de locação (teste)').first()).toBeVisible()
  await expect(page.getByText(/2h00/).first()).toBeVisible()
})

test('J15 ficha do imóvel: ver contratos e documentos e voltar à carteira', async ({ page }) => {
  await ir(page, 'imoveis')
  await page.getByRole('link', { name: /ver detalhes de av\. paulista 1000/i }).or(page.getByRole('button', { name: /ver detalhes de av\. paulista 1000/i })).first().click()
  await expect(page).toHaveURL(/#\/imoveis\/\w+/)
  await expect(page.getByRole('heading', { name: 'Contrato vigente' })).toBeVisible()
  await expect(page.getByText('Matrícula').first()).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Imóveis', exact: true }).first().click()
  await expect(page).toHaveURL(/#\/imoveis$/)
})
