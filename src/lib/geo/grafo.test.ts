// Provas do grafo e das exportações abertas (GeoJSON, CSV). O que mais importa aqui: toda aresta
// tem de dizer de onde veio, e o CSV não pode deixar ponto-e-vírgula do texto virar coluna nova.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { baixar, csvPontos, geojson, montarGrafo } from './grafo'
import { agruparLugares, type Ponto } from './calculo'
import type { Municipio, Noticia } from './fontes'
import type { Cena } from './cofre'

const T0 = Date.UTC(2026, 10, 19, 12, 0, 0)
const ponto = (i: number, extra: Partial<Ponto> = {}): Ponto =>
  ({ t: T0 + i * 60000, lat: -22.78 + i / 1000, lon: -43.31, precisao: 12.4, ...extra })

const caxias: Municipio = { codigo: 3301702, nome: 'Duque de Caxias', uf: 'RJ', populacao2022: 808002, malha: null, fontes: ['IBGE'] }
const noticia = (t: string): Noticia => ({ titulo: t, url: `https://exemplo.org/${t}`, fonte: 'exemplo.org', data: '2026-11-18', idioma: 'pt' })
const cena: Cena = { t: T0, ambiente: 'rua', pessoas: 3, objetos: ['carro', 'poste'], codigos: [] }

const { lugares, paradas } = agruparLugares([
  { inicio: T0, fim: T0 + 3600000, lat: -22.78, lon: -43.31, precisao: 10, pontos: 6 },
])

const grafo = (extra: Partial<Parameters<typeof montarGrafo>[0]> = {}) => montarGrafo({
  titular: 'Titular de teste', lugares, paradas,
  municipios: [{ lugarId: lugares[0].id, m: caxias }],
  noticias: [{ codigo: caxias.codigo, n: [noticia('a'), noticia('b')] }],
  cenas: [cena], previsoes: [], ...extra,
})

describe('montagem do grafo', () => {
  it('o titular é um nó, e cada lugar se liga a ele com o tempo que passou lá', () => {
    const { nos, arestas } = grafo()
    expect(nos[0]).toMatchObject({ id: 'titular', tipo: 'Titular', rotulo: 'Titular de teste' })
    const esteve = arestas.find(a => a.tipo === 'ESTEVE_EM')!
    expect(esteve.de).toBe('titular')
    expect(esteve.peso).toBe(60)
  })

  it('TODA aresta diz de onde veio: nenhuma fonte em branco', () => {
    const { arestas } = grafo({ previsoes: [{ de: lugares[0].id, para: 'L2', chance: 0.4 }] })
    expect(arestas.length).toBeGreaterThan(4)
    for (const a of arestas) expect(a.fonte.trim().length).toBeGreaterThan(0)
  })

  it('a aresta de previsão se identifica como previsão, e não como observação', () => {
    const { arestas } = grafo({ previsoes: [{ de: 'casa', para: 'trabalho', chance: 0.4567 }] })
    const vai = arestas.find(a => a.tipo === 'VAI_PARA')!
    expect(vai.fonte).toMatch(/[Pp]revisão/)
    expect(vai.peso).toBe(0.457) // arredondado a três casas, sem fingir precisão
  })

  it('o mesmo município aparece uma vez só, mesmo com vários lugares nele', () => {
    const { nos, arestas } = grafo({
      municipios: [{ lugarId: 'L1', m: caxias }, { lugarId: 'L2', m: caxias }],
    })
    expect(nos.filter(n => n.tipo === 'Municipio')).toHaveLength(1)
    expect(arestas.filter(a => a.tipo === 'FICA_EM')).toHaveLength(2)
  })

  it('a coordenada do lugar entra arredondada a cinco casas (cerca de um metro), não crua', () => {
    const { nos } = montarGrafo({
      titular: 'T', lugares: [{ id: 'L1', lat: -22.7812345678, lon: -43.3198765432, nome: '', visitas: 1, minutos: 10 }],
      paradas: [], municipios: [], noticias: [], cenas: [], previsoes: [],
    })
    expect(nos[1].props.lat).toBe(-22.78123)
  })

  it('a cena da câmera guarda quantas pessoas, e nada que identifique alguém', () => {
    const { nos } = grafo()
    const c = nos.find(n => n.tipo === 'Cena')!
    expect(c.props.pessoas).toBe(3)
    expect(Object.keys(c.props)).toEqual(['t', 'pessoas', 'objetos'])
  })

  it('corta a lista de notícias em 15 por município, para o grafo não virar jornal', () => {
    const muitas = Array.from({ length: 40 }, (_, i) => noticia(`n${i}`))
    const { nos } = grafo({ noticias: [{ codigo: caxias.codigo, n: muitas }] })
    expect(nos.filter(n => n.tipo === 'Noticia')).toHaveLength(15)
  })

  it('lugar sem nome aparece dito assim, não com o identificador técnico', () => {
    const { nos } = grafo()
    expect(nos.find(n => n.tipo === 'Lugar')!.rotulo).toBe('Lugar sem nome')
  })
})

