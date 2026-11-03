// D04: mede sem pessoas o que dá (heurísticas automatizáveis, WCAG, legibilidade, alvo de toque, profundidade de clique, tempo de carga)
import { createRequire } from 'module'; import { writeFileSync } from 'fs'
const require = createRequire(import.meta.url); const { chromium } = require('playwright')
const B = process.env.BASE || 'http://localhost:8765'
const P = ['/', '/laboratorio.html', '/placar.html', '/comparar.html', '/ontologia.html', '/locacao.html', '/agentes.html', '/estudar.html', '/precos.html', '/servicos.html', '/privacidade.html', '/modelo.html', '/dados.html', '/negocio.html', '/okr.html', '/legislacao.html']
const silabas = w => Math.max(1, (w.toLowerCase().match(/[aeiouáéíóúâêôãõà]+/g) || []).length)
const br = await chromium.launch(process.env.PW_EXEC ? { executablePath: process.env.PW_EXEC } : {})
const out = []; const links = {}
for (const vw of [{ width: 390, height: 844 }]) {
  const ctx = await br.newContext({ viewport: vw })
  for (const p of P) {
    const pg = await ctx.newPage(); const t0 = Date.now()
    await pg.goto(B + p, { waitUntil: 'load' }); const carga = Date.now() - t0
    const r = await pg.evaluate(() => {
      const txt = [...document.querySelectorAll('main p, main li, main dd, p, li')].map(e => e.innerText).join(' ')
      const alvos = [...document.querySelectorAll('a, button, input, select, textarea')].filter(e => e.offsetParent)
      const pequenos = alvos.filter(e => { const b = e.getBoundingClientRect(); return (b.width < 24 || b.height < 24) && !e.closest('p, li, dd, td') }).length
      const fs = parseFloat(getComputedStyle(document.body).fontSize)
      return { txt, alvos: alvos.length, pequenos, fs, h1: document.querySelectorAll('h1').length, nav: !!document.querySelector('nav'), titulo: document.title,
        voltar: !!document.querySelector('a[href="/"]'), hrefs: [...document.querySelectorAll('a[href^="/"]')].map(a => a.getAttribute('href').split('#')[0].split('?')[0]) }
    })
    const frases = Math.max(1, (r.txt.match(/[.!?](\s|$)/g) || []).length); const pal = r.txt.split(/\s+/).filter(w => /\p{L}/u.test(w))
    const sil = pal.reduce((s, w) => s + silabas(w), 0)
    const flesch = Math.round(248.835 - 1.015 * (pal.length / frases) - 84.6 * (sil / Math.max(1, pal.length))) // Flesch-Martins (pt-BR)
    links[p] = [...new Set(r.hrefs.map(h => h === '' ? '/' : h))]
    out.push({ pagina: p, carga_ms: carga, palavras: pal.length, flesch_pt: flesch, alvos: r.alvos, alvos_menores_24px: r.pequenos, fonte_px: r.fs, h1: r.h1, nav: r.nav, link_inicio: r.voltar, titulo: r.titulo })
    await pg.close()
  }
}
// profundidade de clique a partir da página inicial (BFS)
const prof = { '/': 0 }, fila = ['/']
while (fila.length) { const a = fila.shift(); for (const b of links[a] || []) if (!(b in prof) && P.includes(b)) { prof[b] = prof[a] + 1; fila.push(b) } }
for (const o of out) o.cliques_desde_inicio = prof[o.pagina] ?? null
writeFileSync(process.env.SAIDA || 'd04-resultado.json', JSON.stringify(out, null, 1)); console.table(out.map(({ titulo, ...o }) => o)); await br.close()
