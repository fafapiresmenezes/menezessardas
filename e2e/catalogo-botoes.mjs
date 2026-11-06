/**
 * Frente 1.6 · passo A04 · catálogo de todos os botões e links de ação de cada tela.
 * Para cada botão: nome acessível, tela, e o efeito observado ao clicar (navega,
 * baixa arquivo, copia, imprime, abre diálogo, muda a tela, ou nada). Botão sem nome
 * acessível ou sem efeito observável vira achado. Roda no build de demonstração
 * (vite preview na porta 4174) com o banco falso em memória.
 * Uso: node e2e/catalogo-botoes.mjs [saida.json]
 */
import pw from 'playwright'
const { chromium } = pw
import fs from 'node:fs'

const BASE = process.env.BASE ?? 'http://localhost:4174/'
const ROTAS = process.env.ROTAS ? process.env.ROTAS.split(',') : ['inicio','dashboard','meu-dia','imoveis','imoveis/novo','imoveis/importar','imoveis/1','contrato/novo','contrato/1','projetos','agenda','intimacoes','alertas','monitoramento','assistente','consultores','modelos','legislacao','fontes','previsoes','indicadores','relatorios','mercado','horas','honorarios','consumo','fornecedores','fornecedor/1','kyc','compliance','nuvem','trilha','instituto','equipe','settings','administracao','biblioteca','enquetes','perfil-cliente','parte-adversa','laboratorio-admin']
const saida = process.argv[2] ?? 'catalogo-botoes.json'
// FATIA=i/n divide as telas entre n processos paralelos (ex.: FATIA=0/6).
const [fi, fn] = (process.env.FATIA ?? '0/1').split('/').map(Number)
const MINHAS = ROTAS.filter((_, k) => k % fn === fi)

