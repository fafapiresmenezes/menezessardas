// Provas das contas puras sobre os pontos gravados (G2, G3, G7). Cada número aqui foi conferido
// à mão: um teste que só repete o que o código faz não prova nada.
import { describe, it, expect } from 'vitest'
import {
  agruparLugares, detectarParadas, distancia, fmtMin, linhaDoTempo, preverProximo,
  quilometros, resumoPeriodo, type Ponto, type Parada,
} from './calculo'

const T0 = Date.UTC(2026, 10, 19, 12, 0, 0)
const min = (n: number) => n * 60000
/** Um metro de latitude vale 1/111320 de grau: assim montamos deslocamentos de tamanho conhecido. */
const aoNorte = (base: number, metros: number) => base + metros / 111320
const p = (tMin: number, metros = 0, precisao = 10, extra: Partial<Ponto> = {}): Ponto =>
  ({ t: T0 + min(tMin), lat: aoNorte(-22.78, metros), lon: -43.31, precisao, ...extra })

describe('distância entre dois pontos', () => {
  it('mede em metros o deslocamento que montamos', () => {
    expect(distancia(p(0), p(0, 100))).toBeCloseTo(100, 0)
  })

  it('o mesmo ponto dá zero', () => {
    expect(distancia(p(0), p(0))).toBeCloseTo(0, 6)
  })

  it('não depende da ordem', () => {
    expect(distancia(p(0), p(0, 250))).toBeCloseTo(distancia(p(0, 250), p(0)), 6)
  })

  it('a volta ao mundo não estoura a conta (o arco-seno é limitado a 1)', () => {
    const anti = distancia({ lat: 0, lon: 0 }, { lat: 0, lon: 180 })
    expect(Number.isFinite(anti)).toBe(true)
    expect(anti).toBeGreaterThan(19_000_000)
  })
})

describe('quilômetros percorridos', () => {
  it('soma o caminho de pontos bons', () => {
    // 0 → 300 m → 600 m, um minuto entre cada: 600 m
    expect(quilometros([p(0), p(1, 300), p(2, 600)])).toBeCloseTo(0.6, 2)
  })

  it('ordena por horário antes de somar, então lista bagunçada dá o mesmo', () => {
    const certo = quilometros([p(0), p(1, 300), p(2, 600)])
    expect(quilometros([p(2, 600), p(0), p(1, 300)])).toBeCloseTo(certo, 6)
  })

  it('IGNORA ponto impreciso (margem acima de 150 m), que inventaria distância', () => {
    expect(quilometros([p(0), p(1, 300, 400), p(2, 600)])).toBeCloseTo(0.6, 2)
  })

  it('IGNORA salto impossível: 10 km em um minuto é falha de sinal, não viagem', () => {
    expect(quilometros([p(0), p(1, 10000)])).toBe(0)
  })

  it('IGNORA deslocamento menor que a própria margem de erro: isso é ficar parado', () => {
    expect(quilometros([p(0, 0, 50), p(1, 8, 50)])).toBe(0)
  })

  it('dois pontos no mesmo instante não quebram a conta', () => {
    expect(quilometros([p(0), p(0, 300)])).toBe(0)
  })

  it('lista vazia ou de um ponto dá zero', () => {
    expect(quilometros([])).toBe(0)
    expect(quilometros([p(0)])).toBe(0)
  })
})

describe('paradas', () => {
  it('meia hora dentro do raio é uma parada', () => {
    const paradas = detectarParadas([p(0), p(10, 20), p(20, 30), p(30, 10)])
    expect(paradas).toHaveLength(1)
    expect(paradas[0].pontos).toBe(4)
    expect(paradas[0].fim - paradas[0].inicio).toBe(min(30))
  })

  it('dois minutos no mesmo lugar NÃO é parada: fica abaixo do mínimo', () => {
    expect(detectarParadas([p(0), p(1, 10), p(2, 20)])).toHaveLength(0)
  })

  it('a margem de erro da parada é a PIOR do grupo, não a média', () => {
    const paradas = detectarParadas([p(0, 0, 8), p(10, 20, 60), p(20, 10, 12)])
    expect(paradas[0].precisao).toBe(60)
  })

  it('o centro pende para o ponto mais preciso', () => {
    // dois pontos a 100 m um do outro: o de margem 5 m pesa muito mais que o de 100 m
    const paradas = detectarParadas([p(0, 0, 5), p(10, 100, 100), p(20, 0, 5)])
    expect(paradas[0].lat).toBeLessThan(aoNorte(-22.78, 50))
  })

  it('duas paradas separadas por deslocamento saem como duas', () => {
    const paradas = detectarParadas([p(0), p(10, 10), p(20, 5000), p(30, 5010)])
    expect(paradas).toHaveLength(2)
  })

  it('o raio e o mínimo de minutos são ajustáveis', () => {
    expect(detectarParadas([p(0), p(2, 10)], 100, 1)).toHaveLength(1)
    expect(detectarParadas([p(0), p(2, 10)], 100, 10)).toHaveLength(0)
  })
})

