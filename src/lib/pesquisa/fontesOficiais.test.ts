import { describe, it, expect } from 'vitest'
import { blocos, agruparPorProcesso, numerosParaImportar, type Publicacao } from './fontesOficiais'

const pub = (id: string, numero: string, data: string, extra: Partial<Publicacao> = {}): Publicacao => ({
  id, data, numero, tribunal: 'TJRJ', orgao: 'Vara', tipo: 'Intimação', documento: null, classe: 'Comum', texto: 't', link: null,
  partes: [{ nome: 'ACME LTDA', polo: 'P' }], advogados: [{ nome: 'Ana', oab: '1/RJ' }], ...extra,
})

describe('blocos de período', () => {
  it('12 meses em 4 blocos de 90 dias colados, do mais recente para o mais antigo, sem passar de 360 dias', () => {
    const b = blocos(12, new Date(2026, 10, 11))
    expect(b).toHaveLength(4)
    expect(b[0]).toEqual({ fim: '2026-11-11', inicio: '2026-08-14' })
    expect(b[1].fim).toBe('2026-08-13')
    expect(b[3].inicio).toBe('2025-11-17')
  })
  it('5 anos no máximo e pelo menos 1 mês', () => {
    expect(blocos(100, new Date(2026, 10, 11))).toHaveLength(20)
    expect(blocos(0, new Date(2026, 10, 11))).toEqual([{ fim: '2026-11-11', inicio: '2026-10-13' }])
  })
  it('nenhum bloco passa de 93 dias (limite da função)', () => {
    for (const x of blocos(60, new Date(2026, 1, 28))) expect((Date.parse(x.fim) - Date.parse(x.inicio)) / 86400000).toBeLessThanOrEqual(93)
  })
})

describe('lista de processos a partir das publicações', () => {
  it('agrupa por número, tira repetidas, junta partes e advogados sem duplicar e ordena pela mais recente', () => {
    const ps = agruparPorProcesso([
      pub('1', '0001234-56.2023.8.19.0001', '2026-01-10'),
      pub('2', '00012345620238190001', '2026-05-10', { partes: [{ nome: 'Acme Ltda', polo: 'P' }, { nome: 'José', polo: 'A' }], orgao: '2ª Vara' }),
      pub('2', '00012345620238190001', '2026-05-10'),
      pub('3', '0009999-11.2024.5.01.0001', '2026-03-01', { tribunal: 'TRT1' }),
      pub('4', '', '2026-03-01'),
    ])
    expect(ps).toHaveLength(2)
    expect(ps[0]).toMatchObject({ numero: '0001234-56.2023.8.19.0001', total: 2, primeira: '2026-01-10', ultima: '2026-05-10', orgao: '2ª Vara' })
    expect(ps[0].partes.map(p => p.nome)).toEqual(['ACME LTDA', 'José'])
    expect(ps[0].publicacoes.map(p => p.id)).toEqual(['2', '1'])
    expect(ps[1].tribunal).toBe('TRT1')
  })
  it('números para o importador, um por linha, só os de 20 dígitos', () => {
    const ps = agruparPorProcesso([pub('1', '0001234-56.2023.8.19.0001', '2026-01-10'), pub('2', '123', '2026-01-10')])
    expect(numerosParaImportar(ps)).toBe('0001234-56.2023.8.19.0001')
  })
})
