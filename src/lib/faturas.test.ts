import { describe, expect, it } from 'vitest'
import { linhasFatura } from '@/components/FaturasParceiros'

describe('linhasFatura', () => {
  it('monta as linhas da fatura com desconto e PIX', () => {
    const l = linhasFatura({ id: '1', escritorio_id: 'e', competencia: '2026-11-01', operadores: 2, leitores: 1, valor_cheio: 900, desconto_pct: 30, valor: 630, vencimento: '2026-11-10', criado_em: '', pago_em: null }, 'Teste', '000201BR')
    expect(l[0].texto).toMatch(/novembro de 2026/)
    expect(l.some(x => x.texto.includes('630,00'))).toBe(true)
    expect(l.some(x => x.texto.includes('30% no primeiro ano'))).toBe(true)
    expect(l[l.length - 1].texto).toBe('000201BR')
  })
})