describe('lugares', () => {
  const parada = (iniMin: number, fimMin: number, metros: number): Parada =>
    ({ inicio: T0 + min(iniMin), fim: T0 + min(fimMin), lat: aoNorte(-22.78, metros), lon: -43.31, precisao: 10, pontos: 5 })

  it('paradas próximas viram UM lugar, com visitas e minutos somados', () => {
    const { lugares } = agruparLugares([parada(0, 30, 0), parada(100, 160, 50)])
    expect(lugares).toHaveLength(1)
    expect(lugares[0].visitas).toBe(2)
    expect(lugares[0].minutos).toBe(90)
  })

  it('paradas distantes viram lugares diferentes, ordenados por tempo lá', () => {
    const { lugares } = agruparLugares([parada(0, 10, 0), parada(100, 200, 5000)])
    expect(lugares).toHaveLength(2)
    expect(lugares[0].minutos).toBe(100)
  })

  it('mantém o nome que o titular já tinha dado ao lugar', () => {
    const casa = { id: 'casa', lat: -22.78, lon: -43.31, nome: 'Casa', visitas: 9, minutos: 999 }
    const { lugares } = agruparLugares([parada(0, 60, 20)], [casa])
    expect(lugares[0].nome).toBe('Casa')
    expect(lugares[0].id).toBe('casa')
    // as contas antigas são refeitas, não acumuladas em cima
    expect(lugares[0].visitas).toBe(1)
    expect(lugares[0].minutos).toBe(60)
  })

  it('cada parada sai marcada com o lugar a que pertence', () => {
    const { paradas, lugares } = agruparLugares([parada(0, 30, 0)])
    expect(paradas[0].lugarId).toBe(lugares[0].id)
  })

  it('lugar com nome e sem visita nenhuma continua na lista; sem nome e sem visita, sai', () => {
    const nomeado = { id: 'trabalho', lat: 0, lon: 0, nome: 'Trabalho', visitas: 0, minutos: 0 }
    const { lugares } = agruparLugares([], [nomeado])
    expect(lugares.map(l => l.id)).toEqual(['trabalho'])
  })
})

describe('resumo do período', () => {
  const { lugares, paradas } = agruparLugares([
    { inicio: T0, fim: T0 + min(60), lat: -22.78, lon: -43.31, precisao: 10, pontos: 5 },
  ])

  it('conta só o que está dentro da janela', () => {
    const r = resumoPeriodo([p(0), p(1, 300)], lugares, paradas, T0, T0 + min(120))
    expect(r.pontos).toBe(2)
    expect(r.porLugar[0].minutos).toBe(60)
  })

  it('recorta a parada que atravessa a borda da janela', () => {
    const r = resumoPeriodo([], lugares, paradas, T0 + min(30), T0 + min(120))
    expect(r.porLugar[0].minutos).toBe(30)
  })

  it('janela fora do período não traz nada, e não inventa zero com lugar', () => {
    const r = resumoPeriodo([], lugares, paradas, T0 + min(500), T0 + min(600))
    expect(r.porLugar).toEqual([])
    expect(r.pontos).toBe(0)
    expect(r.dias).toBe(0)
  })

  it('conta dias distintos, não pontos', () => {
    const amanha = T0 + 86400000
    const r = resumoPeriodo(
      [p(0), p(1), { t: amanha, lat: -22.78, lon: -43.31, precisao: 10 }],
      lugares, paradas, T0, amanha + min(10),
    )
    expect(r.dias).toBe(2)
  })
})

