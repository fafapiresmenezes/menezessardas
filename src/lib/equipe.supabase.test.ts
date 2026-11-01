// Passo 522: equipe com Supabase ligado — perfil, listagem, funções, senha provisória, sede e escritórios parceiros.
import { describe, it, expect, vi, beforeEach } from 'vitest'

const rpc = vi.fn(async (_f: string, _p?: object): Promise<{ data?: unknown; error: { message: string } | null }> => ({ data: null, error: null }))
const invoke = vi.fn(async (_f: string, _o?: object): Promise<{ data?: { erro?: string } | null; error: (Error & { context?: unknown }) | null }> => ({ data: null, error: null }))
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { rpc: (f: string, p?: object) => rpc(f, p), functions: { invoke: (f: string, o?: object) => invoke(f, o) } } }))
const registrarEvento = vi.fn(async (_e: object) => undefined)
vi.mock('./trilha', () => ({ registrarEvento: (e: object) => registrarEvento(e) }))
const mem = new Map<string, string>()
;(globalThis as { sessionStorage?: unknown }).sessionStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) }, removeItem: (k: string) => { mem.delete(k) } }
const { perfilAtual, listarPessoas, definirFuncao, definirSenhaProvisoria, ehSede, listarEscritorios, criarEscritorio, moverParaEscritorio, escritorioDasPessoas } = await import('./equipe')

const pessoa = { id: 'u2', email: 'paulo@gmenezes.com', nome: 'Paulo', funcao: 'operador' as const, criadoEm: '2026-09-03', confirmado: true, ultimoAcesso: null }

