import { describe, it, expect, vi, beforeEach } from 'vitest'

const invoke = vi.fn()
const rpc = vi.fn()
vi.mock('@/lib/supabase', () => ({ supabase: { functions: { invoke }, rpc } }))

const { contarVisita, listarVisitas } = await import('./visitas')

describe('contagem de visitas da porta (V10)', () => {
  beforeEach(() => { invoke.mockReset(); rpc.mockReset() })

  it('contarVisita manda tipo e chave para a função de servidor, e dispara-e-esquece', () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    contarVisita('idioma', 'pt')
    expect(invoke).toHaveBeenCalledWith('contar-visita', { body: { tipo: 'idioma', chave: 'pt' } })
  })

  it('visita simples vai sem chave', () => {
    invoke.mockResolvedValue({ data: { ok: true }, error: null })
    contarVisita('visita')
    expect(invoke).toHaveBeenCalledWith('contar-visita', { body: { tipo: 'visita', chave: '' } })
  })

  it('se a função de servidor falhar, nunca estoura para a tela', () => {
    invoke.mockRejectedValue(new Error('sem rede'))
    expect(() => contarVisita('quadradinho', 'engenharia')).not.toThrow()
  })

  it('listarVisitas lê pela função que só o admin do Instituto passa', async () => {
    rpc.mockResolvedValue({ data: [{ dia: '2026-11-14', tipo: 'visita', chave: '', n: 3 }], error: null })
    const linhas = await listarVisitas(30)
    expect(rpc).toHaveBeenCalledWith('visitas_porta_listar', { p_dias: 30 })
    expect(linhas[0].n).toBe(3)
  })

  it('listarVisitas repassa o erro do banco', async () => {
    rpc.mockResolvedValue({ data: null, error: new Error('sem permissão') })
    await expect(listarVisitas()).rejects.toThrow('sem permissão')
  })
})
