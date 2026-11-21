// Provas das fontes abertas (satélite, IBGE, GDELT) e das contas de geometria.
// A prova mais importante deste arquivo: quando uma consulta sai do aparelho, ela leva a posição
// ARREDONDADA, nunca a trilha nem a coordenada exata do titular.
import { describe, it, expect, vi, afterEach } from 'vitest'
import {
  CAMADAS_PENDENTES, FONTES_GEO, SATELITES, buscarCenas, camadasSatelite, dentro, fichaMunicipio,
  leituraNdvi, municipioDe, ndviMedio, noticiasGdelt, tileNdvi, tilesDaCena, tomGdelt, trilhaNoMunicipio,
  type Cena,
} from './fontes'
import vercel from '../../../deploy/vercel.json'

afterEach(() => vi.restoreAllMocks())

const resposta = (corpo: unknown, ok = true, status = 200) => ({
  ok, status,
  json: async () => corpo,
  text: async () => (typeof corpo === 'string' ? corpo : JSON.stringify(corpo)),
})

/** Um quadrado de 1 grau com a esquina em (0,0), em GeoJSON. */
const quadrado = (x = 0, y = 0, l = 1) => ({
  type: 'Polygon',
  coordinates: [[[x, y], [x + l, y], [x + l, y + l], [x, y + l], [x, y]]],
})

describe('o que sai do aparelho', () => {
  it('a consulta de município leva a posição arredondada a 2 casas (~1 km), não a exata', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ address: {} }))
    vi.stubGlobal('fetch', f)
    await municipioDe(-22.7812345, -43.3198765).catch(() => {})
    const url = String(f.mock.calls[0][0])
    expect(url).toContain('lat=-22.78')
    expect(url).toContain('lon=-43.32')
    expect(url).not.toContain('-22.7812345')
  })

  it('a busca de cena pede uma caixa pequena em volta do ponto, não o planeta', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [] }))
    vi.stubGlobal('fetch', f)
    await buscarCenas(-22.78, -43.31)
    const corpo = JSON.parse(String((f.mock.calls[0][1] as RequestInit | undefined)!.body))
    const [oeste, sul, leste, norte] = corpo.bbox
    expect(leste - oeste).toBeCloseTo(0.02, 6)
    expect(norte - sul).toBeCloseTo(0.02, 6)
  })

  it('a estatística de vegetação manda o limite público do município, e nenhum ponto da trilha', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [{ properties: { statistics: { b1: { mean: 0.5, min: -0.1, max: 0.9 } } } }] }))
    vi.stubGlobal('fetch', f)
    await ndviMedio({ id: 'c', colecao: 'sentinel-2-l2a', data: '2026-11-01', nuvem: 3, satelite: 's2' }, quadrado())
    const corpo = String((f.mock.calls[0][1] as RequestInit | undefined)!.body)
    expect(corpo).toContain('FeatureCollection')
    expect(corpo).not.toMatch(/-22\.78|-43\.31/)
  })

  it('a lista de endereços externos é exatamente a que o navegador tem permissão de abrir', () => {
    const csp = vercel.headers
      .find(h => h.source === '/(.*)')!.headers
      .find(h => h.key === 'Content-Security-Policy')!.value
    for (const host of FONTES_GEO) expect(csp, host).toContain(host)
  })
})

describe('inventário de satélites', () => {
  it('cada satélite diz o que mede, a licença e onde se baixa', () => {
    expect(SATELITES.length).toBeGreaterThan(5)
    for (const s of SATELITES) {
      expect(s.mede.length, s.nome).toBeGreaterThan(10)
      expect(s.licenca.length, s.nome).toBeGreaterThan(3)
      expect(s.catalogo, s.nome).toMatch(/^https:\/\//)
    }
  })

  it('a camada que NÃO é livre para uso comercial avisa isso na dica', () => {
    const eox = camadasSatelite().find(c => c.id === 's2')!
    expect(eox.dica).toMatch(/não comercial/i)
    expect(eox.atribuicao).toMatch(/CC BY-NC-SA/)
  })

  it('as camadas do dia pedem a imagem de ONTEM, que é a última pronta', () => {
    const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
    for (const id of ['modis', 'fogo']) {
      expect(camadasSatelite().find(c => c.id === id)!.tiles[0], id).toContain(ontem)
    }
  })

  it('toda camada traz atribuição: nenhuma imagem aparece sem dizer de quem é', () => {
    for (const c of camadasSatelite()) expect(c.atribuicao.length, c.nome).toBeGreaterThan(5)
  })

  it('o índice de vegetação é a conta padrão do infravermelho com o vermelho', () => {
    const u = tileNdvi({ id: 'x', colecao: 'sentinel-2-l2a', data: '2026-11-01', nuvem: 0, satelite: 's2' })
    expect(decodeURIComponent(u)).toContain('(B08-B04)/(B08+B04)')
    expect(u).toContain('item=x')
  })
})

describe('cenas de satélite', () => {
  const feature = (extra: Record<string, unknown> = {}) => ({
    id: 'S2A_2026', collection: 'sentinel-2-l2a',
    properties: { datetime: '2026-11-18T13:20:00Z', 'eo:cloud_cover': 12.7, platform: 'sentinel-2a', ...extra },
    links: [{ rel: 'tilejson', href: 'https://exemplo/tilejson' }],
    assets: { rendered_preview: { href: 'https://exemplo/preview.png' } },
  })

  it('lê data, nuvem arredondada e satélite de cada cena', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [feature()] })))
    const [c] = await buscarCenas(-22.78, -43.31)
    expect(c).toMatchObject({ data: '2026-11-18', nuvem: 13, satelite: 'sentinel-2a' })
    expect(c.miniatura).toBe('https://exemplo/preview.png')
  })

  it('cena sem informação de nuvem fica NULA, e não zero — zero significaria céu limpo', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [feature({ 'eo:cloud_cover': undefined })] })))
    expect((await buscarCenas(-22.78, -43.31))[0].nuvem).toBeNull()
  })

  it('catálogo fora do ar dá erro com o código, em português', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({}, false, 502)))
    await expect(buscarCenas(0, 0)).rejects.toThrow(/respondeu 502/)
  })

  it('cena sem camada pronta diz isso, em vez de devolver lista vazia calada', async () => {
    await expect(tilesDaCena({ id: 'x', colecao: 'c', data: '', nuvem: null, satelite: '' } as Cena))
      .rejects.toThrow(/não traz camada pronta/)
  })
})

