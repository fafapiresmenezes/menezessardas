import { describe, it, expect } from 'vitest'
import { podeVerItem, filtrarItens, conflitoDeFuncao, temAlcada, proximaEstacao, NIVEIS, rotuloNivel, type Pessoa, type Item, type Alcada } from './hierarquiaCorporativa'

const base: Pessoa = { id: 'x', nivel: null, paises: ['AO'], setores: ['obra'], projetos: ['P1'] }
const p = (o: Partial<Pessoa>): Pessoa => ({ ...base, ...o })
const item = (o: Partial<Item> = {}): Item => ({ pais: 'AO', setor: 'obra', projeto: 'P1', ...o })

describe('Hierarquia corporativa: quem vê o quê', () => {
  it('sem nível definido não vê nada', () => {
    expect(podeVerItem(p({}), item())).toBe(false)
  })
  it('N1 vê todos os países', () => {
    expect(podeVerItem(p({ nivel: 'N1', paises: [] }), item({ pais: 'NA', setor: 'financeiro', reservado: true }))).toBe(true)
  })
  it('N2 vê tudo do seu país e nada de outro', () => {
    const ceo = p({ nivel: 'N2', setores: [], projetos: [] })
    expect(podeVerItem(ceo, item({ setor: 'juridico', projeto: 'P9', reservado: true }))).toBe(true)
    expect(podeVerItem(ceo, item({ pais: 'CD' }))).toBe(false)
  })
  it('N3 vê a sua área em qualquer projeto do país, e não as outras áreas', () => {
    const dir = p({ nivel: 'N3', setores: ['juridico'], projetos: [] })
    expect(podeVerItem(dir, item({ setor: 'juridico', projeto: 'P7' }))).toBe(true)
    expect(podeVerItem(dir, item({ setor: 'financeiro' }))).toBe(false)
  })
  it('N4 vê os seus projetos em todas as áreas, menos o que é reservado', () => {
    const ger = p({ nivel: 'N4', setores: [] })
    expect(podeVerItem(ger, item({ setor: 'financeiro' }))).toBe(true)
    expect(podeVerItem(ger, item({ projeto: 'P2' }))).toBe(false)
    expect(podeVerItem(ger, item({ projeto: null }))).toBe(false)
    expect(podeVerItem(ger, item({ reservado: true }))).toBe(false)
  })
  it('N5 vê só o que é seu ou lhe foi atribuído', () => {
    const tec = p({ nivel: 'N5' })
    expect(podeVerItem(tec, item())).toBe(false)
    expect(podeVerItem(tec, item({ responsavelId: 'x' }))).toBe(true)
    expect(podeVerItem(tec, item({ partilhadoCom: ['x'] }))).toBe(true)
    expect(podeVerItem(tec, item({ responsavelId: 'x', reservado: true }))).toBe(false)
  })
  it('N6 vê só o que foi partilhado com ele, nunca por ser responsável', () => {
    const ext = p({ nivel: 'N6' })
    expect(podeVerItem(ext, item({ responsavelId: 'x' }))).toBe(false)
    expect(podeVerItem(ext, item({ partilhadoCom: ['x'] }))).toBe(true)
  })
  it('pessoa sem id não herda item sem dono', () => {
    expect(podeVerItem(p({ nivel: 'N5', id: '' }), item({ responsavelId: '' }))).toBe(false)
  })
  it('a mesma lista encolhe conforme o nível desce', () => {
    const itens = [item({ responsavelId: 'x' }), item({ projeto: 'P2' }), item({ setor: 'juridico', projeto: 'P2' }), item({ pais: 'NA' })]
    expect(filtrarItens(itens, p({ nivel: 'N1' }))).toHaveLength(4)
    expect(filtrarItens(itens, p({ nivel: 'N2' }))).toHaveLength(3)
    expect(filtrarItens(itens, p({ nivel: 'N3' }))).toHaveLength(2)
    expect(filtrarItens(itens, p({ nivel: 'N4' }))).toHaveLength(1)
    expect(filtrarItens(itens, p({ nivel: 'N5' }))).toHaveLength(1)
    expect(filtrarItens(itens, p({ nivel: 'N6' }))).toHaveLength(0)
  })
  it('todo nível tem rótulo', () => {
    for (const n of NIVEIS) expect(rotuloNivel[n].length).toBeGreaterThan(2)
  })
})

describe('Segregação de funções e alçadas', () => {
  it('quem mede não fiscaliza nem aprova nem paga o mesmo documento', () => {
    const feitas = [{ estacao: 'medir' as const, pessoaId: 'a' }]
    expect(conflitoDeFuncao(feitas, { estacao: 'fiscalizar', pessoaId: 'a' })).toMatch(/mesma pessoa/)
    expect(conflitoDeFuncao(feitas, { estacao: 'liberar_pagamento', pessoaId: 'a' })).toMatch(/mesma pessoa/)
    expect(conflitoDeFuncao(feitas, { estacao: 'fiscalizar', pessoaId: 'b' })).toBeNull()
    expect(conflitoDeFuncao(feitas, { estacao: 'validar_contrato', pessoaId: 'a' })).toBeNull()
  })
  it('quem aprova não libera o pagamento', () => {
    expect(conflitoDeFuncao([{ estacao: 'aprovar_tecnica', pessoaId: 'a' }], { estacao: 'liberar_pagamento', pessoaId: 'a' })).not.toBeNull()
  })
  it('alçada não se presume: sem linha na matriz, não aprova', () => {
    expect(temAlcada(p({ nivel: 'N2', setores: ['financeiro'] }), 'liberar_pagamento', 10, [])).toBe(false)
  })
  it('alçada respeita nível mínimo, setor e teto', () => {
    const matriz: Alcada[] = [
      { estacao: 'liberar_pagamento', nivelMinimo: 'N4', setor: 'financeiro', ate: 1000 },
      { estacao: 'liberar_pagamento', nivelMinimo: 'N3', setor: 'financeiro', ate: null },
    ]
    const ger = p({ nivel: 'N4', setores: ['financeiro'] })
    const dir = p({ nivel: 'N3', setores: ['financeiro'] })
    expect(temAlcada(ger, 'liberar_pagamento', 1000, matriz)).toBe(true)
    expect(temAlcada(ger, 'liberar_pagamento', 1000.01, matriz)).toBe(false)
    expect(temAlcada(dir, 'liberar_pagamento', 5_000_000, matriz)).toBe(true)
    expect(temAlcada(p({ nivel: 'N3', setores: ['obra'] }), 'liberar_pagamento', 10, matriz)).toBe(false)
    expect(temAlcada(p({ nivel: 'N5', setores: ['financeiro'] }), 'liberar_pagamento', 10, matriz)).toBe(false)
    expect(temAlcada(p({ nivel: 'N6', setores: ['financeiro'] }), 'liberar_pagamento', 10, matriz)).toBe(false)
    expect(temAlcada(dir, 'liberar_pagamento', NaN, matriz)).toBe(false)
  })
  it('a cadeia anda uma estação de cada vez e termina', () => {
    expect(proximaEstacao([])).toBe('medir')
    expect(proximaEstacao([{ estacao: 'medir', pessoaId: 'a' }])).toBe('fiscalizar')
    expect(proximaEstacao(['medir', 'fiscalizar', 'aprovar_tecnica', 'validar_contrato', 'liberar_pagamento'].map(e => ({ estacao: e as never, pessoaId: 'a' })))).toBeNull()
  })
})
