// @vitest-environment jsdom
import { describe, expect, it, beforeEach } from 'vitest'
import { webcrypto } from 'node:crypto'
import { agruparLugares, detectarParadas, distancia, preverProximo, quilometros, resumoPeriodo, type Ponto } from '@/lib/geo/calculo'
import { classificarAmbiente } from '@/lib/geo/camera'
import { Cofre, conferirCorrente, cofreExiste } from '@/lib/geo/cofre'
import { csvPontos, geojson, montarGrafo } from '@/lib/geo/grafo'
import { carregarConfigOllama, promptNoticias, promptSemana, salvarConfigOllama } from '@/lib/geo/ollama'

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

describe('G5/G6: município, trilha e ficha lastreada', () => {
  // quadrado de 0,1° em volta de Niterói, com um buraco no meio
  const malha = { type: 'Feature', properties: {}, geometry: { type: 'MultiPolygon', coordinates: [[
    [[-43.16, -22.95], [-43.06, -22.95], [-43.06, -22.85], [-43.16, -22.85], [-43.16, -22.95]],
    [[-43.12, -22.91], [-43.10, -22.91], [-43.10, -22.89], [-43.12, -22.89], [-43.12, -22.91]],
  ]] } }

  it('sabe se o ponto está dentro do limite, respeitando buraco', async () => {
    const { dentro, trilhaNoMunicipio } = await import('@/lib/geo/fontes')
    expect(dentro(-43.08, -22.93, malha)).toBe(true)
    expect(dentro(-43.11, -22.90, malha)).toBe(false) // no buraco
    expect(dentro(ESCRITORIO.lon, ESCRITORIO.lat, malha)).toBe(false) // Rio, fora
    const pts = [{ t: T0, lat: -22.93, lon: -43.08 }, { t: T0 + 86400000, lat: -22.93, lon: -43.08 }, { t: T0, ...ESCRITORIO }]
    expect(trilhaNoMunicipio(pts, malha)).toEqual({ pontos: 2, total: 3, dias: 2 })
  })

  it('a ficha em PDF sai com o hash do conteúdo, e o mesmo conteúdo dá o mesmo hash', async () => {
    const { pdfFicha, textoFicha } = await import('@/lib/geo/fichaPdf')
    const d = { municipio: { codigo: 3303302, nome: 'Niterói', uf: 'RJ', populacao2022: 481749, malha: null, fontes: ['IBGE'] }, trilha: { pontos: 2, total: 3, dias: 2 }, ndvi: { media: 0.31, minimo: -0.2, maximo: 0.88, cena: 'S2A_X', data: '2026-11-01' }, noticias: [{ titulo: 'Obra na ponte 🚧', url: 'https://x', fonte: 'x.com', data: '2026-11-10', idioma: 'Portuguese' }], geradoEm: '2026-11-15T06:00:00Z' }
    const a = await pdfFicha(d), b = await pdfFicha(d)
    expect(a.hash).toMatch(/^[0-9a-f]{64}$/)
    expect(a.hash).toBe(b.hash)
    expect(new TextDecoder().decode(a.bytes.slice(0, 5))).toBe('%PDF-')
    expect(textoFicha(d).join('\n')).toContain('vegetação rala ou plantação')
  })

  it('Ollama: configuração padrão usa localhost, salva e carrega do localStorage', () => {
    localStorage.clear()
    const padrao = carregarConfigOllama()
    expect(padrao.url).toBe('http://localhost:11434')
    expect(padrao.modelo).toBeTruthy()
    salvarConfigOllama({ url: 'http://localhost:11434', modelo: 'llama3.2:3b' })
    const lido = carregarConfigOllama()
    expect(lido.modelo).toBe('llama3.2:3b')
  })

  it('Ollama: prompts não vazam lat/lon, contêm os dados pedidos', () => {
    const p1 = promptSemana({ lugares: [{ nome: 'casa', minutos: 480 }, { nome: 'escritório', minutos: 240 }], km: 12.5, dias: 5 })
    expect(p1).toContain('casa')
    expect(p1).toContain('480')
    expect(p1).toContain('12.5')
    expect(p1).not.toMatch(/-22\.\d+/)
    const p2 = promptNoticias('Niterói', [{ titulo: 'Obras na ponte', data: '2026-11-14', fonte: 'o globo' }])
    expect(p2).toContain('Niterói')
    expect(p2).toContain('Obras na ponte')
  })

  it('a lista de fontes da tela é a mesma que o cabeçalho de segurança libera', async () => {
    const { FONTES_GEO } = await import('@/lib/geo/fontes')
    const { readFileSync } = await import('node:fs')
    const csp = readFileSync('deploy/vercel.json', 'utf-8')
    for (const f of FONTES_GEO) expect(csp).toContain(f)
    expect(FONTES_GEO.every(f => f.startsWith('https://'))).toBe(true)
  })
})
