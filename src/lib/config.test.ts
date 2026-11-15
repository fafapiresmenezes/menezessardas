import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn()
const tabela = { select: vi.fn(), upsert: vi.fn() }
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (...a: unknown[]) => rpc(...a), from: () => tabela } }))
const { lerConfig, lerConfigPrefixo, gravarConfig, gravarMinhaTela } = await import('./config')

const SEM_FUNCAO = { data: null, error: { code: 'PGRST202', message: 'Could not find the function public.config_ler' } }

describe('Configurações por escritório', () => {
  beforeEach(() => { rpc.mockReset(); tabela.select.mockReset(); tabela.upsert.mockReset() })

  it('lê pelas funções do banco, que devolvem só o que é do escritório de quem pede', async () => {
    rpc.mockResolvedValue({ data: [{ chave: 'cargos', valor: '{"u1":"socio"}' }], error: null })
    expect(await lerConfig(['cargos', 'metas_okr'])).toEqual({ cargos: '{"u1":"socio"}' })
    expect(rpc).toHaveBeenCalledWith('config_ler', { p_chaves: ['cargos', 'metas_okr'] })
    rpc.mockResolvedValue({ data: [{ chave: 'escrita_linguagem_voz', valor: 'ativa' }], error: null })
    expect(await lerConfigPrefixo('escrita_')).toEqual({ escrita_linguagem_voz: 'ativa' })
    expect(rpc).toHaveBeenLastCalledWith('config_ler', { p_prefixo: 'escrita_' })
  })

  it('grava tudo de uma vez pela função do banco e repassa a recusa em português', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await gravarConfig({ cargos: '{}' })
    expect(rpc).toHaveBeenCalledWith('config_gravar', { p_itens: { cargos: '{}' } })
    rpc.mockResolvedValue({ data: null, error: { code: 'P0001', message: 'Só a administração do escritório pode salvar isto.' } })
    await expect(gravarConfig({ cargos: '{}' })).rejects.toThrow('Só a administração do escritório')
    expect(tabela.upsert).not.toHaveBeenCalled()
  })

  it('enquanto o banco não tem as funções, usa o caminho antigo em vez de quebrar a tela', async () => {
    rpc.mockResolvedValue(SEM_FUNCAO)
    tabela.select.mockReturnValue({ in: async () => ({ data: [{ chave: 'cargos', valor: '{}' }] }), like: async () => ({ data: [{ chave: 'escrita_a', valor: '1' }] }) })
    tabela.upsert.mockResolvedValue({ error: null })
    expect(await lerConfig(['cargos'])).toEqual({ cargos: '{}' })
    expect(await lerConfigPrefixo('escrita_')).toEqual({ escrita_a: '1' })
    await gravarConfig({ metas_okr: '{}' })
    expect(tabela.upsert).toHaveBeenCalledWith([{ chave: 'metas_okr', valor: '{}' }], { onConflict: 'chave' })
    expect(await gravarMinhaTela('/meu-dia')).toBe(false)
  })

  it('a tela inicial é gravada só para quem pede', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await gravarMinhaTela(null)).toBe(true)
    expect(rpc).toHaveBeenCalledWith('preferencia_gravar', { p_tela: null })
  })

  it('pedido sem chave nenhuma não vai ao banco', async () => {
    expect(await lerConfig([])).toEqual({})
    expect(rpc).not.toHaveBeenCalled()
  })
})
