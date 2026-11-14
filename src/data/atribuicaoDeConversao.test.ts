// Habilidade 10 do replanejamento de mercado (14/11/2026): medição e atribuição de conversão.
import { describe, it, expect } from 'vitest'
import { FAMILIAS } from '@/data/caderno-familias'
import {
  atribuicaoPorCanal,
  canalComMelhorConversao,
  canaisDeTodasAsFamilias,
  AVISO_ATRIBUICAO,
  type RegistroDeOrigem,
} from '@/data/atribuicaoDeConversao'

const gerar = (n: number, convertidos: number, familia: RegistroDeOrigem['familia'], canal: string): RegistroDeOrigem[] =>
  Array.from({ length: n }, (_, i) => ({ familia, canal, convertido: i < convertidos }))

describe('medição e atribuição de conversão por canal (habilidade 10)', () => {
  it('não aponta taxa de conversão para canal com menos de 5 casos', () => {
    const registros = gerar(3, 2, 'dados-seguranca', 'indicacao-direta')
    const resultado = atribuicaoPorCanal('dados-seguranca', registros)
    expect(resultado[0].taxaDeConversao).toBeNull()
  })

  it('calcula a taxa de conversão corretamente quando há base mínima', () => {
    const registros = gerar(10, 6, 'dados-seguranca', 'indicacao-direta')
    const resultado = atribuicaoPorCanal('dados-seguranca', registros)
    expect(resultado[0].taxaDeConversao).toBeCloseTo(0.6, 6)
  })

  it('não mistura famílias diferentes na mesma conta', () => {
    const registros = [
      ...gerar(10, 6, 'dados-seguranca', 'indicacao-direta'),
      ...gerar(10, 2, 'bancos', 'indicacao-direta'),
    ]
    expect(atribuicaoPorCanal('dados-seguranca', registros)[0].total).toBe(10)
    expect(atribuicaoPorCanal('bancos', registros)[0].total).toBe(10)
  })

  it('devolve null quando nenhum canal tem base suficiente, em vez de arriscar um vencedor', () => {
    const registros = gerar(3, 2, 'dados-seguranca', 'indicacao-direta')
    expect(canalComMelhorConversao('dados-seguranca', registros)).toBeNull()
  })

  it('aponta o canal com maior conversão quando há base suficiente em mais de um canal', () => {
    const registros = [
      ...gerar(10, 8, 'dados-seguranca', 'indicacao-direta'),
      ...gerar(10, 3, 'dados-seguranca', 'evento-palestra'),
    ]
    expect(canalComMelhorConversao('dados-seguranca', registros)!.canal).toBe('indicacao-direta')
  })

  it('canaisDeTodasAsFamilias cobre as 6 famílias, uma vez cada', () => {
    const resultado = canaisDeTodasAsFamilias([])
    expect(resultado.length).toBe(FAMILIAS.length)
  })

  it('o aviso sempre lembra o limite do único toque', () => {
    expect(AVISO_ATRIBUICAO).toMatch(/único toque/)
  })
})
