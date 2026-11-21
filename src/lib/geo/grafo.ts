// Grafo do MVP (ontologia preditiva, versão mínima): titular → lugares → município → notícias, e cenas da câmera.
// Exporta em arquivos abertos: GeoJSON (mapa), CSV (planilha) e JSON do grafo (nós e arestas com fonte).
import { arredondar } from './geojsonRfc'
import type { Lugar, Parada, Ponto } from './calculo'
import type { Cena } from './cofre'
import type { Municipio, Noticia } from './fontes'

export interface No { id: string; tipo: 'Titular' | 'Lugar' | 'Municipio' | 'Noticia' | 'Cena'; rotulo: string; props: Record<string, unknown> }
export interface Aresta { de: string; para: string; tipo: 'ESTEVE_EM' | 'FICA_EM' | 'NOTICIA_SOBRE' | 'OBSERVOU' | 'VAI_PARA'; peso?: number; fonte: string }

export function montarGrafo(args: {
  titular: string; lugares: Lugar[]; paradas: Parada[]; municipios: { lugarId: string; m: Municipio }[];
  noticias: { codigo: number; n: Noticia[] }[]; cenas: Cena[];
  previsoes: { de: string; para: string; chance: number }[]
}): { nos: No[]; arestas: Aresta[] } {
  const nos: No[] = [{ id: 'titular', tipo: 'Titular', rotulo: args.titular, props: {} }]
  const arestas: Aresta[] = []
  for (const l of args.lugares) {
    nos.push({ id: l.id, tipo: 'Lugar', rotulo: l.nome || 'Lugar sem nome', props: { lat: +l.lat.toFixed(5), lon: +l.lon.toFixed(5), visitas: l.visitas, minutos: l.minutos } })
    arestas.push({ de: 'titular', para: l.id, tipo: 'ESTEVE_EM', peso: l.minutos, fonte: 'GPS do aparelho do titular' })
  }
  const vistos = new Set<number>()
  for (const { lugarId, m } of args.municipios) {
    if (!vistos.has(m.codigo)) {
      vistos.add(m.codigo)
      nos.push({ id: `ibge:${m.codigo}`, tipo: 'Municipio', rotulo: `${m.nome}/${m.uf}`, props: { codigo_ibge: m.codigo, populacao_2022: m.populacao2022 } })
    }
    arestas.push({ de: lugarId, para: `ibge:${m.codigo}`, tipo: 'FICA_EM', fonte: 'OpenStreetMap Nominatim + IBGE Localidades' })
  }
  for (const { codigo, n } of args.noticias) {
    n.slice(0, 15).forEach((x, i) => {
      const id = `gdelt:${codigo}:${i}`
      nos.push({ id, tipo: 'Noticia', rotulo: x.titulo, props: { url: x.url, fonte: x.fonte, data: x.data } })
      arestas.push({ de: id, para: `ibge:${codigo}`, tipo: 'NOTICIA_SOBRE', fonte: 'GDELT DOC 2.0' })
    })
  }
  args.cenas.forEach((c, i) => {
    const id = `cena:${i}`
    nos.push({ id, tipo: 'Cena', rotulo: c.ambiente, props: { t: new Date(c.t).toISOString(), pessoas: c.pessoas, objetos: c.objetos.join(', ') } })
    arestas.push({ de: 'titular', para: id, tipo: 'OBSERVOU', fonte: 'Câmera do aparelho (COCO-SSD no aparelho)' })
  })
  for (const p of args.previsoes) arestas.push({ de: p.de, para: p.para, tipo: 'VAI_PARA', peso: +p.chance.toFixed(3), fonte: 'Previsão: cadeia de Markov sobre as paradas do titular' })
  return { nos, arestas }
}

// O GeoJSON exportado obedece à RFC 7946, e isso é conferido por src/lib/geo/geojsonRfc.ts
// a cada rodada do CI. Duas regras da norma mudaram o que este código faz:
//
//  §3.1.4 — uma linha precisa de pelo menos 2 pontos. Antes, quem tinha gravado um ponto só
//    (ou nenhum) e exportava levava um arquivo que a norma recusa, e nada avisava. Agora o
//    trajeto só entra quando há dois pontos ou mais; com menos, os pontos saem sozinhos.
//
//  §11.2 — seis casas decimais bastam, que é cerca de 10 cm. O aparelho entrega dez ou mais
//    casas, e as de sobra são precisão falsa: nenhum GPS de celular chega perto disso. Cortar
//    não perde informação nenhuma e para de exportar uma exatidão que não existe.
export function geojson(pontos: Ponto[], lugares: Lugar[], paradas: Parada[]) {
  const par = (lon: number, lat: number) => [arredondar(lon), arredondar(lat)]
  const emOrdem = [...pontos].sort((a, b) => a.t - b.t)
  const trajeto = emOrdem.length >= 2
    ? [{ type: 'Feature' as const, properties: { tipo: 'trajeto' }, geometry: { type: 'LineString' as const, coordinates: emOrdem.map(p => par(p.lon, p.lat)) } }]
    : []
  return {
    type: 'FeatureCollection' as const,
    features: [
      ...trajeto,
      ...pontos.map(p => ({ type: 'Feature' as const, properties: { tipo: 'ponto', t: new Date(p.t).toISOString(), precisao_m: Math.round(p.precisao), hash: p.hash }, geometry: { type: 'Point' as const, coordinates: par(p.lon, p.lat) } })),
      ...paradas.map(p => ({ type: 'Feature' as const, properties: { tipo: 'parada', inicio: new Date(p.inicio).toISOString(), fim: new Date(p.fim).toISOString(), lugar: lugares.find(l => l.id === p.lugarId)?.nome ?? '' }, geometry: { type: 'Point' as const, coordinates: par(p.lon, p.lat) } })),
      ...lugares.map(l => ({ type: 'Feature' as const, properties: { tipo: 'lugar', id: l.id, nome: l.nome, visitas: l.visitas, minutos: l.minutos }, geometry: { type: 'Point' as const, coordinates: par(l.lon, l.lat) } })),
    ],
  }
}

