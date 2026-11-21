// @vitest-environment jsdom
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'fs'
import { corpoCanonico, conferirCorrente, lerElos, anteriorDe, recalcular, GENESE, avanco, type Elo } from './trilho'

// Passo T2: a conferência da corrente roda no navegador, e quem confere não pode depender de mim.
// Este teste roda contra o arquivo DE VERDADE que vai publicado em public/trilho-v4.jsonl.

const elos = lerElos(readFileSync('public/trilho-v4.jsonl', 'utf8'))

describe('corpo canônico (a forma que o Python escreve)', () => {
  it('põe um espaço depois dos dois-pontos e da vírgula, e ordena as chaves', () => {
    expect(corpoCanonico({ b: 1, a: 2 })).toBe('{"a": 2, "b": 1}')
    expect(corpoCanonico({ x: [1, 2] })).toBe('{"x": [1, 2]}')
    // É aqui que o JSON.stringify do JavaScript erra: ele escreve {"a":2,"b":1} e muda o hash.
    expect(corpoCanonico({ b: 1, a: 2 })).not.toBe(JSON.stringify({ a: 2, b: 1 }))
  })

  it('escreve acento cru, como ensure_ascii=False', () => {
    expect(corpoCanonico({ p: 'ação' })).toBe('{"p": "ação"}')
  })

  it('ordena por chave em qualquer profundidade', () => {
    expect(corpoCanonico({ z: { d: 1, c: 2 } })).toBe('{"z": {"c": 2, "d": 1}}')
  })
})

describe('a corrente do trilho publicada', () => {
  it('tem elos e o primeiro aponta para a gênese do plano v4', () => {
    expect(elos.length).toBeGreaterThan(30)
    expect(anteriorDe(elos[0])).toBe(GENESE)
  })

  it('a ligação está íntegra, fora a única emenda confessada pelo elo REPARO', async () => {
    const c = await conferirCorrente(elos)
    // A quebra de 15-16/11/2026 (elo escrito sem `anterior`) não é escondida: o elo REPARO a
    // assume por escrito, e ela fica listada aqui e na tela. Nenhuma quebra além dessa.
    expect(c.emendasDocumentadas).toEqual([114])
    const soltos = c.elos.filter(e => !e.ligado && !c.emendasDocumentadas.includes(e.n)).map(e => `${e.n} (${e.passo})`)
    expect(soltos, `elo solto na corrente: ${soltos.join(', ')}`).toEqual([])
    expect(c.ligacaoIntegra).toBe(true)
  })

  it('reproduz todo elo novo; os de receita antiga são nomeados, não escondidos', async () => {
    const c = await conferirCorrente(elos)
    const antigos = c.elos.filter(e => !e.reproduzido)
    // Receitas antigas conhecidas: os 3 primeiros marcos e o lote de 15-16/11/2026 (schema do
    // plano, sem campo `passo`). Depois do elo REPARO (18/11/2026) a receita é única.
    const reparo = c.elos.find(e => e.passo === 'REPARO')!.n
    const CONHECIDOS = new Set(['EMISSAO', 'ROTEAMENTO', 'A26', 'C13', 'C15', 'C16', 'C4', 'C5', 'C4-setup', 'C4-impl', 'C5-setup', 'C5-impl', 'C6-inicio', 'C6-completo', 'C8-sinal', 'C8-completo', 'D1'])
    for (const e of antigos) {
      expect(e.n, `elo novo não reproduzido: ${e.n} (${e.passo})`).toBeLessThan(reparo)
      expect(CONHECIDOS.has(e.passo), `receita antiga inesperada: ${e.n} (${e.passo})`).toBe(true)
    }
    expect(antigos.length).toBeLessThanOrEqual(18)
    expect(c.reproduzidos).toBe(elos.length - antigos.length)
  })

  it('mudar uma letra de um elo faz o hash dele deixar de bater', async () => {
    const alvo = { ...elos[elos.length - 1] }
    expect(await recalcular(alvo)).toBe(alvo.hash)
    const mexido = { ...alvo, passo: `${alvo.passo} ` }
    expect(await recalcular(mexido)).not.toBe(alvo.hash)
  })
})

describe('painel de avanço, feito só do que a corrente registra', () => {
  const elos = [
    { passo: 'EMISSAO', hash: 'h0' },
    { passo: 'C6-grafo-liga-tudo-parcial', titulo: 'C6 - Grafo', quando: '2026-11-13T17:00:00Z', pendente: 'faltam as coletas', hash: 'h1' },
    { passo: 'C7', titulo: 'C7 - Régua', quando: '2026-11-13T19:00:00Z', pendente: 'nenhuma série coletada', hash: 'h2' },
    { passo: 'C7', titulo: 'C7 - Régua, segunda volta', quando: '2026-11-13T20:00:00Z', hash: 'h3' },
  ] as unknown as Elo[]

  it('conta as voltas e lista um registro por passo', () => {
    const a = avanco(elos)
    expect(a.voltas).toBe(4)
    expect(a.passos.map(p => p.codigo)).toEqual(['C6', 'C7'])
  })

  it('passo registrado duas vezes vale pelo elo mais recente', () => {
    const c7 = avanco(elos).passos.find(p => p.codigo === 'C7')!
    expect(c7.titulo).toBe('C7 - Régua, segunda volta')
    expect(c7.pendente).toBeUndefined()
  })

  it('marco sem código de passo não entra na lista de passos', () => {
    expect(avanco(elos).passos.some(p => p.passo === 'EMISSAO')).toBe(false)
  })

  it('a pendência sai nas palavras do próprio elo, não nas minhas', () => {
    const a = avanco(elos)
    expect(a.comPendencia.map(p => p.codigo)).toEqual(['C6'])
    expect(a.comPendencia[0].pendente).toBe('faltam as coletas')
  })

  it('não existe porcentagem aqui: a conta do plano não vive na corrente', () => {
    expect(Object.keys(avanco(elos))).toEqual(['voltas', 'passos', 'comPendencia', 'ultimaVolta'])
  })

  it('"nenhuma." no campo pendente quer dizer sem pendência', () => {
    const a = avanco([{ passo: 'A32 · x', pendente: 'nenhuma.', hash: 'h1' }, { passo: 'A33 · y', pendente: ' - ', hash: 'h2' }, { passo: 'A34 · z', pendente: 'falta a Dra. Fátima assinar', hash: 'h3' }] as never)
    expect(a.comPendencia.map(p => p.codigo)).toEqual(['A34'])
  })

  it('a corrente de verdade publicada tem passos e pendências legíveis', () => {
    const a = avanco(lerElos(readFileSync('public/trilho-v4.jsonl', 'utf8')))
    expect(a.voltas).toBeGreaterThan(40)
    expect(a.passos.length).toBeGreaterThan(20)
    expect(a.comPendencia.length).toBeGreaterThan(0)
    for (const p of a.comPendencia) expect(p.pendente!.length).toBeGreaterThan(20)
  })
})
