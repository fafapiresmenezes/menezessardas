// Teste no navegador contra a produção: usa o Assistente e confere que o gasto aparece no painel Consumo.
import { chromium } from 'playwright'
const BASE = 'https://menezes-sardas-contratos.vercel.app/'
const out = []; const log = (t, ok, d = '') => out.push({ t, ok, d: String(d).slice(0, 400) })
const b = await chromium.launch()
const p = await (await b.newContext({ viewport: { width: 1366, height: 850 } })).newPage()
const erros = []
p.on('pageerror', e => erros.push(e.message))
p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url().slice(0, 120)}`) })
await p.goto(BASE + '?v=' + Date.now(), { waitUntil: 'networkidle' })
await p.fill('input[type=email]', process.env.EMAIL); await p.fill('input[type=password]', process.env.SENHA)
await p.click('button[type=submit]'); await p.waitForTimeout(4000)
for (const t of ['Pular', 'Fechar', 'Agora não']) { const x = p.getByRole('button', { name: t }); if (await x.count()) await x.first().click().catch(() => {}) }
try {
  await p.goto(BASE + '#/assistente', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.locator('textarea').first().fill('Qual o prazo da ação renovatória?')
  await p.locator('button:has(svg.lucide-send)').first().click(); await p.waitForTimeout(1500)
  await p.waitForFunction(() => !/lendo a lei e preparando/i.test(document.body.innerText), null, { timeout: 150000 })
  log('Assistente respondeu', true)
} catch (e) { log('Assistente', false, e.message) }
try {
  await p.goto(BASE + '#/consumo', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  const total = await p.locator('[data-testid=total-mes]').innerText()
  const txt = await p.evaluate(() => document.querySelector('main')?.innerText ?? document.body.innerText)
  log('Consumo mostra gasto em reais', /R\$\s*0,0*[1-9]|R\$\s*[1-9]/.test(total), total)
  log('Consumo por usuário', txt.includes(process.env.EMAIL), txt.slice(0, 900))
  const bg = await p.evaluate(() => getComputedStyle(document.querySelector('button')).backgroundColor)
  log('Visual (CSS) carregado', bg !== 'rgba(0, 0, 0, 0)' && bg !== 'rgb(239, 239, 239)', bg)
  await p.fill('#teto', '0.0001'); await p.getByRole('button', { name: 'Salvar teto' }).click(); await p.waitForTimeout(2500)
  const t2 = await p.evaluate(() => document.body.innerText)
  log('Teto atingido aparece', /Teto do mês atingido/.test(t2))
  await p.fill('#teto', ''); await p.getByRole('button', { name: 'Salvar teto' }).click(); await p.waitForTimeout(2000)
  log('Teto removido', /Teto removido/.test(await p.evaluate(() => document.body.innerText)))
  await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(500)
  log('Celular sem rolagem lateral', await p.evaluate(() => document.documentElement.scrollWidth <= 392))
} catch (e) { log('Consumo', false, e.message) }
log('Sem erros de página/HTTP', erros.length === 0, erros.join(' | '))
console.log(JSON.stringify(out, null, 1)); await b.close()
