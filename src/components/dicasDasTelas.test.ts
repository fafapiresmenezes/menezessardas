import { describe, it, expect } from 'vitest'
import { readFileSync, readdirSync } from 'fs'

// Pedido do M (12/11/2026): "UI mais autoexplicativa, com dica ao passar o cursor".
//
// Este teste conta, em cada tela, os elementos com que a pessoa interage (botão, link, campo, lista
// de opções) que não têm NENHUMA explicação. Vale como explicação:
//   · `title=...`        — a dica que aparece ao passar o cursor, que é o que o M pediu;
//   · `aria-label`       — o nome que o leitor de tela anuncia, para quem não vê a tela;
//   · um `<Tooltip>`     — o balão da própria plataforma, mais completo que o `title`;
//   · um `<label>` ligado ao campo, por `htmlFor` ou pelo componente `Campo rotulo=`.
//
// Um rótulo visível já diz o que o campo é; a dica serve para o que o rótulo não cabe explicar
// ("dias úteis não contam sábado", "em dobro vale para a Fazenda"). Por isso as duas contam.
//
// O número abaixo é um cadeado, não uma meta: ele só pode cair. Tela nova sem explicação faz o teste
// falhar e dizer exatamente qual elemento, em que linha. Quem baixar o número, baixa o cadeado junto.

/** Acha o `>` que fecha a tag aberta em `i`, respeitando {}, '' e "" — JSX tem `=>` dentro de atributo. */
function fimDaTag(t: string, i: number): number {
  let chaves = 0
  let aspas: string | null = null
  for (let j = i + 1; j < t.length; j++) {
    const c = t[j]
    if (aspas) { if (c === aspas) aspas = null; continue }
    if (c === '"' || c === "'") { aspas = c; continue }
    if (c === '{') chaves++
    else if (c === '}') chaves--
    else if (c === '>' && chaves === 0) return j
  }
  return -1
}

const INTERATIVOS = /<(button|Link|a|select|textarea|input)(?=[\s/>])/g

export function semExplicacao(fonte: string): { linha: number; tag: string; trecho: string }[] {
  const achados: { linha: number; tag: string; trecho: string }[] = []
  for (const m of fonte.matchAll(INTERATIVOS)) {
    const inicio = m.index!
    const fim = fimDaTag(fonte, inicio)
    if (fim < 0) continue
    const tag = fonte.slice(inicio, fim + 1)
    if (/title=|aria-label=|aria-labelledby=/.test(tag)) continue
    // escondido de propósito da pessoa e do leitor de tela (ex.: o campo-armadilha anti-robô do login)
    if (/aria-hidden="true"/.test(tag)) continue
    // quem envolve o elemento pode já explicá-lo: <Tooltip texto=>, <label title=>, <Campo rotulo=>
    const antes = fonte.slice(Math.max(0, inicio - 400), inicio)
    const envolve = Math.max(antes.lastIndexOf('<Tooltip'), antes.lastIndexOf('<label'), antes.lastIndexOf('<Campo'))
    if (envolve >= 0) {
      const abre = Math.max(0, inicio - 400) + envolve
      const f = fimDaTag(fonte, abre)
      const pai = f > abre ? fonte.slice(abre, f + 1) : ''
      if (/title=|aria-label=|texto=|rotulo=|htmlFor=/.test(pai)) continue
    }
    // um <label> ligado ao campo explica o campo
    const id = tag.match(/\bid="([^"]+)"/)
    if (id) {
      const nome = id[1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      if (fonte.includes(`htmlFor="${id[1]}"`)
        || new RegExp(`id="${nome}"[^>]{0,200}rotulo=`).test(fonte)
        || new RegExp(`rotulo=[^>]{0,200}id="${nome}"`).test(fonte)) continue
    }
    // id montado na hora (`id={`dep-quem-${d.id}`}`) com um htmlFor montado do mesmo jeito
    const idExpr = tag.match(/\bid=\{`([^`$]*)\$\{/)
    if (idExpr && fonte.includes('htmlFor={`' + idExpr[1] + '${')) continue
    // id vindo de uma variável (`id={id}`) com o rótulo apontando para a mesma variável
    const idVar = tag.match(/\bid=\{(\w+)\}/)
    if (idVar && fonte.includes(`htmlFor={${idVar[1]}}`)) continue
    achados.push({ linha: fonte.slice(0, inicio).split('\n').length, tag: m[1], trecho: tag.replace(/\s+/g, ' ').slice(0, 100) })
  }
  return achados
}

const TELAS = readdirSync('src/pages').filter(f => f.endsWith('.tsx') && !f.endsWith('.test.tsx')).sort()

/**
 * Telas em que ainda falta explicar algo, e quantos elementos. Hoje está vazio: TODA coisa em que a
 * pessoa clica, em todas as 63 telas, tem dica ao passar o cursor, nome para o leitor de tela ou
 * rótulo ligado ao campo. Só se põe tela aqui com um motivo escrito do lado.
 */
const CADEADO: Record<string, number> = {}

describe('cada coisa em que a pessoa clica se explica', () => {
  it('nenhuma tela tem mais elementos sem explicação do que o cadeado permite', () => {
    const piorou: string[] = []
    for (const tela of TELAS) {
      const achados = semExplicacao(readFileSync(`src/pages/${tela}`, 'utf8'))
      const teto = CADEADO[tela] ?? 0
      if (achados.length > teto) {
        piorou.push(`${tela}: ${achados.length} sem explicação (o cadeado permite ${teto})\n`
          + achados.map(a => `    linha ${a.linha}: ${a.trecho}`).join('\n'))
      }
    }
    expect(piorou.join('\n\n')).toBe('')
  })

  it('o cadeado não lista tela que já está explicada por inteiro (senão ele afrouxa sozinho)', () => {
    const folgadas = Object.keys(CADEADO).filter(tela => {
      if (!TELAS.includes(tela)) return true
      return semExplicacao(readFileSync(`src/pages/${tela}`, 'utf8')).length === 0
    })
    expect(folgadas).toEqual([])
  })

  it('o reconhecedor não se engana com `=>` dentro de atributo nem com rótulo ligado ao campo', () => {
    expect(semExplicacao('<button onClick={() => f(a > b)}>x</button>')).toHaveLength(1)
    expect(semExplicacao('<button onClick={() => f(a > b)} title="diz o que faz">x</button>')).toHaveLength(0)
    expect(semExplicacao('<label htmlFor="q">Quem</label><input id="q" />')).toHaveLength(0)
    expect(semExplicacao('<Tooltip texto="explica"><button onClick={g}>x</button></Tooltip>')).toHaveLength(0)
    expect(semExplicacao('<Campo id="z" rotulo="Zona"><input id="z" /></Campo>')).toHaveLength(0)
    expect(semExplicacao('<label htmlFor={id}>Peso</label><input id={id} />')).toHaveLength(0)
    expect(semExplicacao('<input type="text" aria-hidden="true" tabIndex={-1} />')).toHaveLength(0)
    expect(semExplicacao('<label title="explica"><input type="checkbox" /></label>')).toHaveLength(0)
    expect(semExplicacao('<label><input type="checkbox" /></label>')).toHaveLength(1)
  })
})
