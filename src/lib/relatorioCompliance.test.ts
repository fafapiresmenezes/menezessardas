import { describe, it, expect, vi } from 'vitest'
const selar = vi.fn(async (_h: string) => ({ ots: new Uint8Array([1, 2, 3]), calendario: 'https://alice.btc.calendar.opentimestamps.org' }))
const registrar = vi.fn(async (_e: object) => undefined)
vi.mock('@/lib/exportarTrilha', () => ({ selarDigest: (h: string) => selar(h) }))
vi.mock('@/lib/trilha', () => ({ registrarEvento: (e: object) => registrar(e) }))
const { linhasDoRelatorio, gerarRelatorioSelado } = await import('./relatorioCompliance')

const dados = { empresa: 'Loja Ômega', geral: 61, nivel: 'em desenvolvimento', pilares: [{ nome: 'Alta direção', nota: 50 }, { nome: 'LGPD', nota: null }], lacunas: [{ pilar: 'LGPD', acao: 'Nomear o encarregado.', base: 'art. 41', v: 1 }, { pilar: 'Alta direção', acao: 'Aprovar o código.', base: 'art. 57, I', v: 0 }], codigo: 'ab'.repeat(32) }

describe('D08: relatório de compliance selado', () => {
  it('linhas: cabeçalho, nota por pilar, plano ordenado pela prioridade com prazos de 30/60 dias e código de integridade', () => {
    const L = linhasDoRelatorio(dados, new Date('2026-11-06T12:00:00'))
    const t = L.map(l => l.texto).join('\n')
    expect(t).toContain('Nota geral: 61% · programa em desenvolvimento')
    expect(t).toContain('LGPD: não respondido')
    expect(t.indexOf('1. [ALTA · até 06/12/2026] Alta direção')).toBeGreaterThan(0)
    expect(t.indexOf('2. [média · até 05/01/2027] LGPD')).toBeGreaterThan(t.indexOf('1. [ALTA'))
    expect(t).toContain('Código de integridade')
  })
  it('gera o PDF, calcula o SHA-256, pede o selo, registra na trilha e nomeia o arquivo; sem selo segue sem .ots', async () => {
    const r = await gerarRelatorioSelado(dados)
    expect(String.fromCharCode(...r.pdf.slice(0, 5))).toBe('%PDF-')
    expect(r.sha256).toMatch(/^[0-9a-f]{64}$/)
    expect(selar).toHaveBeenCalledWith(r.sha256)
    expect(r.ots).toEqual(new Uint8Array([1, 2, 3])); expect(r.calendario).toContain('alice')
    expect(r.nomeBase).toMatch(/^compliance-loja-omega-\d{4}-\d{2}-\d{2}$/)
    expect(registrar).toHaveBeenCalledWith(expect.objectContaining({ tipo: 'trilha_ancorada', entidade: r.nomeBase, resumo: expect.stringContaining('selo OpenTimestamps via') }))
    selar.mockResolvedValueOnce(null as never)
    const s = await gerarRelatorioSelado(dados)
    expect(s.ots).toBeNull(); expect(s.calendario).toBeNull()
  })
})