describe('equipe com Supabase', () => {
  beforeEach(() => { rpc.mockReset().mockResolvedValue({ data: null, error: null }); invoke.mockReset().mockResolvedValue({ data: null, error: null }); registrarEvento.mockClear(); mem.clear() })

  it('perfilAtual lê a RPC e devolve null sem perfil; erro vira exceção', async () => {
    rpc.mockResolvedValueOnce({ data: 'leitor', error: null })
    expect(await perfilAtual()).toBe('leitor')
    expect(rpc.mock.calls[0]![0]).toBe('perfil_atual')
    expect(await perfilAtual()).toBeNull()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'JWT expirado' } })
    await expect(perfilAtual()).rejects.toThrow('JWT expirado')
  })

  it('listarPessoas converte as colunas do banco (nome cai no e-mail, função nula, último acesso opcional)', async () => {
    rpc.mockResolvedValueOnce({ data: [
      { id: 1, email: 'a@x.com', nome_completo: 'Ana', funcao: 'admin', criado_em: '2026-01-01', confirmado: true, ultimo_acesso: '2026-10-01' },
      { id: 2, email: 'b@x.com', nome_completo: null, funcao: null, criado_em: '2026-02-01', confirmado: 0, ultimo_acesso: null },
    ], error: null })
    const l = await listarPessoas()
    expect(l).toEqual([
      { id: '1', email: 'a@x.com', nome: 'Ana', funcao: 'admin', criadoEm: '2026-01-01', confirmado: true, ultimoAcesso: '2026-10-01' },
      { id: '2', email: 'b@x.com', nome: 'b@x.com', funcao: null, criadoEm: '2026-02-01', confirmado: false, ultimoAcesso: null },
    ])
    expect(await listarPessoas()).toEqual([])
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'só admin' } })
    await expect(listarPessoas()).rejects.toThrow('só admin')
  })

  it('definirFuncao chama a RPC e registra na trilha; com erro não registra', async () => {
    await definirFuncao(pessoa, 'leitor')
    expect(rpc).toHaveBeenCalledWith('definir_funcao', { p_id: 'u2', p_funcao: 'leitor' })
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'acesso_alterado', entidade: 'u2', resumo: 'Acesso de paulo@gmenezes.com: Leitura' })
    await definirFuncao(pessoa, null)
    expect(registrarEvento).toHaveBeenLastCalledWith(expect.objectContaining({ resumo: 'Acesso de paulo@gmenezes.com: Sem acesso' }))
    registrarEvento.mockClear()
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'não pode remover o último admin' } })
    await expect(definirFuncao(pessoa, 'admin')).rejects.toThrow('não pode remover o último admin')
    expect(registrarEvento).not.toHaveBeenCalled()
  })

  it('definirSenhaProvisoria envia a senha gerada à função, registra na trilha e devolve a senha; erros do corpo e do data viram exceção', async () => {
    const senha = await definirSenhaProvisoria(pessoa)
    expect(senha).toMatch(/^LSM-[A-Z2-9]{4}-[A-Z2-9]{4}$/)
    expect(invoke).toHaveBeenCalledWith('definir-senha-provisoria', { body: { id: 'u2', senha } })
    expect(registrarEvento).toHaveBeenCalledWith({ tipo: 'acesso_alterado', entidade: 'u2', resumo: 'Senha provisória definida para paulo@gmenezes.com' })
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('non-2xx'), { context: { json: async () => ({ erro: 'Só administradores' }) } }) })
    await expect(definirSenhaProvisoria(pessoa)).rejects.toThrow('Só administradores')
    invoke.mockResolvedValueOnce({ data: null, error: Object.assign(new Error('Failed to fetch'), { context: { json: async () => { throw new Error('x') } } }) })
    await expect(definirSenhaProvisoria(pessoa)).rejects.toThrow('Failed to fetch')
    invoke.mockResolvedValueOnce({ data: { erro: 'usuário não encontrado' }, error: null })
    await expect(definirSenhaProvisoria(pessoa)).rejects.toThrow('usuário não encontrado')
  })

  it('ehSede consulta uma vez e guarda na sessão; false só quando o banco diz false', async () => {
    rpc.mockResolvedValueOnce({ data: false, error: null })
    expect(await ehSede()).toBe(false)
    expect(mem.get('gm-sede')).toBe('0')
    expect(await ehSede()).toBe(false)
    expect(rpc).toHaveBeenCalledTimes(1)
    mem.clear()
    rpc.mockResolvedValueOnce({ data: true, error: null })
    expect(await ehSede()).toBe(true)
    expect(mem.get('gm-sede')).toBe('1')
    mem.clear()
    rpc.mockResolvedValueOnce({ data: null, error: null })
    expect(await ehSede()).toBe(true)
  })

  it('escritórios: cobrança convertida em números, criar e mover passam os parâmetros, mapa pessoa→escritório ignora quem não tem', async () => {
    rpc.mockResolvedValueOnce({ data: [{ id: 'e1', nome: 'Sede', plano: 'sede', criado_em: '2026-10-30', operadores: '3', leitores: '1', mensal: '1290', mensal_1ano: '903' }], error: null })
    expect(await listarEscritorios()).toEqual([{ id: 'e1', nome: 'Sede', plano: 'sede', criadoEm: '2026-10-30', operadores: 3, leitores: 1, mensal: 1290, mensal1Ano: 903 }])
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'só a sede' } })
    await expect(listarEscritorios()).rejects.toThrow('só a sede')
    await criarEscritorio('Parceiro X')
    expect(rpc).toHaveBeenLastCalledWith('criar_escritorio', { p_nome: 'Parceiro X' })
    await moverParaEscritorio('u9', 'e2')
    expect(rpc).toHaveBeenLastCalledWith('mover_para_escritorio', { p_id: 'u9', p_escritorio: 'e2' })
    rpc.mockResolvedValueOnce({ data: null, error: { message: 'nome repetido' } })
    await expect(criarEscritorio('Sede')).rejects.toThrow('nome repetido')
    rpc.mockResolvedValueOnce({ data: [{ id: 'u1', escritorio_id: 'e1' }, { id: 'u2', escritorio_id: null }, { id: 'u3', escritorio_id: 'e2' }], error: null })
    expect(await escritorioDasPessoas()).toEqual({ u1: 'e1', u3: 'e2' })
  })
})