describe('município pelo IBGE', () => {
  it('ponto fora do Brasil é recusado com explicação', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ address: { country: 'Portugal' } })))
    await expect(municipioDe(38.7, -9.1)).rejects.toThrow(/Fora do Brasil/)
  })

  it('acha o município mesmo com acento diferente entre OpenStreetMap e IBGE', async () => {
    const f = vi.fn<(u?: unknown, o?: RequestInit) => Promise<unknown>>()
      .mockResolvedValueOnce(resposta({ address: { city: 'Sao Paulo', 'ISO3166-2-lvl4': 'BR-SP' } }))
      .mockResolvedValueOnce(resposta([{ id: 3550308, nome: 'São Paulo' }]))
      .mockResolvedValue(resposta({}))
    vi.stubGlobal('fetch', f)
    const m = await municipioDe(-23.55, -46.63)
    expect(m.codigo).toBe(3550308)
    expect(m.uf).toBe('SP')
  })

  it('município que o IBGE não tem é dito pelo nome, para dar o que conferir', async () => {
    const f = vi.fn<(u?: unknown, o?: RequestInit) => Promise<unknown>>()
      .mockResolvedValueOnce(resposta({ address: { city: 'Cidade Inventada', 'ISO3166-2-lvl4': 'BR-RJ' } }))
      .mockResolvedValueOnce(resposta([{ id: 1, nome: 'Niterói' }]))
    vi.stubGlobal('fetch', f)
    await expect(municipioDe(-22, -43)).rejects.toThrow(/Cidade Inventada/)
  })

  it('a ficha traz a população do Censo 2022 e lista as três fontes', async () => {
    const f = vi.fn<(u?: unknown, o?: RequestInit) => Promise<unknown>>()
      .mockResolvedValueOnce(resposta(quadrado()))
      .mockResolvedValueOnce(resposta([{ resultados: [{ series: [{ serie: { 2022: '808002' } }] }] }]))
    vi.stubGlobal('fetch', f)
    const m = await fichaMunicipio(3301702, 'Duque de Caxias', 'RJ')
    expect(m.populacao2022).toBe(808002)
    expect(m.fontes).toHaveLength(3)
    for (const x of m.fontes) expect(x).toMatch(/IBGE/)
  })

  it('se o IBGE falhar, a ficha vem SEM população e SEM limite, e não com zero', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => { throw new Error('rede fora') }))
    const m = await fichaMunicipio(1, 'X', 'RJ')
    expect(m.populacao2022).toBeNull()
    expect(m.malha).toBeNull()
  })
})

