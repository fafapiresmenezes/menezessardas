import { describe, it, expect } from 'vitest'
import {
  CONFIANCA,
  MINIMO_DE_COMPARACOES,
  backtest,
  comparar,
  emPalavras,
  indicesDoCiclo,
  ingenuo,
  mediana,
  passoEmDias,
  quantil,
  relatorio,
  reta,
  sazonalIngenuo,
  sazonalMaisTendencia,
  somarDias,
  type Serie,
} from './baseline'

/**
 * O que estes testes prendem: que o backtest só enxerga o passado, que nenhuma previsão sai sem
 * intervalo, e — o que mais importa — que um modelo que NÃO bate o palpite simples é reprovado
 * com motivo escrito. É fácil escrever um relatório que sempre aprova; o teste abaixo existe para
 * que este não seja um deles.
 */

/**
 * Ruído repetível, para o teste não depender de sorte. É o gerador de Lehmer, escolhido porque as
 * contas cabem inteiras no número do JavaScript: um gerador com multiplicador grande estoura a
 * precisão e devolve lixo que só parece aleatório.
 */
function ruido(semente: number) {
  let s = semente
  return () => {
    s = (s * 48271) % 2147483647
    return s / 2147483647 - 0.5
  }
}

function serieComCiclo(n = 80): Serie {
  const r = ruido(7)
  return {
    id: 'teste',
    nome: 'Série com tendência e ciclo de 7',
    unidade: 'm',
    periodo: 7,
    pontos: Array.from({ length: n }, (_, t) => ({
      quando: somarDias('2026-01-01', t),
      valor: 100 + 0.5 * t + 6 * Math.sin((2 * Math.PI * t) / 7) + r(),
    })),
  }
}

function passeioAleatorio(n = 80): Serie {
  const r = ruido(13)
  let v = 50
  return {
    id: 'passeio',
    nome: 'Passeio aleatório',
    unidade: 'un',
    periodo: 7,
    pontos: Array.from({ length: n }, (_, t) => {
      v += r() * 4
      return { quando: somarDias('2026-01-01', t), valor: v }
    }),
  }
}

describe('contas de apoio', () => {
  it('quantil e mediana', () => {
    expect(quantil([1, 2, 3, 4], 0)).toBe(1)
    expect(quantil([1, 2, 3, 4], 1)).toBe(4)
    expect(mediana([1, 2, 3, 4])).toBe(2.5)
    expect(mediana([3, 1, 2])).toBe(2)
    expect(quantil([], 0.5)).toBe(0)
  })

  it('o passo da série sai pela mediana e aguenta um buraco', () => {
    const p = [
      { quando: '2026-01-01', valor: 1 },
      { quando: '2026-01-02', valor: 1 },
      { quando: '2026-01-10', valor: 1 },
      { quando: '2026-01-11', valor: 1 },
    ]
    expect(passoEmDias(p)).toBe(1)
    expect(passoEmDias([{ quando: '2026-01-01', valor: 1 }])).toBe(1)
  })

  it('a reta acha a inclinação certa', () => {
    const { a, b } = reta([2, 4, 6, 8])
    expect(a).toBeCloseTo(2, 6)
    expect(b).toBeCloseTo(2, 6)
  })

  it('o ciclo só é estimado com dois ciclos completos, e seus índices somam zero', () => {
    expect(indicesDoCiclo([1, 2, 3, 4, 5, 6, 7], 7).every(x => x === 0)).toBe(true)
    const indices = indicesDoCiclo(serieComCiclo().pontos.map(p => p.valor), 7)
    expect(indices).toHaveLength(7)
    expect(indices.reduce((s, x) => s + x, 0)).toBeCloseTo(0, 6)
  })
})

describe('previsão', () => {
  it('nenhuma previsão sai sem intervalo em volta do número', () => {
    const s = serieComCiclo()
    for (const modelo of [ingenuo, sazonalIngenuo(7), sazonalMaisTendencia(7)]) {
      for (const p of modelo.prever(s.pontos, 5)) {
        expect(p.baixo).toBeLessThanOrEqual(p.valor)
        expect(p.alto).toBeGreaterThanOrEqual(p.valor)
        expect(p.confianca).toBe(CONFIANCA)
      }
    }
  })

  it('o intervalo abre à medida que a previsão se afasta', () => {
    const p = sazonalMaisTendencia(7).prever(serieComCiclo().pontos, 5)
    const larguras = p.map(x => x.alto - x.baixo)
    expect(larguras[4]).toBeGreaterThan(larguras[0])
  })

  it('as datas previstas seguem o passo da série e nunca repetem a última observada', () => {
    const s = serieComCiclo(20)
    const p = sazonalMaisTendencia(7).prever(s.pontos, 3)
    expect(p.map(x => x.quando)).toEqual(['2026-01-21', '2026-01-22', '2026-01-23'])
  })
})

