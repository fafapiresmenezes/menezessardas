// Passo 427: exportação da trilha por período em PDF — filtro por datas, hash do arquivo e registro do próprio ato.
import { describe, it, expect, beforeEach, vi } from 'vitest'

const mem = new Map<string, string>()
;(globalThis as { localStorage?: unknown }).localStorage = {
  getItem: (k: string) => mem.get(k) ?? null,
  setItem: (k: string, v: string) => { mem.set(k, v) },
  removeItem: (k: string) => { mem.delete(k) },
}
// Sem rede nos testes: os calendários OpenTimestamps "falham" e o selo fica nulo, como no modo sem internet.
vi.stubGlobal('fetch', vi.fn(async () => { throw new Error('sem rede') }))

const { registrarEvento, listarTrilha } = await import('./trilha')
const { exportarTrilhaPeriodo } = await import('./exportarTrilha')
const texto = (b: Uint8Array) => Array.from(b).map(c => String.fromCharCode(c)).join('')
const hoje = new Date().toISOString().slice(0, 10)

describe('exportarTrilhaPeriodo', () => {
  beforeEach(() => mem.clear())

  it('gera PDF com os registros do período, SHA-256 do arquivo e registra o ato na trilha', async () => {
    await registrarEvento({ tipo: 'imovel_criado', entidade: 'im1', resumo: 'Rua das Laranjeiras, 10' })
    await registrarEvento({ tipo: 'contrato_criado', entidade: 'c1', resumo: 'Locação residencial' })
    const r = await exportarTrilhaPeriodo(hoje, hoje)
    expect(r.total).toBe(2)
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(r.ots).toBeNull()
    expect(r.calendario).toBeNull()
    expect(r.nomeBase).toBe(`trilha-${hoje}-a-${hoje}`)
    const s = texto(r.pdf)
    expect(s.startsWith('%PDF-1.4')).toBe(true)
    expect(s).toContain('THEYE Institute')
    expect(s).toContain('Cadeia \xedntegra: 2 registro')
    expect(s).toContain('Rua das Laranjeiras, 10')
    const depois = await listarTrilha()
    expect(depois).toHaveLength(3)
    expect(depois[2].tipo).toBe('trilha_ancorada')
    expect(depois[2].resumo).toContain(r.sha256)
    expect(depois[2].resumo).toContain('selo não obtido')
  })

  it('período sem registros avisa no PDF e aponta cadeia vazia', async () => {
    const r = await exportarTrilhaPeriodo('2020-01-01', '2020-01-31')
    expect(r.total).toBe(0)
    expect(texto(r.pdf)).toContain('Nenhum registro no per\xedodo.')
  })

  it('hashes diferentes para conteúdos diferentes', async () => {
    await registrarEvento({ tipo: 'imovel_criado', entidade: 'a', resumo: 'A' })
    const r1 = await exportarTrilhaPeriodo(hoje, hoje)
    await registrarEvento({ tipo: 'imovel_criado', entidade: 'b', resumo: 'B' })
    const r2 = await exportarTrilhaPeriodo(hoje, hoje)
    expect(r1.sha256).not.toBe(r2.sha256)
    expect(r2.total).toBeGreaterThan(r1.total)
  })
})