describe('notícias do município (GDELT)', () => {
  it('converte a data compactada do GDELT em data legível', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({
      articles: [{ title: 'T', url: 'https://u', domain: 'd.com', seendate: '20261118T120000Z', language: 'Portuguese' }],
    })))
    const [n] = await noticiasGdelt('Caxias', 'RJ')
    expect(n.data).toBe('2026-11-18')
    expect(n.fonte).toBe('d.com')
  })

  it('notícia sem data fica com data vazia, e não com a data de hoje', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ articles: [{ title: 'T', url: 'u', domain: 'd', seendate: '', language: 'pt' }] })))
    expect((await noticiasGdelt('X', 'RJ'))[0].data).toBe('')
  })

  it('quando o GDELT devolve texto de erro em vez de dados, o recado mostra o texto', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta('Timeout de consulta no servidor')))
    await expect(noticiasGdelt('X', 'RJ')).rejects.toThrow(/Timeout de consulta/)
  })

  it('pede só notícia de fonte brasileira, pelo nome do município entre aspas', async () => {
    const f = vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ articles: [] }))
    vi.stubGlobal('fetch', f)
    await noticiasGdelt('Duque de Caxias', 'RJ', 3)
    const u = decodeURIComponent(String(f.mock.calls[0][0]))
    expect(u).toContain('"Duque de Caxias" sourcecountry:BR')
    expect(u).toContain('timespan=3d')
  })

  it('o tom das notícias vem arredondado a duas casas, por dia', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ timeline: [{ data: [{ date: '20261118T000000Z', value: -1.23456 }] }] })))
    expect(await tomGdelt('X')).toEqual([{ data: '2026-11-18', tom: -1.23 }])
  })

  it('série vazia devolve lista vazia, sem inventar ponto nenhum', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({})))
    expect(await tomGdelt('X')).toEqual([])
  })
})

describe('ponto dentro do município', () => {
  it('dentro é dentro, fora é fora', () => {
    expect(dentro(0.5, 0.5, quadrado())).toBe(true)
    expect(dentro(5, 5, quadrado())).toBe(false)
  })

  it('buraco no meio do polígono conta como fora', () => {
    const comBuraco = {
      type: 'Polygon',
      coordinates: [
        [[0, 0], [10, 0], [10, 10], [0, 10], [0, 0]],
        [[4, 4], [6, 4], [6, 6], [4, 6], [4, 4]],
      ],
    }
    expect(dentro(1, 1, comBuraco)).toBe(true)
    expect(dentro(5, 5, comBuraco)).toBe(false)
  })

  it('aceita o formato que o IBGE devolve: Feature, FeatureCollection e MultiPolygon', () => {
    expect(dentro(0.5, 0.5, { type: 'Feature', geometry: quadrado() })).toBe(true)
    expect(dentro(0.5, 0.5, { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: quadrado() }] })).toBe(true)
    expect(dentro(10.5, 10.5, { type: 'MultiPolygon', coordinates: [quadrado().coordinates, quadrado(10, 10).coordinates] })).toBe(true)
  })

  it('sem limite nenhum, nada está dentro: não assume que está', () => {
    expect(dentro(0.5, 0.5, null)).toBe(false)
    expect(dentro(0.5, 0.5, undefined)).toBe(false)
    expect(dentro(0.5, 0.5, { type: 'Point', coordinates: [0, 0] })).toBe(false)
  })

  it('conta pontos e dias distintos da trilha dentro do município', () => {
    const dia = 86400000
    const t = Date.UTC(2026, 10, 19, 12)
    const r = trilhaNoMunicipio([
      { t, lat: 0.5, lon: 0.5 },
      { t: t + 3600000, lat: 0.6, lon: 0.6 },
      { t: t + dia, lat: 0.5, lon: 0.5 },
      { t: t + dia, lat: 50, lon: 50 },
    ], quadrado())
    expect(r).toEqual({ pontos: 3, total: 4, dias: 2 })
  })
})

describe('leitura do índice de vegetação', () => {
  it('traduz o número em palavras, nas faixas escritas no código', () => {
    expect(leituraNdvi(0.8)).toBe('mata densa')
    expect(leituraNdvi(0.6)).toBe('mata densa')
    expect(leituraNdvi(0.4)).toBe('vegetação rala ou plantação')
    expect(leituraNdvi(0.1)).toBe('cidade, solo exposto ou água')
    expect(leituraNdvi(-0.3)).toBe('cidade, solo exposto ou água')
  })

  it('a média vem arredondada a três casas', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [{ properties: { statistics: { b1: { mean: 0.123456, min: -0.98765, max: 0.99999 } } } }] })))
    const r = await ndviMedio({ id: 'c', colecao: 'sentinel-2-l2a', data: '', nuvem: null, satelite: '' }, quadrado())
    expect(r).toEqual({ media: 0.123, minimo: -0.988, maximo: 1 })
  })

  it('serviço sem estatística devolve null, em vez de média inventada', async () => {
    vi.stubGlobal('fetch', vi.fn(async (_u?: unknown, _o?: RequestInit) => resposta({ features: [] })))
    expect(await ndviMedio({ id: 'c', colecao: 'sentinel-2-l2a', data: '', nuvem: null, satelite: '' }, quadrado())).toBeNull()
  })
})

describe('as lacunas ficam escritas', () => {
  it('cada camada que ainda NÃO está no mapa diz onde ela está e o que falta', () => {
    expect(CAMADAS_PENDENTES.length).toBeGreaterThan(3)
    for (const c of CAMADAS_PENDENTES) {
      expect(c.caminho, c.nome).toMatch(/https?:\/\//)
      expect(c.nome.length).toBeGreaterThan(3)
    }
  })
})
