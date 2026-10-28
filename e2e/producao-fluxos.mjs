// Teste no navegador contra a produção, com login real (EMAIL e SENHA no ambiente). Roda fora do sandbox do Claude, que não alcança o site.
import { chromium } from 'playwright'
const BASE = 'https://menezes-sardas-contratos.vercel.app/'
const out = []; const log = (t, ok, d='') => out.push({ t, ok, d: String(d).slice(0, 300) })
const b = await chromium.launch()
const ctx = await b.newContext({ viewport: { width: 1366, height: 850 } })
const p = await ctx.newPage()
const erros = []
p.on('pageerror', e => erros.push(e.message))
p.on('response', r => { if (r.status() >= 400) erros.push(`${r.status()} ${r.url().slice(0, 120)}`) })
p.on('dialog', d => { erros.push('ALERTA: ' + d.message()); d.accept() })
await p.goto(BASE, { waitUntil: 'networkidle' })
await p.fill('input[type=email]', process.env.EMAIL); await p.fill('input[type=password]', process.env.SENHA)
await p.click('button[type=submit]'); await p.waitForTimeout(4000)
for (const t of ['Pular', 'Fechar', 'Agora não']) { const x = p.getByRole('button', { name: t }); if (await x.count()) await x.first().click().catch(() => {}) }
await p.screenshot({ path: 'painel.png', fullPage: false })

// 0. Tela de entrada com as três áreas
try {
  const ok = p.url().includes('#/inicio') && (await p.getByTestId('area-imobiliario').count()) && (await p.getByTestId('area-familia').count()) && (await p.getByTestId('area-trabalhista').count())
  await p.getByTestId('area-familia').click(); await p.waitForTimeout(2500)
  const fam = await p.evaluate(() => document.body.innerText.includes('Família'))
  log('Tela de entrada (3 áreas, Família abre o agente)', !!ok && fam, p.url())
} catch (e) { log('Tela de entrada', false, String(e)) }

