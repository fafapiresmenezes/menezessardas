// Passo C1: a ontologia de eventos. Nada de rede: o Supabase aqui é um dublê em memória.
import { describe, it, expect, beforeEach } from 'vitest'
import { vi } from 'vitest'

type Linha = Record<string, unknown>
const banco: Record<string, Linha[]> = {}
let proximoId = 0

/** Dublê mínimo do cliente: insert/select com eq, gte, lte, or e order. */
function fazerConsulta(tabela: string, filtros: ((l: Linha) => boolean)[] = [], ordem?: { coluna: string; asc: boolean }, juncao = false) {
  const resolver = () => {
    let linhas = (banco[tabela] ?? []).filter(l => filtros.every(f => f(l)))
    if (ordem) linhas = [...linhas].sort((a, b) => String(a[ordem.coluna]).localeCompare(String(b[ordem.coluna])) * (ordem.asc ? 1 : -1))
    // 'papel, eventos(*)' no select vira a junção com a tabela eventos.
    const data = juncao ? linhas.map(l => ({ papel: l.papel, eventos: (banco.eventos ?? []).find(e => e.id === l.evento_id) ?? null })) : linhas
    return { data, error: null }
  }
  const q: Record<string, unknown> = {
    eq: (c: string, v: unknown) => fazerConsulta(tabela, [...filtros, l => l[c] === v], ordem, juncao),
    gte: (c: string, v: unknown) => fazerConsulta(tabela, [...filtros, l => String(l[c]) >= String(v)], ordem, juncao),
    lte: (c: string, v: unknown) => fazerConsulta(tabela, [...filtros, l => String(l[c]) <= String(v)], ordem, juncao),
    or: () => fazerConsulta(tabela, filtros, ordem, juncao),
    order: (c: string, o?: { ascending?: boolean }) => fazerConsulta(tabela, filtros, { coluna: c, asc: o?.ascending !== false }, juncao),
    then: (ok: (r: unknown) => unknown) => Promise.resolve(resolver()).then(ok),
  }
  return q
}

vi.mock('../supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    schema: (esquema: string) => ({
      from: (tabela: string) => {
        expect(esquema).toBe('instituto')
        return {
          insert: (linhas: Linha | Linha[]) => {
            const gravadas = ([] as Linha[]).concat(linhas).map(l => ({ id: `id-${++proximoId}`, ...l }))
            banco[tabela] = [...(banco[tabela] ?? []), ...gravadas]
            const r = { data: gravadas, error: null }
            return { ...r, select: () => Promise.resolve(r), then: (ok: (x: unknown) => unknown) => Promise.resolve(r).then(ok) }
          },
          select: (colunas?: string) => fazerConsulta(tabela, [], undefined, Boolean(colunas?.includes('eventos(*)'))),
        }
      },
    }),
  },
}))

const {
  hashConteudo, canonizar, jsonCanonico, camposHash, atrasoHoras,
  inserirEntidade, inserirLugar, inserirEvento, inserirAresta,
  eventosPorLugar, eventosPorEntidade, arestasDaEntidade, ESQUEMA,
} = await import('./ontologia')

beforeEach(() => { for (const k of Object.keys(banco)) delete banco[k]; proximoId = 0 })

describe('ontologia C1: hash de conteúdo', () => {
  it('a forma canônica ordena as chaves e trata nulo como vazio', () => {
    expect(canonizar({ b: 2, a: 'x', c: null })).toBe('a=x\nb=2\nc=')
    expect(jsonCanonico({ z: 1, a: { d: 2, c: 3 } })).toBe('{"a":{"c":3,"d":2},"z":1}')
  })

  it('o mesmo conteúdo dá sempre o mesmo hash, em qualquer ordem de chaves', async () => {
    const h1 = await hashConteudo({ tipo: 'protesto', fonte: 'gdelt', valor: 3 })
    const h2 = await hashConteudo({ valor: 3, fonte: 'gdelt', tipo: 'protesto' })
    expect(h1).toBe(h2)
    expect(h1).toMatch(/^[0-9a-f]{64}$/)
  })

  it('conteúdo diferente dá hash diferente', async () => {
    const base = { tipo: 'protesto', fonte: 'gdelt', valor: 3 }
    expect(await hashConteudo(base)).not.toBe(await hashConteudo({ ...base, valor: 4 }))
    expect(await hashConteudo(base)).not.toBe(await hashConteudo({ ...base, fonte: 'anm' }))
  })

  it('o hash não cobre o id da linha nem a hora de gravação, e ignora observado_em', async () => {
    const evento = {
      tipo: 'outorga_agua', ocorrido_em: '2026-03-01T12:00:00.000Z', observado_em: '2026-03-04T09:00:00.000Z',
      fonte: 'ana_snirh', valor: 120, unidade: 'm3/s',
    }
    const campos = camposHash.evento(evento)
    expect(Object.keys(campos)).not.toContain('observado_em')
    expect(Object.keys(campos)).not.toContain('id')
    expect(Object.keys(campos)).not.toContain('criado_em')
    // Reobservar o mesmo fato mais tarde não muda o hash: a coleta repetida é reconhecida.
    expect(await hashConteudo(camposHash.evento({ ...evento, observado_em: '2026-06-01T00:00:00.000Z' })))
      .toBe(await hashConteudo(campos))
  })
})