/** Escapa texto para dentro de XML. O nome de um lugar é escrito pelo titular: um "&" ou um
 *  "<" no nome quebraria o arquivo inteiro se entrasse cru. */
const xml = (v: unknown) =>
  String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;')

/**
 * Exporta em KML 2.2 (OGC), que é o formato que o Google Earth e a maioria dos programas de
 * mapa abrem direto. Três coisas que o padrão exige e que é fácil errar:
 *   - a ordem dentro de <coordinates> é longitude,latitude[,altitude] — o contrário do que
 *     quase todo mundo fala em voz alta
 *   - os pares vão separados por espaço, sem espaço DENTRO do par
 *   - uma linha precisa de pelo menos dois pontos, igual ao GeoJSON
 * As coordenadas saem com as mesmas 6 casas decimais do GeoJSON: o que o aparelho entrega a
 * mais é precisão falsa.
 */
export function kml(pontos: Ponto[], lugares: Lugar[], paradas: Parada[], titulo = 'THEYE Geo'): string {
  const c = (lon: number, lat: number) => `${arredondar(lon)},${arredondar(lat)}`
  const emOrdem = [...pontos].sort((a, b) => a.t - b.t)
  const partes: string[] = []
  if (emOrdem.length >= 2) {
    partes.push(
      '    <Placemark>\n      <name>Trajeto</name>\n      <LineString>\n        <tessellate>1</tessellate>\n' +
      `        <coordinates>${emOrdem.map(p => c(p.lon, p.lat)).join(' ')}</coordinates>\n` +
      '      </LineString>\n    </Placemark>',
    )
  }
  for (const p of emOrdem) {
    partes.push(
      '    <Placemark>\n' +
      `      <name>Ponto</name>\n      <description>Margem de erro informada pelo aparelho: ${Math.round(p.precisao)} m</description>\n` +
      `      <TimeStamp><when>${new Date(p.t).toISOString()}</when></TimeStamp>\n` +
      `      <Point><coordinates>${c(p.lon, p.lat)}</coordinates></Point>\n    </Placemark>`,
    )
  }
  for (const pa of paradas) {
    const lugar = lugares.find(l => l.id === pa.lugarId)?.nome ?? 'parada'
    partes.push(
      '    <Placemark>\n' +
      `      <name>Parada: ${xml(lugar)}</name>\n` +
      `      <TimeSpan><begin>${new Date(pa.inicio).toISOString()}</begin><end>${new Date(pa.fim).toISOString()}</end></TimeSpan>\n` +
      `      <Point><coordinates>${c(pa.lon, pa.lat)}</coordinates></Point>\n    </Placemark>`,
    )
  }
  for (const l of lugares) {
    partes.push(
      '    <Placemark>\n' +
      `      <name>${xml(l.nome)}</name>\n` +
      `      <description>${l.visitas} visita(s), ${Math.round(l.minutos)} minuto(s) no total</description>\n` +
      `      <Point><coordinates>${c(l.lon, l.lat)}</coordinates></Point>\n    </Placemark>`,
    )
  }
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<kml xmlns="http://www.opengis.net/kml/2.2">',
    '  <Document>',
    `    <name>${xml(titulo)}</name>`,
    '    <description>Exportado do THEYE Geo. Os dados ficam no aparelho do titular; este arquivo foi gerado por ele.</description>',
    ...partes,
    '  </Document>',
    '</kml>',
    '',
  ].join('\n')
}

const cel = (v: unknown) => { const s = v == null ? '' : String(v); return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

export function csvPontos(pontos: Ponto[]): string {
  const cab = 'horario_utc;latitude;longitude;precisao_m;velocidade_ms;bateria;hash'
  return [cab, ...pontos.map(p => [new Date(p.t).toISOString(), p.lat, p.lon, Math.round(p.precisao), p.velocidade ?? '', p.bateria ?? '', p.hash ?? ''].map(cel).join(';'))].join('\n')
}

export function baixar(nome: string, conteudo: string, tipo: string) {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a'); a.href = url; a.download = nome; a.click()
  setTimeout(() => URL.revokeObjectURL(url), 2000)
}