const b = await chromium.launch(process.env.PW_CHROMIUM ? { executablePath: process.env.PW_CHROMIUM } : {})
async function novaPagina() {
  const ctx = await b.newContext({ viewport: { width: 1366, height: 900 }, acceptDownloads: true })
  await ctx.addInitScript(() => {
    try { localStorage.setItem('lsm-boas-vindas-v1', '2026-11-06') } catch { /* */ }
    window.__efeitos = []
    window.print = () => window.__efeitos.push('imprime')
    try { Object.defineProperty(navigator, 'clipboard', { value: { writeText: async () => { window.__efeitos.push('copia') }, write: async () => { window.__efeitos.push('copia') }, readText: async () => '' } }) } catch { /* */ }
    const abrir = window.open; window.open = (...a) => { window.__efeitos.push('abre-janela'); return null }
  })
  await ctx.route('https://placeholder.supabase.co/**', r => {
    const u = new URL(r.request().url()); const m = r.request().method()
    if (m === 'OPTIONS') return r.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': '*' } })
    const um = (r.request().headers()['accept'] ?? '').includes('vnd.pgrst.object')
    const corpo = u.pathname.startsWith('/rest/v1/') && !u.pathname.includes('/rpc/') ? (um ? null : []) : { ok: true }
    return r.fulfill({ status: um ? 406 : 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify(corpo) })
  })
  const p = await ctx.newPage()
  await p.goto(BASE, { waitUntil: 'networkidle' })
  await p.fill('input[type=email]', 'admin@exemplo.com'); await p.fill('input[type=password]', 'senha123')
  await p.click('button[type=submit]'); await p.waitForURL(/#\//); await p.waitForTimeout(600)
  return { ctx, p }
}
const SEL = 'main button:not([disabled]), main [role=button], main a[href^="#"], main a[download], main summary, [role=dialog] button'
async function listar(p) {
  return p.$$eval(SEL, els => els.filter(e => e.offsetParent !== null || e.getClientRects().length).map(e => {
    const lab = e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.innerText) || e.innerText || e.getAttribute('title') || ''
    return { nome: lab.trim().replace(/\s+/g, ' ').slice(0, 80), tag: e.tagName.toLowerCase(), href: e.getAttribute('href') }
  }))
}
const catalogo = []
let { ctx, p } = await novaPagina()
for (const rota of MINHAS) {
  await p.goto(BASE + '?l=' + encodeURIComponent(rota) + '#/' + rota, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(900)
  const botoes = await listar(p)
  // Estado inicial guardado: cada clique parte da mesma tela (preferências salvas por um clique não contaminam o próximo).
  const estado = await p.evaluate(() => JSON.stringify(Object.fromEntries(Object.entries(localStorage))))
  console.log(rota, botoes.length)
  for (let i = 0; i < botoes.length; i++) {
    const bt = botoes[i]
    const item = { tela: rota, ordem: i + 1, nome: bt.nome, tipo: bt.tag, efeito: [], erroJs: null }
    if (!bt.nome) item.efeito.push('SEM NOME ACESSÍVEL')
    if (/sair|excluir|apagar|encerrar|remover/i.test(bt.nome)) { item.efeito.push('não clicado (destrutivo; coberto por teste unitário)'); catalogo.push(item); continue }
    try {
      if (!p.url().startsWith(BASE)) await p.goto(BASE, { waitUntil: 'domcontentloaded' }).catch(() => {}) // um clique anterior pode ter saído do app
      await p.evaluate(e => { localStorage.clear(); for (const [k, v] of Object.entries(JSON.parse(e))) localStorage.setItem(k, v) }, estado)
      // Query antes do # força recarga completa (só mudar o # manteria o estado do React do clique anterior).
      await p.goto(BASE + '?c=' + i + '#/' + rota, { waitUntil: 'networkidle' }).catch(() => {}); await p.waitForTimeout(500)
      // Acha o botão pelo nome e pela ocorrência desse nome (estável mesmo se a tela carregar em outra ordem).
      const ocorr = botoes.slice(0, i).filter(x => x.nome === bt.nome).length
      await p.waitForFunction(([sel, nome, k]) => {
        const nm = e => (e.getAttribute('aria-label') || (e.getAttribute('aria-labelledby') && document.getElementById(e.getAttribute('aria-labelledby'))?.innerText) || e.innerText || e.getAttribute('title') || '').trim().replace(/\s+/g, ' ').slice(0, 80)
        const els = [...document.querySelectorAll(sel)].filter(e => (e.offsetParent !== null || e.getClientRects().length) && nm(e) === nome)
        document.querySelectorAll('[data-cat-alvo]').forEach(e => e.removeAttribute('data-cat-alvo'))
        if (els[k]) { els[k].setAttribute('data-cat-alvo', '1'); els[k].scrollIntoView({ block: 'center' }); return true }
        return false
      }, [SEL, bt.nome, ocorr], { timeout: 4000 })
      const alvo = p.locator('[data-cat-alvo]')
      const antes = { url: p.url(), html: await p.locator('main').innerHTML().catch(() => '') }
      const erros = []; const onErr = e => erros.push(e.message); p.on('pageerror', onErr)
      const dl = p.waitForEvent('download', { timeout: 1200 }).then(d => 'baixa ' + d.suggestedFilename()).catch(() => null)
      const dlg = p.waitForEvent('dialog', { timeout: 1200 }).then(async d => { const t = 'confirma: ' + d.message().slice(0, 60); await d.dismiss(); return t }).catch(() => null)
      const pop = ctx.waitForEvent('page', { timeout: 1200 }).then(async np => { const u = np.url(); await np.close(); return 'abre ' + u.slice(0, 60) }).catch(() => null)
      await alvo.click({ timeout: 3000 })
      await p.waitForTimeout(700)
      const [d1, d2, d3] = await Promise.all([dl, dlg, pop])
      const ef = await p.evaluate(() => window.__efeitos || [])
      const depois = { url: p.url(), html: await p.locator('main').innerHTML().catch(() => ''), dialogo: await p.locator('[role=dialog]').count() }
      p.off('pageerror', onErr)
      if (d1) item.efeito.push(d1); if (d2) item.efeito.push(d2); if (d3) item.efeito.push(d3)
      item.efeito.push(...new Set(ef))
      if (depois.url.split('?')[0] !== antes.url.split('?')[0] || depois.url.split('#')[1]?.split('?')[0] !== antes.url.split('#')[1]?.split('?')[0]) item.efeito.push('navega ' + (depois.url.split('#')[1] ?? ''))
      else if (depois.dialogo) item.efeito.push('abre diálogo')
      else if (depois.html !== antes.html) item.efeito.push('muda a tela')
      if (!item.efeito.length) item.efeito.push('SEM EFEITO OBSERVÁVEL')
      if (erros.length) item.erroJs = erros[0]
    } catch (e) { item.efeito.push('FALHA AO CLICAR: ' + e.message.split('\n')[0].slice(0, 120)) }
    catalogo.push(item)
  }
  fs.writeFileSync(saida, JSON.stringify(catalogo, null, 1))
}
await b.close()
fs.writeFileSync(saida, JSON.stringify(catalogo, null, 1))
const achados = catalogo.filter(c => c.erroJs || c.efeito.some(e => /^(SEM|FALHA)/.test(e)))
console.log('botões', catalogo.length, 'achados', achados.length)
for (const a of achados) console.log(' -', a.tela, '|', a.nome || '(sem nome)', '|', a.efeito.join('; '), a.erroJs ? '| JS: ' + a.erroJs : '')
