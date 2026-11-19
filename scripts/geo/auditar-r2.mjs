// Auditoria R2 da casa /geo: desempenho + acessibilidade, entrando no cofre e
// medindo CADA aba por dentro com axe-core. Senha de teste, só em localhost,
// sobre a própria aplicação. Uso: node scripts/geo/auditar-r2.mjs <baseURL>
import { chromium } from 'playwright'
import { readFileSync, writeFileSync, globSync } from 'node:fs'

const base = process.argv[2] || 'http://localhost:4173'
const alvo = `${base}/#/geo`
const exe = process.env.PW_CHROME || undefined
const axeSrc = readFileSync('node_modules/axe-core/axe.min.js', 'utf8')
const REGRAS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa']

const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'], ...(exe ? { executablePath: exe } : {}) })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

const rodarAxe = async (nome) => {
  await page.evaluate(axeSrc)
  const r = await page.evaluate(async (regras) => await window.axe.run(document, { runOnly: regras }), REGRAS)
  const viol = r.violations.map(v => ({ id: v.id, impact: v.impact, n: v.nodes.length, help: v.help, alvos: v.nodes.slice(0, 3).map(nd => nd.target.join(' ')) }))
  return { tela: nome, violacoes: viol.length, aprovados: r.passes.length, detalhe: viol }
}

const t0 = Date.now()
await page.goto(alvo, { waitUntil: 'load', timeout: 60000 })
const nav = await page.evaluate(() => {
  const n = performance.getEntriesByType('navigation')[0]
  const fcp = performance.getEntriesByType('paint').find(p => p.name === 'first-contentful-paint')
  return { domContentLoaded: n?.domContentLoadedEventEnd, load: n?.loadEventEnd, fcp: fcp?.startTime }
})

const telas = []
// 1) Porta do cofre
await page.waitForSelector('#senha-geo', { timeout: 20000 })
telas.push(await rodarAxe('porta-do-cofre'))

// 2) Criar/abrir cofre com senha de teste (localhost, app própria)
await page.fill('#senha-geo', 'auditoria-geo-2026')
await page.click('button:has-text("Criar cofre"), button:has-text("Abrir")')

// 3) Termo (se aparecer)
try {
  await page.waitForSelector('#titular-geo', { timeout: 8000 })
  telas.push(await rodarAxe('termo'))
  await page.fill('#titular-geo', 'Auditoria THEYE')
  await page.click('button:has-text("Li e aceito")')
} catch { /* cofre já consentido */ }

// 4) Interface com abas
await page.waitForSelector('[role="tablist"]', { timeout: 15000 })
const abas = await page.$$eval('[role="tab"]', els => els.map(e => e.textContent.trim()))
for (const nome of abas) {
  await page.click(`[role="tab"]:has-text("${nome}")`)
  await page.waitForTimeout(600)
  telas.push(await rodarAxe(`aba:${nome}`))
}

// 5) As telas abertas da casa (não dependem do cofre): régua de nota, biblioteca (R7) e a
//    medição de precisão em campo (R10).
for (const [nome, rota] of [['regua-de-nota', '/#/geo/nota'], ['biblioteca', '/#/geo/biblioteca'], ['precisao', '/#/geo/precisao']]) {
  await page.goto(`${base}${rota}`, { waitUntil: 'load', timeout: 60000 })
  await page.waitForTimeout(800)
  telas.push(await rodarAxe(nome))
}

await browser.close()

let bundleKB = 0
try { for (const f of globSync('dist-prod/assets/*.js')) bundleKB += readFileSync(f).length / 1024 } catch {}
let entradaKB = 0
try { for (const f of globSync('dist-prod/assets/index-*.js').concat(globSync('dist-prod/assets/vendor-*.js'))) entradaKB += readFileSync(f).length / 1024 } catch {}

const totalViol = telas.reduce((s, t) => s + t.violacoes, 0)
const boletim = {
  quando: new Date().toISOString(), alvo,
  desempenho: { fcp_ms: Math.round(nav.fcp || 0), load_ms: Math.round(nav.load || 0), total_ms: Date.now() - t0 },
  acessibilidade: { total_violacoes: totalViol, por_tela: telas },
  pacote: { js_total_kb: Math.round(bundleKB), entrada_kb: Math.round(entradaKB) },
}
writeFileSync('/mnt/project-files/geo-replano/boletim-nota-R2.json', JSON.stringify(boletim, null, 2))
console.log('FCP(ms):', boletim.desempenho.fcp_ms, '| load(ms):', boletim.desempenho.load_ms, '| axe total violações:', totalViol, '| entrada(kb):', boletim.pacote.entrada_kb)
for (const t of telas) { console.log(`  [${t.tela}] violações: ${t.violacoes}`); for (const v of t.detalhe) console.log('     -', v.id, `(${v.impact}, ${v.n})`, v.help, '::', v.alvos.join(' | ')) }
