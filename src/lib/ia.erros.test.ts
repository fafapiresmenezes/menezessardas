// Passo 527: chave da IA — remoção com trilha e caminhos de erro do teste da chave.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn(async (_f: string, _p?: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: null, error: null }))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data?: Record<string, unknown> | null; error: (Error & { context?: unknown }) | null }> => ({ data: null, error: null }))
const registrarEvento = vi.fn(async (_e: object) => undefined)
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (f: string, p?: object) => rpc(f, p), functions: { invoke: (f: string, o?: object) => invoke(f, o) } } }))
vi.mock('./trilha', () => ({ registrarEvento: (e: object) => registrarEvento(e) }))
const { removerChaveIA, testarChaveIA, estadoChaveIA } = await import('./ia')

describe('chave da IA: remoção e erros', () => {
  beforeEach(() => { rpc.mockReset().mockResolvedValue({ data: null, error: null }); invoke.mockReset().mockResolvedValue({ data: null, error: null }); registrarEvento.mockClear() })

  it('remover chama a RPC e registra na trilha; erro não registra', async () => {
    await removerChaveIA()
    expect(rpc).toHaveBeenCalledWith('remover_configuracao', { p_chave: 'anthropic_api_key' })
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'configuracao_alterada', entidade: 'anthropic_api_key', resumo: 'Chave da IA removida' })
    registrarEvento.mockClear()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'só admin' } })
    await expect(removerChaveIA()).rejects.toThrow('só admin')
    expect(registrarEvento).not.toHaveBeenCalled()
  })

  it('testar: data.erro, erro sem corpo JSON, erro com JSON sem motivo e exceção sem mensagem', async () => {
    invoke.mockResolvedValueOnce({ data: { erro: 'Chave inválida' }, error: null })
    await expect(testarChaveIA()).rejects.toThrow('Chave inválida')
    invoke.mockResolvedValueOnce({ data: null, error: new Error('Failed to send a request') })
    await expect(testarChaveIA()).rejects.toThrow('Failed to send a request')
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('non-2xx'), { context: { json: async () => ({ ok: false }) } }) })
    await expect(testarChaveIA()).rejects.toThrow('non-2xx')
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error(''), { context: { json: async () => { throw new Error('corpo inválido') } } }) })
    await expect(testarChaveIA()).rejects.toThrow('Não foi possível testar a IA agora.')
    invoke.mockResolvedValueOnce({ data: { ok: true }, error: null })
    expect(await testarChaveIA()).toEqual({ ok: true, modelo: '' })
    expect(invoke).toHaveBeenLastCalledWith('analisar-contrato', { body: { teste: true } })
  })

  it('estado aceita linha única ou lista e nunca devolve a chave', async () => {
    rpc.mockResolvedValueOnce({ data: { permitido: true, definida: true, atualizado_em: '2026-11-01', sufixo: 'Qz9x' }, error: null })
    expect(await estadoChaveIA()).toEqual({ permitido: true, definida: true, atualizadoEm: '2026-11-01', sufixo: 'Qz9x' })
    rpc.mockResolvedValueOnce({ data: [{ permitido: false, definida: false, atualizado_em: null, sufixo: null }], error: null })
    expect(await estadoChaveIA()).toEqual({ permitido: false, definida: false, atualizadoEm: null, sufixo: null })
    expect(JSON.stringify(rpc.mock.calls)).not.toMatch(/sk-ant/)
  })
})
