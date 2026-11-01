// Passos 415–416: previsões explicáveis — mediana por m², fatores de risco/renovação, receita e intervalo de Wilson.
import { describe, it, expect } from 'vitest'
import { medianaM2, preverContrato, preverCarteira, preverReceita, intervaloWilson } from './predicao'
import type { Contrato, Imovel } from './repositorio'
import { emDias } from './datas'

const imovel = (id: string, areaM2?: number, docs: string[] = []): Imovel => ({
  id, endereco: `Rua ${id}`, cidade: 'Rio de Janeiro', uf: 'RJ', tipo: 'apartamento' as Imovel['tipo'], uso: 'locado', proprietario: 'P', matricula: '1', notas: '', areaM2,
  documentos: docs.map((v, i) => ({ id: `${id}-d${i}`, tipo: 'outro' as never, nome: 'doc', enviadoEm: emDias(-30), dataVencimento: v })),
})
const contrato = (id: string, imovelId: string, valor: number, venc: string | null, extra: Partial<Contrato> = {}): Contrato => ({
  id, imovelId, tipo: 'locacao' as Contrato['tipo'], parte: 'Locatário', dataInicio: emDias(-200), dataVencimento: venc, valor, periodicidade: 'mensal',
  indice: 'igpm', garantia: 'seguro_fianca', dataUltimoReajuste: emDias(-100), notas: '', criadoEm: emDias(-200), documentos: [], ...extra,
} as Contrato)

describe('medianaM2', () => {
  it('mediana do valor mensal por m² só dos contratos ativos com área cadastrada', () => {
    const imoveis = [imovel('1', 100), imovel('2', 50), imovel('3', undefined), imovel('4', 10)]
    const contratos = [
      contrato('a', '1', 3000, emDias(100)),   // 30/m²
      contrato('b', '2', 5000, emDias(100)),   // 100/m²
      contrato('c', '3', 9000, emDias(100)),   // sem área → fora
      contrato('d', '4', 1000, emDias(-5)),    // vencido → fora
    ]
    expect(medianaM2(contratos, imoveis)).toBe(100)
    expect(medianaM2([], imoveis)).toBeNull()
  })
})

describe('preverContrato', () => {
  it('contrato saudável: risco baixo, base de renovação 60 + 5 (reajuste em dia)', () => {
    const p = preverContrato(contrato('a', '1', 3000, emDias(300)), imovel('1', 100), null)
    expect(p.risco).toBe(4)
    expect(p.faixaRisco).toBe('baixo')
    expect(p.renovacao).toBe(65)
    expect(p.acao).toBe('Manter acompanhamento normal.')
  })
  it('sem garantia, vencido e reajuste atrasado: risco alto e ação de formalizar', () => {
    const p = preverContrato(contrato('a', '1', 3000, emDias(-10), { garantia: 'sem_garantia', dataUltimoReajuste: emDias(-500), dataInicio: emDias(-800) }), imovel('1', 100), null)
    expect(p.fatoresRisco.map(f => f.pontos)).toEqual([30, 15, 25])
    expect(p.risco).toBe(70)
    expect(p.faixaRisco).toBe('alto')
    expect(p.acao).toMatch(/Formalizar renovação/)
    expect(p.renovacao).toBe(60 - 8 - 15 - 10)
  })
  it('aluguel 50% acima da mediana por m² soma risco e reduz renovação; abaixo aumenta renovação', () => {
    const caro = preverContrato(contrato('a', '1', 4500, emDias(300)), imovel('1', 100), 30)
    expect(caro.fatoresRisco.some(f => f.fator.includes('50% acima da mediana'))).toBe(true)
    expect(caro.renovacao).toBe(65 - 12)
    const barato = preverContrato(contrato('a', '1', 2000, emDias(300)), imovel('1', 100), 30)
    expect(barato.renovacao).toBe(75)
  })
  it('documentos do imóvel vencidos somam até 15 pontos; limites 0–100 e 5–95 são respeitados', () => {
    const p = preverContrato(contrato('a', '1', 3000, emDias(300)), imovel('1', 100, [emDias(-1), emDias(-2), emDias(-3)]), null)
    expect(p.fatoresRisco.find(f => f.fator.includes('documento'))?.pontos).toBe(15)
    expect(p.risco).toBeLessThanOrEqual(100)
    expect(p.renovacao).toBeGreaterThanOrEqual(5)
  })
})

describe('preverCarteira / preverReceita', () => {
  it('ordena por risco, inclui vencidos não encerrados e exclui aditivos', () => {
    const imoveis = [imovel('1', 100)]
    const r = preverCarteira(imoveis, [
      contrato('ok', '1', 3000, emDias(300)),
      contrato('venc', '1', 3000, emDias(-10), { garantia: 'sem_garantia' }),
      contrato('adit', '1', 100, emDias(300), { natureza: 'aditivo' }),
      contrato('enc', '1', 100, emDias(-10), { encerradoEm: emDias(-1) }),
    ])
    expect(r.map(p => p.contrato.id)).toEqual(['venc', 'ok'])
  })
  it('receita contratada só conta contratos vigentes; esperada aplica renovação e índice', () => {
    const p = preverContrato(contrato('a', '1', 1000, emDias(45), { indice: 'sem_reajuste' }), undefined, null)
    const serie = preverReceita([p], {}, 3)
    expect(serie).toHaveLength(3)
    expect(serie[0]).toMatchObject({ contratada: 1000, esperada: 1000 })
    expect(serie[2].contratada).toBe(0)
    expect(serie[2].esperada).toBe(Math.round(1000 * p.renovacao / 100))
    const comIndice = preverReceita([preverContrato(contrato('b', '1', 1000, emDias(400), { indice: 'igpm', dataUltimoReajuste: emDias(-370) }), undefined, null)], { igpm: 10 }, 1)
    expect(comIndice[0].contratada).toBe(1100)
  })
})

describe('intervaloWilson', () => {
  it('amostra pequena dá intervalo largo; amostra grande, estreito; n=0 é null', () => {
    expect(intervaloWilson(1, 0)).toBeNull()
    expect(intervaloWilson(3, 4)).toEqual({ min: 30, max: 95 })
    const g = intervaloWilson(750, 1000)!
    expect(g.min).toBeGreaterThanOrEqual(72)
    expect(g.max).toBeLessThanOrEqual(78)
    expect(intervaloWilson(0, 10)!.min).toBe(0)
    expect(intervaloWilson(10, 10)!.max).toBe(100)
  })
})