describe('backtest de origem móvel', () => {
  it('cobra o modelo só pelo que ele não viu', () => {
    const s = serieComCiclo(40)
    const fora = backtest(s, sazonalMaisTendencia(7), { minimoTreino: 14, horizonte: 1 })
    expect(fora).toHaveLength(40 - 14)
    expect(fora[0].quando).toBe(s.pontos[14].quando)
    expect(fora[0].real).toBe(s.pontos[14].valor)
    expect(fora[0].ultimoVisto).toBe(s.pontos[13].valor)
  })

  it('o que vem depois da origem não muda a avaliação daquela origem', () => {
    const s = serieComCiclo(40)
    const curta: Serie = { ...s, pontos: s.pontos.slice(0, 30) }
    const a = backtest(s, sazonalMaisTendencia(7), { minimoTreino: 14 })
    const b = backtest(curta, sazonalMaisTendencia(7), { minimoTreino: 14 })
    expect(b.every((x, i) => x.previsto === a[i].previsto)).toBe(true)
  })

  it('horizonte maior que o que sobra devolve lista vazia em vez de inventar', () => {
    const s = serieComCiclo(16)
    expect(backtest(s, ingenuo, { minimoTreino: 14, horizonte: 9 })).toEqual([])
  })
})

describe('relatório, que é a régua', () => {
  it('numa série com tendência e ciclo, o modelo bate o palpite simples e passa', () => {
    const r = relatorio(serieComCiclo(), sazonalMaisTendencia(7), { minimoTreino: 21 })
    expect(r.contraARegua).toBeLessThan(1)
    expect(r.acertoDirecional).toBeGreaterThan(0.5)
    expect(r.aprovado).toBe(true)
    expect(r.motivos).toEqual([])
  })

  it('num passeio aleatório o mesmo modelo é REPROVADO, com o motivo escrito', () => {
    const r = relatorio(passeioAleatorio(), sazonalMaisTendencia(7), { minimoTreino: 21 })
    expect(r.aprovado).toBe(false)
    expect(r.motivos.join(' ')).toContain('palpite simples')
  })

  it('poucas comparações reprovam por falta de prova, não por erro', () => {
    const s = serieComCiclo(20)
    const r = relatorio(s, sazonalMaisTendencia(7), { minimoTreino: 16 })
    expect(r.comparacoes).toBeLessThan(MINIMO_DE_COMPARACOES)
    expect(r.aprovado).toBe(false)
    expect(r.motivos.join(' ')).toContain('comparações fora da amostra')
  })

  it('o palpite simples comparado consigo mesmo dá exatamente 1 e não passa', () => {
    const r = relatorio(serieComCiclo(), ingenuo, { minimoTreino: 21 })
    expect(r.contraARegua).toBeCloseTo(1, 10)
    expect(r.aprovado).toBe(false)
  })

  it('a cobertura é medida contra o que o intervalo prometeu', () => {
    const r = relatorio(serieComCiclo(), sazonalMaisTendencia(7), { minimoTreino: 21 })
    expect(r.confiancaDeclarada).toBe(CONFIANCA)
    expect(r.cobertura).toBeGreaterThanOrEqual(CONFIANCA - 0.1)
  })

  it('comparar devolve do melhor para o pior', () => {
    const rs = comparar(serieComCiclo(), [ingenuo, sazonalIngenuo(7), sazonalMaisTendencia(7)], { minimoTreino: 21 })
    expect(rs).toHaveLength(3)
    expect(rs[0].contraARegua).toBeLessThanOrEqual(rs[2].contraARegua)
    expect(rs[0].modelo).toBe('Tendência mais ciclo')
  })

  it('em palavras: diz o erro, a direção, a cobertura e, se reprovou, por quê', () => {
    const bom = emPalavras(relatorio(serieComCiclo(), sazonalMaisTendencia(7), { minimoTreino: 21 }))
    expect(bom.join(' ')).toContain('Acerta a direção')
    expect(bom.join(' ')).toContain('menos que o palpite simples')
    const ruim = emPalavras(relatorio(passeioAleatorio(), sazonalMaisTendencia(7), { minimoTreino: 21 }))
    expect(ruim.join(' ')).toContain('Não bate o palpite simples')
  })
})
