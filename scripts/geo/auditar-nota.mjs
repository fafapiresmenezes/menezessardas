// Auditoria de nota da casa /geo (elo R1 do replano).
// Mede o que dá para medir por máquina: acessibilidade (axe-core), desempenho
// (tempos de carregamento) e tamanho do pacote. Roda contra o build servido
// localmente por `vite preview`. Uso: node scripts/geo/auditar-nota.mjs <baseURL>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { globSync } from 'node:fs'

const base = process.argv[2] || 'http://localhost:4173'
const alvo = `${base}/#/geo`

const exe = process.env.PW_CHROME || undefined // ambiente pode fixar o binário
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(exe ? { executablePath: exe } : {}) })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } }) // celular médio
const t0 = Date.now()
await page.goto(alvo, { waitUntil: 'load', timeout: 60000 })
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const paints = performance.getEntriesByType('paint')
  const fcp = paints.find(p => p.name === 'first-contentful-paint')
  return { domContentLoaded: n?.domContentLoadedEventEnd, load: n?.loadEventEnd, fcp: fcp?.startTime }
})

// axe-core: lê a fonte do pacote (node_modules/axe-core) e injeta por evaluate (ignora a CSP do site)
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
await page.evaluate(axeSrc)
const axe = await page.evaluate(async () => await window.axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] }))
await browser.close()

// tamanho do pacote (dist/assets)
let bundleKB = 0
try {
  for (const f of globSync('dist/assets/*.js')) bundleKB += readFileSync(f).length / 1024
} catch { /* sem glob antigo */ }

const viol = axe.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help }))
const boletim = {
  quando: new Date().toISOString(),
  alvo,
  desempenho: { fcp_ms: Math.round(nav.fcp || 0), domContentLoaded_ms: Math.round(nav.domContentLoaded || 0), load_ms: Math.round(nav.load || 0), total_ms: Date.now() - t0 },
  acessibilidade: { violacoes: viol.length, detalhe: viol, aprovados: axe.passes.length },
  pacote: { js_total_kb: Math.round(bundleKB) },
}
writeFileSync('/mnt/project-files/geo-replano/boletim-nota-R1.json', JSON.stringify(boletim, null, 2))
console.log('FCP(ms):', boletim.desempenho.fcp_ms, '| load(ms):', boletim.desempenho.load_ms, '| axe violações:', viol.length, '| JS(kb):', boletim.pacote.js_total_kb)
for (const v of viol) console.log('  -', v.id, `(${v.impact}, ${v.n} nós):`, v.help)
