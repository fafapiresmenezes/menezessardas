// "Conferir agora" fora da plataforma. ATENÇÃO: o CNJ só responde a endereços do Brasil (testado em 11/11/2026:
// dos servidores do GitHub, nos EUA, o DJEN deu 403 e o DataJud não respondeu). Rode num computador no Brasil. Lê, com as MESMAS
// regras da tela, tudo o que saiu no Diário de Justiça Eletrônico Nacional para uma lista de processos e de advogados.
// Uso: node scripts/conferir-cnj.mjs <arquivo-com-numeros> "<nome do advogado>[,outro]" [dias=93]
// Saída: conferencia-cnj/prazos.csv, conferencia-cnj/andamentos.csv e um resumo no terminal. Só lê; não grava em banco nenhum.
import { build } from 'esbuild'
import { readFileSync, writeFileSync, mkdirSync, existsSync, statSync } from 'node:fs'
import path from 'node:path'

const raiz = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..')
const [arqNumeros, nomes = '', diasTxt = '93'] = process.argv.slice(2)
globalThis.Deno = { env: { get: () => undefined } }

const entrada = `export * from './supabase/functions/_compartilhado/cnj.ts'
export { lerTodas, csvDosPrazos, ROTULO_URGENCIA } from './src/lib/escritorio/lerIntimacao'
export { somarDias } from './src/lib/ferramentas/base'`
const r = await build({
  stdin: { contents: entrada, resolveDir: raiz, loader: 'ts' }, bundle: true, write: false, format: 'esm', platform: 'node',
  plugins: [{ name: 'arroba', setup(b) { b.onResolve({ filter: /^@\// }, a => {
    const base = path.join(raiz, 'src', a.path.slice(2))
    for (const c of [`${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), base]) if (existsSync(c) && statSync(c).isFile()) return { path: c }
    return { errors: [{ text: `não achei ${a.path}` }] }
  }) } }],
  resolveExtensions: ['.ts', '.tsx', '.js'],
})
const tmp = path.join(raiz, 'node_modules', '.conferir-cnj.mjs')
writeFileSync(tmp, r.outputFiles[0].text)
const m = await import(tmp)

const hoje = new Date(Date.now() - 3 * 3600000).toISOString().slice(0, 10)
const dias = Math.min(93, Math.max(1, Number(diasTxt) || 93))
const inicio = m.somarDias(hoje, -dias + 1)
const numeros = arqNumeros ? [...new Set(readFileSync(arqNumeros, 'utf8').match(/\d{7}-?\d{2}\.?\d{4}\.?\d\.?\d{2}\.?\d{4}/g) ?? [])] : []
const advogados = nomes.split(',').map(s => s.trim()).filter(Boolean)
console.log(`Janela: ${inicio} a ${hoje} · ${numeros.length} processo(s) · advogado(s): ${advogados.join(', ') || 'nenhum'}`)

// Teste rápido antes da lista toda: se o CNJ não responde deste servidor, avisa logo em vez de esperar cada consulta.
const sonda = async (nome, url, init) => {
  const t0 = Date.now()
  const r = await fetch(url, { ...init, signal: AbortSignal.timeout(20000) }).then(x => `${x.status}`).catch(e => `falhou (${e.cause?.code ?? e.name})`)
  console.log(`Teste ${nome}: ${r} em ${Date.now() - t0} ms`)
  return /^2/.test(r)
}
const okCom = await sonda('Comunica PJe (DJEN)', `${m.COMUNICA}?numeroOab=1&ufOab=RJ&itensPorPagina=5&pagina=1`)
const okDj = await sonda('DataJud', 'https://api-publica.datajud.cnj.jus.br/api_publica_tjrj/_search', { method: 'POST', headers: { Authorization: m.DATAJUD_KEY, 'Content-Type': 'application/json' }, body: JSON.stringify({ size: 1, query: { match_all: {} } }) })
if (!okCom && !okDj) { console.log('O CNJ não respondeu deste servidor. Nada a conferir.'); process.exit(2) }

const pubs = new Map(), erros = [], andamentos = []
const fila = [
  ...advogados.map(n => ({ rot: `advogado ${n}`, f: { nomeAdvogado: n }, pag: 10 })),
  ...numeros.map(n => ({ rot: n, f: { numeroProcesso: n.replace(/\D/g, '') }, pag: 2, numero: n })),
]
let feitos = 0
const trabalhar = async () => {
  while (fila.length) {
    const q = fila.shift()
    const c = okCom ? await m.comunica(q.f, inicio, hoje, q.pag) : { ok: false, erro: 'Comunica fora do ar daqui', itens: [] }
    if (!c.ok) erros.push(`${q.rot}: ${c.erro}`)
    for (const p of c.itens) pubs.set(p.id, p)
    if (q.numero) {
      const d = okDj ? await m.datajud(q.numero).catch(e => ({ ok: false, erro: String(e) })) : { ok: false, erro: 'DataJud fora do ar daqui' }
      const ult = d.movimentos?.[0]
      andamentos.push([q.numero, d.ok ? (d.encontrado ? 'sim' : 'não achado') : `erro: ${d.erro}`, d.tribunal ?? '', d.orgao ?? '', d.classe ?? '', ult ? String(ult.data).slice(0, 10) : '', ult ? `${ult.nome}${ult.complemento ? ` (${ult.complemento})` : ''}` : '', c.itens.length])
    }
    if (++feitos % 10 === 0) console.log(`  ${feitos} consulta(s)…`)
  }
}
await Promise.all(Array.from({ length: 3 }, trabalhar))

const lidas = m.lerTodas([...pubs.values()], hoje)
mkdirSync(path.join(raiz, 'conferencia-cnj'), { recursive: true })
writeFileSync(path.join(raiz, 'conferencia-cnj', 'prazos.csv'), '﻿' + m.csvDosPrazos(lidas))
const esc = s => `"${String(s).replace(/"/g, '""')}"`
writeFileSync(path.join(raiz, 'conferencia-cnj', 'andamentos.csv'), '﻿' + ['Processo;No DataJud;Tribunal;Órgão;Classe;Último andamento em;Último andamento;Publicações no período']
  .concat(andamentos.sort((a, b) => String(b[5]).localeCompare(String(a[5]))).map(l => l.map(esc).join(';'))).join('\n'))

const porUrg = lidas.reduce((a, l) => ({ ...a, [l.urgencia]: (a[l.urgencia] ?? 0) + 1 }), {})
console.log(`\nPublicações achadas: ${pubs.size} · com leitura: ${lidas.length}`)
console.log('Por situação:', Object.entries(porUrg).map(([k, v]) => `${m.ROTULO_URGENCIA[k]}: ${v}`).join(' · ') || 'nenhuma')
console.log(`Consultas com erro: ${erros.length}`); for (const e of erros.slice(0, 15)) console.log('  ' + e)
console.log('\n=== PRAZOS (CSV) ===\n' + m.csvDosPrazos(lidas))
console.log('\n=== ANDAMENTOS NO DATAJUD (CSV) ===\n' + readFileSync(path.join(raiz, 'conferencia-cnj', 'andamentos.csv'), 'utf8').slice(1))