describe('linha do tempo do dia', () => {
  const dia = new Date(T0)
  const { lugares, paradas } = agruparLugares([
    { inicio: T0, fim: T0 + min(30), lat: -22.78, lon: -43.31, precisao: 10, pontos: 5 },
    { inicio: T0 + min(90), fim: T0 + min(120), lat: aoNorte(-22.78, 5000), lon: -43.31, precisao: 10, pontos: 5 },
  ], [{ id: 'casa', lat: -22.78, lon: -43.31, nome: 'Casa', visitas: 0, minutos: 0 }])

  it('alterna parado e em deslocamento, na ordem do relógio', () => {
    const linha = linhaDoTempo(paradas, lugares, dia)
    expect(linha.map(l => l.tipo)).toEqual(['parado', 'movimento', 'parado'])
    expect(linha[0].de).toBeLessThan(linha[1].de)
  })

  it('usa o nome do lugar quando existe, e diz "sem nome" quando não existe', () => {
    const linha = linhaDoTempo(paradas, lugares, dia)
    expect(linha[0].texto).toBe('Em Casa')
    expect(linha[2].texto).toBe('Parado em lugar sem nome')
  })

  it('dia sem parada nenhuma devolve lista vazia', () => {
    expect(linhaDoTempo(paradas, lugares, new Date(T0 + 86400000 * 5))).toEqual([])
  })
})

describe('previsão do próximo lugar', () => {
  const ir = (seq: string[]): Parada[] => seq.map((id, i) => ({
    inicio: T0 + min(i * 60), fim: T0 + min(i * 60 + 30), lat: -22.78, lon: -43.31, precisao: 10, pontos: 5, lugarId: id,
  }))

  it('o destino mais frequente vem primeiro, com a contagem à vista', () => {
    const r = preverProximo(ir(['casa', 'trabalho', 'casa', 'trabalho', 'casa', 'mercado']), 'casa')
    expect(r[0].lugarId).toBe('trabalho')
    expect(r[0].vezes).toBe(2)
    expect(r.find(x => x.lugarId === 'mercado')!.vezes).toBe(1)
  })

  it('não prevê voltar ao lugar onde já está', () => {
    const r = preverProximo(ir(['casa', 'casa', 'trabalho']), 'casa')
    expect(r.map(x => x.lugarId)).not.toContain('casa')
  })

  it('a suavização evita chance zero: destino nunca visto a partir daqui ainda tem chance', () => {
    const r = preverProximo(ir(['casa', 'trabalho', 'mercado']), 'casa')
    const mercado = r.find(x => x.lugarId === 'mercado')!
    expect(mercado.vezes).toBe(0)
    expect(mercado.chance).toBeGreaterThan(0)
  })

  it('as chances somam 1', () => {
    const r = preverProximo(ir(['casa', 'trabalho', 'casa', 'mercado']), 'casa')
    expect(r.reduce((s, x) => s + x.chance, 0)).toBeCloseTo(1, 10)
  })

  it('sem outro lugar para onde ir, não devolve palpite nenhum', () => {
    expect(preverProximo(ir(['casa', 'casa']), 'casa')).toEqual([])
    expect(preverProximo([], 'casa')).toEqual([])
  })

  it('parada sem lugar marcado é descartada da sequência', () => {
    const comBuraco = [...ir(['casa', 'trabalho'])]
    comBuraco.splice(1, 0, { inicio: T0 + min(40), fim: T0 + min(45), lat: 0, lon: 0, precisao: 10, pontos: 1 })
    expect(preverProximo(comBuraco, 'casa')[0].lugarId).toBe('trabalho')
  })
})

describe('minutos em palavras', () => {
  it('abaixo de uma hora, só minutos', () => {
    expect(fmtMin(45)).toBe('45 min')
    expect(fmtMin(0)).toBe('0 min')
  })

  it('acima de uma hora, horas e minutos com dois dígitos', () => {
    expect(fmtMin(60)).toBe('1 h 00 min')
    expect(fmtMin(125)).toBe('2 h 05 min')
  })
})