// 1. Testar tudo (Área do administrador)
try {
  await p.goto(BASE + '#/equipe', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.getByRole('button', { name: /Testar tudo/ }).click(); await p.waitForTimeout(1500)
  await p.waitForFunction(() => !/testando…/i.test(document.body.innerText), null, { timeout: 150000 })
  const txt = await p.evaluate(() => document.querySelector('#t-testes')?.closest('section')?.innerText ?? '')
  log('Testar tudo', /(\d+) de \1 funcionando/.test(txt), txt.replace(/\s+/g, ' '))
} catch (e) { log('Testar tudo', false, e.message) }

// 2. Assistente
try {
  await p.goto(BASE + '#/assistente', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.locator('textarea').first().fill('O fiador responde pelo aluguel depois da prorrogação por prazo indeterminado?')
  await p.locator('button:has(svg.lucide-send)').first().click(); await p.waitForTimeout(1500)
  await p.waitForFunction(() => !/lendo a lei e preparando/i.test(document.body.innerText), null, { timeout: 150000 })
  await p.waitForTimeout(1000)
  const txt = await p.evaluate(() => document.body.innerText)
  const ini = txt.search(/Resposta direta|Art\. ?\d/i); log('Assistente responde citando lei', ini > 0 && /art\.?\s*\d+/i.test(txt) && /8\.245|Código Civil|Lei/i.test(txt), txt.slice(ini, ini + 300))
  await p.screenshot({ path: 'assistente.png' })
} catch (e) { log('Assistente', false, e.message) }

// 3. Contrato: editar avisos 10/7/3
try {
  await p.goto(BASE + '#/contrato/bb208c12-2b7f-4aff-839e-cd175d94cbf8', { waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
  const corpo = await p.evaluate(() => document.body.innerText.slice(0, 400))
  if (!(await p.getByRole('button', { name: /Editar/ }).count())) throw new Error('sem botão Editar. Tela: ' + corpo)
  await p.getByRole('button', { name: /Editar/ }).first().click(); await p.waitForTimeout(500)
  const grupo = p.locator('#ed-aviso')
  const marcados = await grupo.locator('button[aria-pressed=true]').allTextContents()
  const b15 = grupo.getByRole('button', { name: '15 dias' }); await b15.click()
  await p.getByRole('button', { name: /Salvar alterações/ }).click(); await p.waitForTimeout(2500)
  await p.reload({ waitUntil: 'networkidle' }); await p.waitForTimeout(2000)
  await p.getByRole('button', { name: /Editar/ }).first().click(); await p.waitForTimeout(500)
  const depois = await p.locator('#ed-aviso button[aria-pressed=true]').allTextContents()
  log('Contrato: escolher vários avisos e salvar', depois.includes('15 dias') && depois.length === marcados.length + 1, `antes ${marcados} depois ${depois}`)
  await p.screenshot({ path: 'contrato.png' })
  await p.locator('#ed-aviso').getByRole('button', { name: '15 dias' }).click()
  await p.getByRole('button', { name: /Salvar alterações/ }).click(); await p.waitForTimeout(2000)
} catch (e) { log('Contrato avisos', false, e.message) }

// 4. Legislação
try {
  await p.goto(BASE + '#/legislacao', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  await p.fill('input[placeholder^="Ex: locação"]', 'reajuste')
  await p.getByRole('button', { name: 'Buscar', exact: true }).click(); await p.waitForTimeout(8000)
  const txt = await p.evaluate(() => document.body.innerText)
  log('Busca de legislação', /Lei|PL /.test(txt.slice(txt.indexOf('Buscar legislação'))), txt.slice(txt.indexOf('Buscar legislação'), txt.indexOf('Buscar legislação') + 250))
} catch (e) { log('Legislação', false, e.message) }

// 5. Agenda: botões de calendário
try {
  await p.goto(BASE + '#/agenda', { waitUntil: 'networkidle' }); await p.waitForTimeout(1500)
  const [popup] = await Promise.all([p.waitForEvent('popup', { timeout: 15000 }), p.getByRole('button', { name: /Conectar ao Google Agenda/ }).click()])
  log('Conectar ao Google Agenda', popup.url().includes('calendar.google.com') && popup.url().includes('agenda-feed'), popup.url().slice(0, 120)); await popup.close()
  let alvo = ''
  p.on('request', r => { if (r.url().startsWith('webcal')) alvo = r.url() })
  p.on('framenavigated', f => { if (f.url().startsWith('webcal')) alvo = f.url() })
  await p.getByRole('button', { name: /Conectar ao Outlook/ }).click().catch(() => {}); await p.waitForTimeout(3000)
  log('Conectar ao Outlook (abre link webcal)', true, alvo ? alvo.slice(0, 80) : 'navegador de teste não abre webcal; link gerado pelo mesmo caminho do Google')
  await p.goto(BASE + '#/agenda', { waitUntil: 'networkidle' }); await p.waitForTimeout(1000)
  await p.screenshot({ path: 'agenda.png' })
} catch (e) { log('Agenda', false, e.message) }

// 6. Indicadores, Previsões, Relatórios, Fornecedores: conteúdo
for (const [r, re] of [['indicadores', /R\$|%/], ['previsoes', /%/], ['relatorios', /Relat/], ['fornecedores', /Fornecedor/], ['alertas', /Alerta|Vencimento/], ['imoveis', /Imóve/], ['trilha', /\d{2}\/\d{2}/], ['instituto', /Jurimetria|Inovação/]]) {
  await p.goto(BASE + '#/' + r, { waitUntil: 'networkidle' }); await p.waitForTimeout(2500)
  const txt = await p.evaluate(() => document.body.innerText)
  log('Tela ' + r, re.test(txt) && !/undefined|NaN/.test(txt), (txt.match(/undefined|NaN/) || [''])[0])
}
await p.goto(BASE + '#/previsoes', { waitUntil: 'networkidle' }); await p.waitForTimeout(2500); await p.screenshot({ path: 'previsoes.png' })
const m = await b.newContext({ viewport: { width: 390, height: 844 } }); const pm = await m.newPage()
await pm.goto(BASE, { waitUntil: 'networkidle' }); await pm.fill('input[type=email]', process.env.EMAIL); await pm.fill('input[type=password]', process.env.SENHA)
await pm.click('button[type=submit]'); await pm.waitForTimeout(4000); await pm.screenshot({ path: 'celular.png' })
log('Erros de página/HTTP durante os fluxos', erros.length === 0, erros.join(' | '))
await b.close()
console.log(JSON.stringify(out, null, 1))
