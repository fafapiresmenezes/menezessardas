// Passo 425: trilha de auditoria encadeada por hash — registro, verificação e detecção de adulteração (modo navegador).
import { describe, it, expect, beforeEach } from 'vitest'

// Ambiente node sem Supabase configurado: a trilha fica num localStorage em memória.
const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
const { listarTrilha, registrarEvento, verificarTrilha } = await import('./trilha')
const CHAVE = 'lsm-trilha-v1'

describe('trilha', () => {
  beforeEach(() => mem.clear())

  it('trilha vazia é íntegra e tem selo gênese', async () => {
    expect(await verificarTrilha()).toEqual({ integra: true, total: 0, selo: '0'.repeat(64) })
  })

  it('cada evento aponta para o hash do anterior e a cadeia verifica', async () => {
    await registrarEvento({ tipo: 'imovel_criado', entidade: 'im1', resumo: 'Rua A' })
    await registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'Locação' })
    const eventos = await listarTrilha()
    expect(eventos.map(e => e.seq)).toEqual([1, 2])
    expect(eventos[0].hashAnterior).toBe('0'.repeat(64))
    expect(eventos[1].hashAnterior).toBe(eventos[0].hash)
    expect(eventos[1].hash).toMatch(/^[0-9a-f]{64}$/)
    expect(eventos[1].id).toBe(`2-${eventos[1].hash.slice(0, 8)}`)
    const v = await verificarTrilha()
    expect(v).toEqual({ integra: true, total: 2, selo: eventos[1].hash })
  })

  it('alterar um resumo no meio quebra a cadeia a partir daquele evento', async () => {
    for (let i = 1; i <= 3; i++) await registrarEvento({ tipo: 'documento_anexado', entidade: `d${i}`, resumo: `doc ${i}` })
    const eventos = await listarTrilha()
    eventos[1].resumo = 'doc 2 adulterado'
    mem.set(CHAVE, JSON.stringify(eventos))
    const v = await verificarTrilha()
    expect(v.integra).toBe(false)
    expect(v.quebraEm).toBe(2)
    expect(v.total).toBe(3)
  })

  it('remover um evento do meio também é detectado', async () => {
    for (let i = 1; i <= 3; i++) await registrarEvento({ tipo: 'documento_anexado', entidade: `d${i}`, resumo: `doc ${i}` })
    const eventos = await listarTrilha()
    mem.set(CHAVE, JSON.stringify([eventos[0], eventos[2]]))
    const v = await verificarTrilha()
    expect(v.integra).toBe(false)
    expect(v.quebraEm).toBe(3)
  })
})