describe('GeoJSON exportado', () => {
  it('é uma FeatureCollection e começa pelo trajeto, em ordem de horário', () => {
    const g = geojson([ponto(2), ponto(0), ponto(1)], lugares, paradas)
    expect(g.type).toBe('FeatureCollection')
    const linha = g.features[0]
    expect(linha.geometry.type).toBe('LineString')
    const coords = linha.geometry.coordinates as number[][]
    // ordem crescente de horário: a latitude cresce junto, por construção do ponto de teste
    expect(coords.map(c => c[1])).toEqual([...coords.map(c => c[1])].sort((a, b) => a - b))
    expect(coords[0][1]).toBeCloseTo(-22.78, 6)
    expect(coords[2][1]).toBeCloseTo(-22.778, 6)
  })

  it('a coordenada vai na ordem do padrão: longitude primeiro (RFC 7946)', () => {
    const g = geojson([ponto(0)], [], [])
    const pt = g.features.find(f => f.properties.tipo === 'ponto')!
    expect(pt.geometry.coordinates).toEqual([-43.31, -22.78])
  })

  it('cada ponto leva o horário, a margem de erro arredondada e o elo da corrente', () => {
    const g = geojson([ponto(0, { hash: 'abc123' })], [], [])
    const pt = g.features.find(f => f.properties.tipo === 'ponto')!
    expect(pt.properties).toMatchObject({ t: new Date(T0).toISOString(), precisao_m: 12, hash: 'abc123' })
  })

  it('traz ponto, parada e lugar, cada um dito pelo que é', () => {
    // com um ponto só não há trajeto: a RFC 7946 §3.1.4 não aceita linha de um ponto, e antes
    // disto a exportação saía inválida sem avisar. Com dois pontos o trajeto volta.
    const um = geojson([ponto(0)], lugares, paradas)
    expect(new Set(um.features.map(f => f.properties.tipo))).toEqual(new Set(['ponto', 'parada', 'lugar']))
    const dois = geojson([ponto(0), ponto(60_000)], lugares, paradas)
    expect(new Set(dois.features.map(f => f.properties.tipo))).toEqual(new Set(['trajeto', 'ponto', 'parada', 'lugar']))
  })

  it('sem ponto nenhum sai uma coleção vazia, e não um trajeto vazio inválido', () => {
    const g = geojson([], [], [])
    expect(g.type).toBe('FeatureCollection')
    expect(g.features).toEqual([])
  })
})

describe('CSV dos pontos', () => {
  it('a primeira linha é o cabeçalho, separado por ponto-e-vírgula (planilha em português)', () => {
    expect(csvPontos([]).split('\n')[0]).toBe('horario_utc;latitude;longitude;precisao_m;velocidade_ms;bateria;hash')
  })

  it('campo vazio fica vazio, e não vira zero', () => {
    const linha = csvPontos([ponto(0)]).split('\n')[1].split(';')
    expect(linha[4]).toBe('') // velocidade ausente
    expect(linha[5]).toBe('') // bateria ausente
  })

  it('velocidade zero de verdade aparece como zero', () => {
    const linha = csvPontos([ponto(0, { velocidade: 0 })]).split('\n')[1].split(';')
    expect(linha[4]).toBe('0')
  })

  it('texto com ponto-e-vírgula ou aspas é escapado, e não cria coluna nova', () => {
    const linha = csvPontos([ponto(0, { hash: 'a;b"c' })]).split('\n')[1]
    expect(linha.endsWith('"a;b""c"')).toBe(true)
  })
})

describe('baixar arquivo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('entrega o arquivo ao navegador com o nome pedido e solta a memória depois', () => {
    vi.useFakeTimers()
    const criar = vi.fn(() => 'blob:fake')
    const soltar = vi.fn<(u?: unknown, o?: RequestInit) => Promise<unknown>>()
    vi.stubGlobal('URL', { ...URL, createObjectURL: criar, revokeObjectURL: soltar })
    const clicar = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})

    baixar('meus-pontos.csv', 'a;b', 'text/csv')

    expect(criar).toHaveBeenCalledOnce()
    expect(clicar).toHaveBeenCalledOnce()
    expect(soltar).not.toHaveBeenCalled() // só depois, para o download não morrer no meio
    vi.advanceTimersByTime(2500)
    expect(soltar).toHaveBeenCalledWith('blob:fake')
    vi.useRealTimers()
  })
})
