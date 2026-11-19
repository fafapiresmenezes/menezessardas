// R7: confere se os links da biblioteca científica ainda respondem.
//
// Não roda no agente da nuvem: a saída de rede dele bloqueia doi.org, arxiv.org e os
// repositórios universitários, e um bloqueio do proxy NÃO é link morto. Por isso este
// script existe separado — rode onde houver internet aberta:
//
//   node scripts/geo/conferir-links.mjs
//
// Ele imprime uma linha por obra e sai com código 1 se algum link responder 404/410.
// Qualquer outra falha (tempo esgotado, 403 de antirrobô) sai como "não deu para conferir",
// que é diferente de "morto": o acervo não é alterado por um resultado desses.
import { readFileSync } from 'node:fs'

const fonte = readFileSync(new URL('../../src/data/geo/biblioteca.ts', import.meta.url), 'utf8')
const obras = [...fonte.matchAll(/\{ id: '([^']+)'[\s\S]*?url: '([^']+)'/g)].map(m => ({ id: m[1], url: m[2] }))

const MORTO = new Set([404, 410])
let mortos = 0, duvidosos = 0

for (const o of obras) {
  let linha
  try {
    const ctrl = new AbortController()
    const t = setTimeout(() => ctrl.abort(), 20000)
    // HEAD primeiro; vários repositórios só respondem a GET.
    let r = await fetch(o.url, { method: 'HEAD', redirect: 'follow', signal: ctrl.signal })
    if (r.status === 405 || r.status === 501) r = await fetch(o.url, { redirect: 'follow', signal: ctrl.signal })
    clearTimeout(t)
    if (MORTO.has(r.status)) { mortos++; linha = `MORTO ${r.status}` }
    else if (!r.ok) { duvidosos++; linha = `não deu para conferir (${r.status})` }
    else linha = `ok ${r.status}`
  } catch (e) {
    duvidosos++
    linha = `não deu para conferir (${e.name === 'AbortError' ? 'tempo esgotado' : e.message})`
  }
  console.log(`${linha.padEnd(36)} ${o.id}  ${o.url}`)
}

console.log(`\n${obras.length} obras · ${mortos} link(s) morto(s) · ${duvidosos} não conferido(s)`)
if (mortos > 0) {
  console.log('Substitua o link morto pela página oficial atual antes de dizer que o acervo está conferido.')
  process.exit(1)
}
