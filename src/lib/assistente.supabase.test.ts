// Passo 523: assistente jurídico com Supabase ligado — preferência no banco, histórico, apagar, perguntar via função e área de atuação.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } }
let linhaPref: Record<string, unknown> | null = null
let consultas: Record<string, unknown>[] = []
let erroLista: { message: string } | null = null
const upsert = vi.fn(async (_r: object) => ({ error: null }))
const del = vi.fn(async (_id: string): Promise<{ error: { message: string } | null }> => ({ error: null }))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data?: Record<string, unknown> | null; error: { message: string } | null }> => ({ data: null, error: null }))
let usuario: { id: string } | null = { id: 'u1' }
vi.mock('@/lib/supabase', () => ({
  supabaseConfigurado: true,
  supabase: {
    from: (t: string) => t === 'preferencias_usuario'
      ? { select: () => ({ maybeSingle: async () => ({ data: linhaPref }) }), upsert: (r: object) => upsert(r) }
      : { select: () => ({ order: () => ({ limit: async () => ({ data: consultas, error: erroLista }) }) }), delete: () => ({ eq: (_c: string, id: string) => del(id) }) },
    auth: { getUser: async () => ({ data: { user: usuario } }) },
    functions: { invoke: (f: string, o?: object) => invoke(f, o) },
  },
}))
const { especialidadePreferida, guardarEspecialidade, historicoConsultas, apagarConsulta, perguntar, lerAreaAtual, gravarAreaAtual } = await import('./assistente')

describe('assistente com Supabase', () => {
  beforeEach(() => { mem.clear(); linhaPref = null; consultas = []; erroLista = null; usuario = { id: 'u1' }; upsert.mockClear(); del.mockClear(); invoke.mockReset().mockResolvedValue({ data: null, error: null }) })

  it('preferência: o banco vence o navegador, que vence o padrão; guardar grava nos dois (só com usuário)', async () => {
    expect(await especialidadePreferida()).toBe('imobiliario')
    mem.set('lsm-especialidade', 'familia')
    expect(await especialidadePreferida()).toBe('familia')
    linhaPref = { especialidade: 'penal' }
    expect(await especialidadePreferida()).toBe('penal')
    await guardarEspecialidade('lgpd')
    expect(mem.get('lsm-especialidade')).toBe('lgpd')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1', especialidade: 'lgpd' }))
    usuario = null; upsert.mockClear()
    await guardarEspecialidade('geral')
    expect(upsert).not.toHaveBeenCalled()
  })

  it('histórico converte as linhas (modo padrão, matriz só no modo caminhos); apagar usa o id; erros viram exceção', async () => {
    consultas = [
      { id: 'c1', especialidade: 'imobiliario', modo: null, dados: null, pergunta: 'P1', resposta: 'R1', fontes: null, criado_em: '2026-11-01' },
      { id: 'c2', especialidade: 'civel', modo: 'caminhos', dados: { sintese: 's', caminhos: [], recomendado: 0, porque: '', proximosPassos: [] }, pergunta: 'P2', resposta: 'R2', fontes: [{ id: 'f', titulo: 'Lei', url: 'u' }], criado_em: '2026-11-02' },
      { id: 'c3', especialidade: 'civel', modo: 'redigir', dados: { x: 1 }, pergunta: 'P3', resposta: 'R3', fontes: [], criado_em: '2026-11-03' },
    ]
    const h = await historicoConsultas()
    expect(h.map(c => [c.id, c.modo, c.fontes.length, c.matriz !== undefined])).toEqual([['c1', 'responder', 0, false], ['c2', 'caminhos', 1, true], ['c3', 'redigir', 0, false]])
    await apagarConsulta('c2')
    expect(del).toHaveBeenCalledWith('c2')
    del.mockResolvedValueOnce({ error: { message: 'não é sua' } })
    await expect(apagarConsulta('c1')).rejects.toThrow('não é sua')
    erroLista = { message: 'tabela indisponível' }
    await expect(historicoConsultas()).rejects.toThrow('tabela indisponível')
  })

  it('perguntar envia as 3 últimas trocas em ordem cronológica, modo, contexto e estilo; devolve resposta, fontes, matriz e artigos; erro e data.erro viram exceção', async () => {
    invoke.mockResolvedValueOnce({ data: { resposta: 'Sim, art. 51.', fontes: [{ id: 'l', titulo: 'Lei', url: 'u' }], dados: { sintese: 'x', caminhos: [], recomendado: 0, porque: '', proximosPassos: [] }, artigosConsultados: [{ lei: '8.245/91', artigo: '51' }], consultadoEm: '2026-11-02T10:00:00Z' }, error: null })
    const hist = [1, 2, 3, 4].map(i => ({ id: `h${i}`, especialidade: 'imobiliario' as const, modo: 'responder' as const, pergunta: `P${i}`, resposta: `R${i}`, fontes: [], criadoEm: '' }))
    const c = await perguntar('Renova?', 'imobiliario', hist, 'caminhos', 'Tela: Agenda', false)
    expect(invoke).toHaveBeenCalledWith('assistente-juridico', { body: { pergunta: 'Renova?', especialidade: 'imobiliario', historico: [
      { papel: 'usuario', texto: 'P3' }, { papel: 'assistente', texto: 'R3' }, { papel: 'usuario', texto: 'P2' }, { papel: 'assistente', texto: 'R2' }, { papel: 'usuario', texto: 'P1' }, { papel: 'assistente', texto: 'R1' },
    ], modo: 'caminhos', contexto: 'Tela: Agenda', estilo: false } })
    expect(c).toMatchObject({ especialidade: 'imobiliario', modo: 'caminhos', pergunta: 'Renova?', resposta: 'Sim, art. 51.', criadoEm: '2026-11-02T10:00:00Z', artigosConsultados: [{ lei: '8.245/91', artigo: '51' }] })
    expect(c.matriz?.sintese).toBe('x')
    expect(typeof c.id).toBe('string')
    invoke.mockResolvedValueOnce({ data: { resposta: 'R', consultadoEm: 't' }, error: null })
    const r = await perguntar('Simples', 'geral', [])
    expect(r.fontes).toEqual([]); expect(r.matriz).toBeUndefined()
    expect(invoke).toHaveBeenLastCalledWith('assistente-juridico', { body: { pergunta: 'Simples', especialidade: 'geral', historico: [], modo: 'responder', contexto: '', estilo: true } })
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'Function not found' } })
    await expect(perguntar('x', 'geral', [])).rejects.toThrow('Function not found')
    invoke.mockResolvedValueOnce({ data: { erro: 'Teto mensal de IA atingido' }, error: null })
    await expect(perguntar('x', 'geral', [])).rejects.toThrow('Teto mensal de IA atingido')
  })

  it('área de atuação: banco, depois navegador, depois imobiliário; gravar escreve nos dois só com usuário', async () => {
    expect(await lerAreaAtual()).toBe('imobiliario')
    mem.set('lsm-area', 'penal')
    expect(await lerAreaAtual()).toBe('penal')
    linhaPref = { area: 'familia' }
    expect(await lerAreaAtual()).toBe('familia')
    await gravarAreaAtual('tributario')
    expect(mem.get('lsm-area')).toBe('tributario')
    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ usuario_id: 'u1', area: 'tributario' }))
    usuario = null; upsert.mockClear()
    await gravarAreaAtual('civel')
    expect(upsert).not.toHaveBeenCalled()
  })
})
