// U17 / C30: Playwright + axe-core em todas as páginas do Instituto, celular e computador, claro e escuro.
// Roda a cada push no GitHub Actions (workflow "Site do Instituto: testes") e localmente.
// Falha (exit 1) se alguma página não abrir, ficar sem CSS, tiver erro de JavaScript, rolar para o lado ou violar WCAG 2.2 AA.
// Lighthouse completo fica no workflow diário (lighthouse-diario.mjs); aqui só com LH=1.
import { chromium } from '@playwright/test'
import { readFileSync, writeFileSync, appendFileSync } from 'node:fs'
import { createRequire } from 'node:module'
const require = createRequire(import.meta.url)
const BASE = process.env.SITE || 'http://127.0.0.1:8765'
const PAGINAS = ['/', '/laboratorio.html', '/placar.html', '/comparar.html', '/ontologia.html', '/locacao.html', '/agentes.html',
  '/estudar.html', '/precos.html', '/servicos.html', '/privacidade.html', '/modelo.html', '/dados.html']
const axe = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8')
const out = [], falhas = []
const browser = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {})
for (const largura of [390, 1280]) for (const tema of ['light', 'dark']) {
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: largura, height: 844 }, colorScheme: tema })
  // Sem rede externa no teste: o banco responde vazio, como quando o visitante está sem conexão.
  await ctx.route('**/*.supabase.co/**', r => r.fulfill({ contentType: 'application/json', body: '[]' }))
  for (const p of PAGINAS) {
    const pg = await ctx.newPage(); const erros = []
    pg.on('pageerror', e => erros.push(e.message))
    const r = await pg.goto(BASE + p, { waitUntil: 'load' })
    await pg.waitForTimeout(300)
    const larg = await pg.evaluate(() => document.documentElement.scrollWidth)
    const css = await pg.evaluate(() => [...document.styleSheets].some(s => { try { return s.cssRules.length > 20 } catch { return false } }))
    await pg.addScriptTag({ content: axe })
    const v = await pg.evaluate(async () => (await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] })).violations
      .map(x => ({ id: x.id, n: x.nodes.length, alvo: x.nodes.slice(0, 2).map(n => n.target.join(' ')) })))
    const o = { pagina: p, largura, tema, http: r.status(), css, rolagem_lateral: larg > largura ? larg : 0, erros_js: erros, axe: v }
    out.push(o)
    const k = `${p} @${largura} ${tema}`
    if (o.http !== 200) falhas.push(`${k}: HTTP ${o.http}`)
    if (!css) falhas.push(`${k}: sem CSS`)
    if (o.rolagem_lateral) falhas.push(`${k}: rola para o lado (${larg}px)`)
    if (erros.length) falhas.push(`${k}: erro JS ${erros[0].slice(0, 80)}`)
    for (const x of v) falhas.push(`${k}: axe ${x.id} (${x.n}) ${x.alvo.join(' | ')}`)
    await pg.close()
  }
  await ctx.close()
}
await browser.close()
writeFileSync('resultado-u17.json', JSON.stringify({ quando: new Date().toISOString(), base: BASE, verificacoes: out.length, falhas, out }, null, 1))
const resumo = `## Site do Instituto: ${PAGINAS.length} páginas × 2 larguras × 2 temas = ${out.length} verificações\n\n${falhas.length ? '**Falhas:**\n\n' + falhas.map(f => '- ' + f).join('\n') : 'Tudo certo: HTTP 200, CSS carregado, sem erro de JavaScript, sem rolagem lateral, 0 violação WCAG 2.2 AA.'}\n`
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, resumo)
console.log(resumo)
if (falhas.length) process.exit(1)
