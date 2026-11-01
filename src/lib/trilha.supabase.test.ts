// Passo 526: trilha de auditoria com Supabase ligado — leitura convertida, registro encadeado no banco, verificação e tolerância a falhas.
import { describe, it, expect, vi, beforeEach } from 'vitest'

let linhas: Record<string, unknown>[] = []
const insert = vi.fn(async (r: Record<string, unknown>) => { linhas.push({ id: linhas.length + 1, ...r, criado_em: new Date(String(r.criado_em)).toISOString().replace('Z', '+00:00') }); return { error: null } })
let falhaLeitura = false
vi.mock('./supabase', () => ({ supabaseConfigurado: true, supabase: { from: () => ({ select: () => ({ order: async () => { if (falhaLeitura) throw new Error('rede'); return { data: linhas } } }), insert: (r: Record<string, unknown>) => insert(r) }) } }))
const { listarTrilha, registrarEvento, verificarTrilha } = await import('./trilha')

describe('trilha com Supabase', () => {
  beforeEach(() => { linhas = []; insert.mockClear(); falhaLeitura = false })

  it('registra eventos encadeados no banco (seq, hash anterior e hash) e a leitura converte as colunas', async () => {
    await registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'Contrato de Ana' })
    await registrarEvento({ tipo: 'acesso_alterado', entidade: 'u2', resumo: 'Acesso de paulo: Leitura' })
    expect(insert).toHaveBeenCalledTimes(2)
    const [a, b] = insert.mock.calls.map(c => c[0])
    expect(a).toMatchObject({ seq: 1, tipo: 'contrato_criado', entidade: 'c1', resumo: 'Contrato de Ana' })
    expect(String(a!.hash_anterior)).toMatch(/^[0-9a-f]{64}$|^0+$|^genese$/i)
    expect(String(a!.hash)).toMatch(/^[0-9a-f]{64}$/)
    expect(b).toMatchObject({ seq: 2, hash_anterior: a!.hash })
    const lista = await listarTrilha()
    expect(lista).toHaveLength(2)
    expect(lista[1]).toEqual({ id: '2', seq: 2, em: String(b!.criado_em), tipo: 'acesso_alterado', entidade: 'u2', resumo: 'Acesso de paulo: Leitura', hashAnterior: String(a!.hash), hash: String(b!.hash) })
    const v = await verificarTrilha()
    expect(v).toEqual({ integra: true, total: 2, selo: String(b!.hash) })
  })

  it('entidade e resumo nulos no banco viram texto vazio; alteração no banco quebra a verificação', async () => {
    await registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'x' })
    await registrarEvento({ tipo: 'contrato_criado', entidade: 'c2', resumo: 'y' })
    linhas[0]!.entidade = null; linhas[0]!.resumo = null
    const l = await listarTrilha()
    expect(l[0]).toMatchObject({ entidade: '', resumo: '' })
    const v = await verificarTrilha()
    expect(v.integra).toBe(false)
    expect(v.quebraEm).toBe(1)
    expect(v.total).toBe(2)
    expect(v.selo).toBe(l[1]!.hash)
  })

  it('falha na leitura não derruba o registro (best-effort) nem a ação principal', async () => {
    falhaLeitura = true
    await expect(registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'x' })).resolves.toBeUndefined()
    expect(insert).not.toHaveBeenCalled()
    falhaLeitura = false
    insert.mockImplementationOnce(async () => { throw new Error('RLS') })
    await expect(registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'x' })).resolves.toBeUndefined()
    expect(await listarTrilha()).toEqual([])
  })
})
