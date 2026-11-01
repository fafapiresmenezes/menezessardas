import { describe, it, expect, vi, beforeEach } from 'vitest'

// Servidor simulado: as RPCs de configuração nunca saem do teste.
const rpc = vi.fn()
const invoke = vi.fn()
vi.mock('./supabase', () => ({ supabaseConfigurado: false, supabase: { rpc, functions: { invoke } } }))
vi.mock('./trilha', () => ({ registrarEvento: vi.fn(async () => undefined) }))

const { estadoChaveIA, salvarChaveIA, removerChaveIA, testarChaveIA } = await import('./ia')
const { registrarEvento } = await import('./trilha')

describe('configuração da chave da IA', () => {
  beforeEach(() => { rpc.mockReset(); invoke.mockReset(); vi.mocked(registrarEvento).mockClear() })

  it('lê o estado sem nunca receber a chave', async () => {
    rpc.mockResolvedValue({ data: [{ permitido: true, definida: true, atualizado_em: '2026-11-01T00:00:00Z', sufixo: 'ab12' }], error: null })
    const e = await estadoChaveIA()
    expect(e).toEqual({ permitido: true, definida: true, atualizadoEm: '2026-11-01T00:00:00Z', sufixo: 'ab12' })
    expect(rpc).toHaveBeenCalledWith('estado_configuracao', { p_chave: 'anthropic_api_key' })
  })

  it('estado vazio vira "não definida"', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    expect(await estadoChaveIA()).toEqual({ permitido: false, definida: false, atualizadoEm: null, sufixo: null })
  })

  it('salvar envia o valor sem espaços e registra só o final na trilha', async () => {
    rpc.mockResolvedValue({ data: null, error: null })
    await salvarChaveIA('  sk-ant-segredo9999  ')
    expect(rpc).toHaveBeenCalledWith('definir_configuracao', { p_chave: 'anthropic_api_key', p_valor: 'sk-ant-segredo9999' })
    const resumo = vi.mocked(registrarEvento).mock.calls[0][0].resumo
    expect(resumo).toContain('…9999')
    expect(resumo).not.toContain('segredo')
  })

  it('erro do servidor vira mensagem em português', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'Permissão negada' } })
    await expect(removerChaveIA()).rejects.toThrow('Permissão negada')
    expect(registrarEvento).not.toHaveBeenCalled()
  })

  it('teste da chave devolve ok e modelo; motivo em JSON do servidor é repassado', async () => {
    invoke.mockResolvedValueOnce({ data: { ok: true, modelo: 'claude' }, error: null })
    expect(await testarChaveIA()).toEqual({ ok: true, modelo: 'claude' })
    invoke.mockResolvedValueOnce({ data: null, error: { message: 'x', context: { json: async () => ({ erro: 'Chave inválida' }) } } })
    await expect(testarChaveIA()).rejects.toThrow('Chave inválida')
    invoke.mockRejectedValueOnce(new Error(''))
    await expect(testarChaveIA()).rejects.toThrow('Não foi possível testar a IA agora.')
  })
})
