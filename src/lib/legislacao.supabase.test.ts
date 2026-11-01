// Passo 532: monitor de legislação no modo Supabase — acompanhamento, busca ao vivo no LexML e radar dos portais.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const estado = {
  acompanhamento: [] as { norma_id: string; status: string }[],
  resposta: { data: null as unknown, error: null as { message: string } | null },
  portais: [] as Record<string, unknown>[],
  falhaPortais: null as string | null,
}
const upserts: Record<string, unknown>[] = []
const eventos: Record<string, unknown>[] = []
const consultasPortais: { area?: string }[] = []

vi.mock('./trilha', () => ({ registrarEvento: async (e: Record<string, unknown>) => { eventos.push(e) } }))
vi.mock('./supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (tabela: string) => {
      if (tabela === 'legislacao_acompanhamento') return {
        select: async () => ({ data: estado.acompanhamento }),
        upsert: async (r: Record<string, unknown>) => { upserts.push(r); return { error: null } },
      }
      const q = {
        area: undefined as string | undefined,
        select: () => q, order: () => q, limit: () => q,
        eq: (_c: string, v: string) => { q.area = v; return q },
        then: (res: (v: unknown) => void) => { consultasPortais.push({ area: q.area }); res(estado.falhaPortais ? { data: null, error: { message: estado.falhaPortais } } : { data: estado.portais, error: null }) },
      }
      return q
    },
    functions: { invoke: async () => estado.resposta },
  },
}))

const { lerAcompanhamento, definirStatus, buscarNovidades, radarPortais, CATALOGO } = await import('./legislacao')

beforeEach(() => { estado.acompanhamento = []; estado.portais = []; estado.falhaPortais = null; estado.resposta = { data: null, error: null }; upserts.length = 0; eventos.length = 0; consultasPortais.length = 0 })

describe('acompanhamento com Supabase', () => {
  it('lê o mapa norma→status da tabela e definirStatus faz upsert com título e instante, registrando na trilha', async () => {
    estado.acompanhamento = [{ norma_id: CATALOGO[0]!.id, status: 'em_analise' }]
    expect(await lerAcompanhamento()).toEqual({ [CATALOGO[0]!.id]: 'em_analise' })
    await definirStatus(CATALOGO[0]!, 'nao_se_aplica')
    expect(upserts).toHaveLength(1)
    expect(upserts[0]).toMatchObject({ norma_id: CATALOGO[0]!.id, titulo: CATALOGO[0]!.titulo, status: 'nao_se_aplica' })
    expect(String(upserts[0]!.atualizado_em)).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    expect(eventos[0]).toMatchObject({ tipo: 'legislacao_acompanhada', entidade: CATALOGO[0]!.id })
    expect(String(eventos[0]!.resumo)).toContain(CATALOGO[0]!.titulo)
  })
})

describe('busca ao vivo com Supabase', () => {
  it('converte os itens do servidor em normas não catalogadas com fonte LexML; erros viram exceção', async () => {
    estado.resposta = { data: { itens: [{ urn: 'urn:lex:br:federal:lei:2026;1', titulo: 'Lei 1/2026', data: '2026-10-30', link: 'https://lexml.gov.br/1' }] }, error: null }
    const r = await buscarNovidades()
    expect(r.novidades).toHaveLength(1)
    expect(r.novidades[0]).toMatchObject({ id: 'urn:lex:br:federal:lei:2026;1', catalogo: false, fonte: 'LexML', link: 'https://lexml.gov.br/1', publicadaEm: '2026-10-30' })
    expect(r.situacao).toBe('1 norma(s) encontrada(s).')
    estado.resposta = { data: { itens: [], situacao: 'LexML fora do ar' }, error: null }
    expect((await buscarNovidades()).situacao).toBe('LexML fora do ar')
    estado.resposta = { data: null, error: { message: 'timeout' } }
    await expect(buscarNovidades()).rejects.toThrow('timeout')
    estado.resposta = { data: { erro: 'sem rede' }, error: null }
    await expect(buscarNovidades()).rejects.toThrow('sem rede')
  })
})

describe('radar dos portais com Supabase', () => {
  it('filtra por área quando pedida, mapeia visto_em e troca nulos por undefined; erro vira exceção', async () => {
    estado.portais = [{ id: 'n1', fonte: 'Câmara', tipo: 'Projeto', titulo: 'PL 1', resumo: null, link: 'https://x', data: null, termo: null, visto_em: '2026-11-02T10:00:00Z', afetados: null }]
    const todos = await radarPortais()
    expect(consultasPortais[0]).toEqual({ area: undefined })
    expect(todos[0]).toMatchObject({ id: 'n1', fonte: 'Câmara', tipo: 'Projeto', titulo: 'PL 1', link: 'https://x', vistoEm: '2026-11-02T10:00:00Z' })
    expect(todos[0]!.resumo).toBeUndefined(); expect(todos[0]!.data).toBeUndefined(); expect(todos[0]!.termo).toBeUndefined(); expect(todos[0]!.afetados).toBeUndefined()
    expect(todos[0]).not.toHaveProperty('visto_em')
    await radarPortais('trabalhista')
    expect(consultasPortais[1]).toEqual({ area: 'trabalhista' })
    estado.falhaPortais = 'tabela ausente'
    await expect(radarPortais()).rejects.toThrow('tabela ausente')
  })
})
