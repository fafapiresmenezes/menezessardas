// U17: Playwright + axe-core + Lighthouse em todas as páginas do Instituto (cópia local idêntica à de produção, conferida por md5).
import pw from '/opt/node-tools/node_modules/playwright/index.js'; const { chromium } = pw
import { readFileSync, writeFileSync } from 'fs'
import lighthouse from 'lighthouse'
const BASE = 'http://127.0.0.1:8765'
const PAGINAS = ['/', '/laboratorio.html', '/placar.html', '/comparar.html', '/ontologia.html', '/locacao.html', '/agentes.html', '/estudar.html', '/precos.html', '/servicos.html']
const axe = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const out = []
const browser = await chromium.launch({ args: ['--remote-debugging-port=9333'] })
for (const p of PAGINAS) {
  const ctx = await browser.newContext({ bypassCSP: true, viewport: { width: 390, height: 844 } })
  const pg = await ctx.newPage(); const erros = []
  pg.on('pageerror', e => erros.push('js: ' + e.message))
  pg.on('console', m => { if (m.type() === 'error') erros.push('console: ' + m.text().slice(0, 120)) })
  const r = await pg.goto(BASE + p, { waitUntil: 'load' })
  await pg.waitForTimeout(800)
  const larg = await pg.evaluate(() => document.documentElement.scrollWidth)
  const css = await pg.evaluate(() => getComputedStyle(document.body).fontFamily)
  await pg.addScriptTag({ content: axe })
  const res = await pg.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'] }))
  out.push({ pagina: p, http: r.status(), overflow_390: larg > 390 ? larg : 0, fonte: css.split(',')[0], erros_js: erros.filter(e => !/supabase|Failed to load resource|ERR_|fetch/i.test(e)), erros_rede_esperados: erros.filter(e => /supabase|Failed to load resource|ERR_|fetch/i.test(e)).length,
    axe: res.violations.map(v => ({ id: v.id, impacto: v.impact, n: v.nodes.length, alvo: v.nodes.slice(0, 2).map(n => n.target.join(' ')) })) })
  await ctx.close()
}
for (const o of out) {
  const lh = await lighthouse(BASE + o.pagina, { port: 9333, output: 'json', logLevel: 'error', onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'] })
  const c = lh.lhr.categories
  o.lighthouse = Object.fromEntries(Object.entries(c).map(([k, v]) => [k, Math.round(v.score * 100)]))
  o.lcp_ms = Math.round(lh.lhr.audits['largest-contentful-paint'].numericValue); o.cls = lh.lhr.audits['cumulative-layout-shift'].numericValue
  o.falhas_lh = Object.values(lh.lhr.audits).filter(a => a.score !== null && a.score < 0.9 && a.scoreDisplayMode === 'binary').map(a => a.id).slice(0, 8)
}
await browser.close()
writeFileSync('resultado.json', JSON.stringify(out, null, 1))
for (const o of out) console.log(o.pagina, o.http, 'axe', o.axe.length, JSON.stringify(o.lighthouse), 'lcp', o.lcp_ms, 'ovf', o.overflow_390, 'js', o.erros_js.length, o.falhas_lh.join(','))
