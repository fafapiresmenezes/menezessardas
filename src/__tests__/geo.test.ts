// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'
import { agruparLugares, detectarParadas, distancia, preverProximo, quilometros, resumoPeriodo, type Ponto } from '@/lib/geo/calculo'
import { classificarAmbiente } from '@/lib/geo/camera'
import { Cofre, conferirCorrente, cofreExiste } from '@/lib/geo/cofre'
import { csvPontos, geojson, montarGrafo } from '@/lib/geo/grafo'

if (!globalThis.crypto?.subtle) Object.defineProperty(globalThis, 'crypto', { value: webcrypto })

const CASA = { lat: -22.9035, lon: -43.1096 }      // Niterói (exemplo)
const ESCRITORIO = { lat: -22.9068, lon: -43.1729 } // Centro do Rio (exemplo)
const T0 = Date.UTC(2026, 10, 10, 9, 0)
const min = 60000

function estadia(lugar: { lat: number; lon: number }, inicio: number, minutos: number, passo = 2): Ponto[] {
  const out: Ponto[] = []
  for (let m = 0; m <= minutos; m += passo) out.push({ t: inicio + m * min, lat: lugar.lat + (m % 3) * 0.00005, lon: lugar.lon, precisao: 20 })
  return out
}

describe('cálculo do MVP de geolocalização', () => {
  it('mede distância em metros', () => {
    const d = distancia(CASA, ESCRITORIO)
    expect(d).toBeGreaterThan(6000)
    expect(d).toBeLessThan(7000)
  })

  it('detecta paradas e junta no mesmo lugar', () => {
    const pts = [
      ...estadia(CASA, T0, 60), ...estadia(ESCRITORIO, T0 + 90 * min, 120),
      ...estadia(CASA, T0 + 240 * min, 60), ...estadia(ESCRITORIO, T0 + 24 * 60 * min, 60),
    ]
    const paradas = detectarParadas(pts)
    expect(paradas).toHaveLength(4)
    const { lugares, paradas: marcadas } = agruparLugares(paradas)
    expect(lugares).toHaveLength(2)
    expect(lugares[0].minutos).toBe(180) // escritório: 120 + 60
    expect(marcadas.every(p => p.lugarId)).toBe(true)
    const r = resumoPeriodo(pts, lugares, marcadas, T0, T0 + 86400000)
    expect(r.porLugar[0].minutos).toBe(120)
  })

  it('não soma salto de GPS como quilômetro', () => {
    const pts: Ponto[] = [
      { t: T0, lat: CASA.lat, lon: CASA.lon, precisao: 10 },
      { t: T0 + 1000, lat: ESCRITORIO.lat, lon: ESCRITORIO.lon, precisao: 10 }, // 6 km em 1 s: impossível
      { t: T0 + 2000, lat: CASA.lat, lon: CASA.lon, precisao: 10 },
    ]
    expect(quilometros(pts)).toBe(0)
  })

  it('prevê o próximo lugar com a contagem de vezes', () => {
    const pts = [
      ...estadia(CASA, T0, 30), ...estadia(ESCRITORIO, T0 + 60 * min, 30),
      ...estadia(CASA, T0 + 120 * min, 30), ...estadia(ESCRITORIO, T0 + 180 * min, 30),
      ...estadia(CASA, T0 + 240 * min, 30),
    ]
    const { lugares, paradas } = agruparLugares(detectarParadas(pts))
    const casa = lugares.find(l => distancia(l, CASA) < 200)!
    const p = preverProximo(paradas, casa.id)
    expect(p[0].vezes).toBe(2)
    expect(p[0].chance).toBe(1) // único destino possível
  })
})

describe('câmera como sensor de lugar', () => {
  it('classifica rua e conta pessoas sem identificar', () => {
    const r = classificarAmbiente([{ classe: 'car', confianca: 0.9 }, { classe: 'traffic light', confianca: 0.8 }, { classe: 'person', confianca: 0.95 }, { classe: 'person', confianca: 0.3 }])
    expect(r.ambiente).toBe('Rua')
    expect(r.pessoas).toBe(1)
    expect(r.objetos).toEqual(['carro', 'semáforo'])
  })
  it('classifica escritório', () => {
    expect(classificarAmbiente([{ classe: 'laptop', confianca: 0.8 }, { classe: 'keyboard', confianca: 0.7 }, { classe: 'chair', confianca: 0.7 }]).ambiente).toBe('Escritório')
  })
})

describe('cofre cifrado e corrente de hash', () => {
  beforeEach(() => localStorage.clear())

  it('só grava com consentimento, cifra e recusa senha errada', async () => {
    const c = await Cofre.abrir('senha-forte-1')
    await expect(c.gravarPonto({ t: T0, ...CASA, precisao: 10 })).rejects.toThrow(/consentimento/)
    await c.consentir('M')
    await c.gravarPonto({ t: T0, ...CASA, precisao: 10 })
    await c.gravarPonto({ t: T0 + min, ...CASA, precisao: 10 })
    expect(cofreExiste()).toBe(true)
    const bruto = localStorage.getItem('theye-geo-cofre-v1')!
    expect(bruto).not.toContain('-22.90') // nada em claro
    await expect(Cofre.abrir('outra-senha')).rejects.toThrow(/Senha errada/)
    const de = await Cofre.abrir('senha-forte-1')
    expect(de.dados.pontos).toHaveLength(2)
    expect((await conferirCorrente(de.dados.pontos)).ok).toBe(true)
    de.dados.pontos[0].lat = 0 // adulteração
    expect(await conferirCorrente(de.dados.pontos)).toEqual({ ok: false, quebraEm: 0 })
  })

  it('apaga por dia, refaz a corrente e apaga tudo', async () => {
    const c = await Cofre.abrir('senha-forte-1')
    await c.consentir('M')
    await c.gravarPonto({ t: new Date(2026, 10, 10, 10).getTime(), ...CASA, precisao: 10 })
    await c.gravarPonto({ t: new Date(2026, 10, 11, 10).getTime(), ...CASA, precisao: 10 })
    await c.apagar({ dia: '2026-11-10' })
    expect(c.dados.pontos).toHaveLength(1)
    expect((await conferirCorrente(c.dados.pontos)).ok).toBe(true)
    expect(c.dados.acessos.some(a => a.acao === 'apagar')).toBe(true)
    await c.apagar('tudo')
    expect(cofreExiste()).toBe(false)
  })
})

describe('exportação e grafo', () => {
  it('gera GeoJSON, CSV e grafo com fonte em cada ligação', () => {
    const pts = [...estadia(CASA, T0, 30), ...estadia(ESCRITORIO, T0 + 60 * min, 30)]
    const { lugares, paradas } = agruparLugares(detectarParadas(pts))
    const g = geojson(pts, lugares, paradas)
    expect(g.features[0].geometry.type).toBe('LineString')
    expect(csvPontos(pts).split('\n')).toHaveLength(pts.length + 1)
    const grafo = montarGrafo({ titular: 'M', lugares, paradas, municipios: [{ lugarId: lugares[0].id, m: { codigo: 3303302, nome: 'Niterói', uf: 'RJ', populacao2022: 481749, malha: null, fontes: [] } }], noticias: [{ codigo: 3303302, n: [{ titulo: 'x', url: 'https://x', fonte: 'x', data: '2026-11-10', idioma: 'Portuguese' }] }], cenas: [], previsoes: [] })
    expect(grafo.nos.map(n => n.tipo)).toEqual(expect.arrayContaining(['Titular', 'Lugar', 'Municipio', 'Noticia']))
    expect(grafo.arestas.every(a => a.fonte)).toBe(true)
  })
})