describe('ontologia C1: ida e volta de um evento de exemplo', () => {
  it('entidade, lugar, evento e aresta gravam e voltam, cada um com a sua fonte e hash', async () => {
    expect(ESQUEMA).toBe('instituto')

    const mineradora = await inserirEntidade({ tipo: 'empresa', nome: 'Mineradora Exemplo S.A.', chave_natural: '00000000000191', identificadores: { cnpj: '00000000000191' }, fonte: 'anm' })
    const bacia = await inserirEntidade({ tipo: 'bacia', nome: 'Bacia do Exemplo', chave_natural: 'bacia-exemplo', fonte: 'ana_snirh' })
    const municipio = await inserirLugar({ tipo: 'municipio', nome: 'Município de Exemplo', uf: 'MG', codigo_ibge: '3100104', latitude: -19.5, longitude: -43.9, lat_min: -19.7, lat_max: -19.3, lon_min: -44.1, lon_max: -43.7, fonte: 'ibge' })

    expect(mineradora.conteudo_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(municipio.conteudo_hash).toMatch(/^[0-9a-f]{64}$/)
    expect(municipio.fonte).toBe('ibge')

    const evento = await inserirEvento({
      tipo: 'licenca_mineraria', subtipo: 'requerimento_de_lavra', titulo: 'Requerimento de lavra publicado',
      ocorrido_em: '2026-03-01T12:00:00.000Z', observado_em: '2026-03-04T09:00:00.000Z',
      lugar_id: municipio.id, latitude: -19.5, longitude: -43.9, confianca: 0.8, tom: -2.5,
      bruto: { processo: '830.000/2026', pagina: 7 }, fonte: 'anm',
    }, [{ entidade_id: mineradora.id!, papel: 'ator' }, { entidade_id: bacia.id!, papel: 'objeto' }])

    expect(evento.id).toBeTruthy()
    expect(evento.conteudo_hash).toMatch(/^[0-9a-f]{64}$/)

    const naJanela = await eventosPorLugar(municipio.id!, '2026-02-01T00:00:00.000Z', '2026-03-31T23:59:59.000Z')
    expect(naJanela).toHaveLength(1)
    expect(naJanela[0]).toMatchObject({ tipo: 'licenca_mineraria', fonte: 'anm', confianca: 0.8, tom: -2.5 })
    expect(naJanela[0].bruto).toEqual({ processo: '830.000/2026', pagina: 7 })

    // Fora da janela não volta nada.
    expect(await eventosPorLugar(municipio.id!, '2026-04-01T00:00:00.000Z', '2026-04-30T00:00:00.000Z')).toHaveLength(0)

    // Pela entidade: o evento aparece para quem participou dele.
    const porEntidade = await eventosPorEntidade(mineradora.id!)
    expect(porEntidade.map(e => e.id)).toEqual([evento.id])
    expect(await eventosPorEntidade(bacia.id!)).toHaveLength(1)
    expect(await eventosPorEntidade('id-inexistente')).toHaveLength(0)

    // Aresta dirigida, com peso e janela de validade.
    const aresta = await inserirAresta({ origem_id: mineradora.id!, destino_id: bacia.id!, tipo: 'opera_em', peso: 1, valido_de: '2026-01-01T00:00:00.000Z', valido_ate: null, fonte: 'anm' })
    expect(aresta.conteudo_hash).toMatch(/^[0-9a-f]{64}$/)
    const vigentes = await arestasDaEntidade(mineradora.id!, '2026-05-01T00:00:00.000Z')
    expect(vigentes.map(a => a.tipo)).toEqual(['opera_em'])
    expect(vigentes[0].origem_id).toBe(mineradora.id)
    // Antes de começar a valer, não está vigente.
    expect(await arestasDaEntidade(mineradora.id!, '2025-06-01T00:00:00.000Z')).toHaveLength(0)
  })

  it('ocorrido_em e observado_em ficam distintos, e o atraso é medível', async () => {
    const evento = await inserirEvento({
      tipo: 'preco_fechamento', ocorrido_em: '2026-03-01T12:00:00.000Z', observado_em: '2026-03-02T12:00:00.000Z',
      valor: 142.5, unidade: 'BRL/sc', fonte: 'cepea',
    })
    expect(evento.ocorrido_em).toBe('2026-03-01T12:00:00.000Z')
    expect(evento.observado_em).toBe('2026-03-02T12:00:00.000Z')
    expect(evento.ocorrido_em).not.toBe(evento.observado_em)
    expect(atrasoHoras(evento)).toBe(24)
    // Fato anunciado com antecedência: atraso negativo, e isso é permitido de propósito.
    expect(atrasoHoras({ ocorrido_em: '2026-03-10T00:00:00.000Z', observado_em: '2026-03-01T00:00:00.000Z' })).toBe(-216)
  })
})
