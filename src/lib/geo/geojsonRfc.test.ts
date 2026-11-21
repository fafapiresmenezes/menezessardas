// Provas da dimensão 7 da régua: o que o app exporta é válido na norma, ou a obra quebra.
// Antes destas provas a régua dizia "exporta GeoJSON", que é uma frase sobre intenção.
import { describe, expect, it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { CASAS_SUFICIENTES, arredondar, validarGeoJSON } from './geojsonRfc'
import { geojson, kml } from './grafo'
import type { Lugar, Parada, Ponto } from './calculo'

const pt = (lat: number, lon: number, t: number, precisao = 8): Ponto =>
  ({ t, lat, lon, precisao, hash: 'h' }) as Ponto
const casa: Lugar = { id: 'l1', nome: 'Casa & "Escritório" <RJ>', lat: -22.778, lon: -43.311, visitas: 3, minutos: 90 } as Lugar
const parada: Parada = { lugarId: 'l1', inicio: 1000, fim: 2000, lat: -22.778, lon: -43.311 } as Parada

describe('o conferidor da RFC 7946', () => {
  it('aceita um GeoJSON correto', () => {
    expect(validarGeoJSON({ type: 'Point', coordinates: [-43.31, -22.77] })).toEqual([])
  })

  it('recusa latitude e longitude trocadas quando dá para saber', () => {
    const ps = validarGeoJSON({ type: 'Point', coordinates: [-22.77, -143.31] })
    expect(ps.some(p => p.secao === '§1.1')).toBe(true)
  })

  it('recusa coordenada fora do planeta', () => {
    expect(validarGeoJSON({ type: 'Point', coordinates: [-200, -22] })[0].problema).toContain('longitude')
    expect(validarGeoJSON({ type: 'Point', coordinates: [-43, 200] })[0].problema).toContain('latitude')
  })

  it('recusa linha com um ponto só', () => {
    const ps = validarGeoJSON({ type: 'LineString', coordinates: [[-43.3, -22.7]] })
    expect(ps).toHaveLength(1)
    expect(ps[0].secao).toBe('§3.1.4')
  })

  it('recusa anel de polígono que não fecha', () => {
    const quase = { type: 'Polygon', coordinates: [[[0, 0], [1, 0], [1, 1], [0, 1]]] }
    expect(validarGeoJSON(quase).some(p => p.secao === '§3.1.6')).toBe(true)
  })

  it('recusa o campo crs, que a norma de 2016 tirou', () => {
    const ps = validarGeoJSON({ type: 'FeatureCollection', features: [], crs: { type: 'name' } })
    expect(ps.some(p => p.secao === '§4')).toBe(true)
  })

  it('exige geometry e properties na Feature, mesmo nulos', () => {
    expect(validarGeoJSON({ type: 'Feature', geometry: null, properties: null })).toEqual([])
    expect(validarGeoJSON({ type: 'Feature', geometry: null }).some(p => p.onde.endsWith('.properties'))).toBe(true)
    expect(validarGeoJSON({ type: 'Feature', properties: null }).some(p => p.onde.endsWith('.geometry'))).toBe(true)
  })

  it('reclama de precisão falsa além de seis casas', () => {
    const ps = validarGeoJSON({ type: 'Point', coordinates: [-43.3112345678, -22.7781234567] })
    expect(ps.every(p => p.secao === '§11.2')).toBe(true)
    expect(ps).toHaveLength(2)
  })

  it('não é um GeoJSON: diz isso, em vez de aceitar calado', () => {
    expect(validarGeoJSON(null)[0].problema).toContain('não é nem um objeto')
    expect(validarGeoJSON({ type: 'Trajeto' })[0].secao).toBe('§1.4')
  })

  it('arredonda para as casas que a norma considera suficientes', () => {
    expect(arredondar(-22.7781234567)).toBe(-22.778123)
    expect(CASAS_SUFICIENTES).toBe(6)
  })
})

describe('o GeoJSON que o app exporta é válido na norma', () => {
  // Esta é a prova que sustenta a nota: as quatro formas em que a exportação sai na vida real.
  const formas: [string, ReturnType<typeof geojson>][] = [
    ['trajeto com vários pontos', geojson([pt(-22.7781234567, -43.3112345678, 1), pt(-22.779, -43.312, 2), pt(-22.78, -43.313, 3)], [], [])],
    ['um ponto só (antes isto saía inválido)', geojson([pt(-22.778, -43.311, 1)], [], [])],
    ['nenhum ponto', geojson([], [], [])],
    ['com lugar e parada', geojson([pt(-22.778, -43.311, 1), pt(-22.779, -43.312, 2)], [casa], [parada])],
  ]
  for (const [nome, g] of formas) {
    it(nome, () => expect(validarGeoJSON(g)).toEqual([]))
  }

  it('com menos de dois pontos não inventa um trajeto', () => {
    const g = geojson([pt(-22.778, -43.311, 1)], [], [])
    expect(g.features.some(f => f.properties.tipo === 'trajeto')).toBe(false)
    expect(g.features).toHaveLength(1)
  })

  it('os pontos saem em ordem de horário dentro do trajeto', () => {
    const g = geojson([pt(-22.78, -43.313, 3), pt(-22.778, -43.311, 1), pt(-22.779, -43.312, 2)], [], [])
    const linha = g.features.find(f => f.properties.tipo === 'trajeto')!
    expect(linha.geometry.coordinates).toEqual([[-43.311, -22.778], [-43.312, -22.779], [-43.313, -22.78]])
  })
})

describe('o KML que o app exporta', () => {
  const saida = kml([pt(-22.7781234567, -43.3112345678, 1000), pt(-22.779, -43.312, 2000)], [casa], [parada])

  it('declara o padrão KML 2.2 da OGC', () => {
    expect(saida.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(saida).toContain('<kml xmlns="http://www.opengis.net/kml/2.2">')
  })

  it('escreve a coordenada na ordem longitude,latitude, que é o contrário do que se fala', () => {
    expect(saida).toContain('<coordinates>-43.311235,-22.778123</coordinates>')
  })

  it('separa os pares do trajeto por espaço, sem espaço dentro do par', () => {
    const m = saida.match(/<coordinates>(-43[^<]*-22[^<]*)<\/coordinates>/)!
    expect(m[1]).toBe('-43.311235,-22.778123 -43.312,-22.779')
  })

  it('não escreve linha com menos de dois pontos', () => {
    expect(kml([pt(-22.778, -43.311, 1)], [], [])).not.toContain('<LineString>')
    expect(kml([], [], [])).not.toContain('<LineString>')
  })

  it('o nome de lugar com & e < não quebra o arquivo', () => {
    expect(saida).toContain('Casa &amp; &quot;Escritório&quot; &lt;RJ&gt;')
    expect(saida).not.toContain('Casa & "Escritório" <RJ>')
  })

  it('traz o horário de cada ponto e o intervalo de cada parada', () => {
    expect(saida).toContain('<TimeStamp><when>1970-01-01T00:00:01.000Z</when></TimeStamp>')
    expect(saida).toContain('<TimeSpan><begin>1970-01-01T00:00:01.000Z</begin><end>1970-01-01T00:00:02.000Z</end></TimeSpan>')
  })

  it('todas as marcações abrem e fecham na mesma conta', () => {
    for (const t of ['kml', 'Document', 'Placemark', 'Point', 'coordinates', 'LineString']) {
      const abre = (saida.match(new RegExp(`<${t}[ >]`, 'g')) ?? []).length
      const fecha = (saida.match(new RegExp(`</${t}>`, 'g')) ?? []).length
      expect(`${t}: ${abre} abre, ${fecha} fecha`).toBe(`${t}: ${abre} abre, ${abre} fecha`)
    }
  })

  it('deixa os dois arquivos em disco, para conferir fora daqui', () => {
    // O xmllint do sistema lê este arquivo na conferência manual. Não é parte da prova, é
    // comodidade: a prova está nas linhas acima.
    const pasta = process.env.SAIDA_PROVA_GEO
    if (!pasta) return
    writeFileSync(`${pasta}/prova.kml`, saida)
    writeFileSync(`${pasta}/prova.geojson`, JSON.stringify(geojson([pt(-22.778, -43.311, 1), pt(-22.779, -43.312, 2)], [casa], [parada]), null, 2))
    expect(true).toBe(true)
  })
})
