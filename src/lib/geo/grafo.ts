// Grafo do MVP (ontologia preditiva, versão mínima): titular → lugares → município → notícias, e cenas da câmera.
// Exporta em arquivos abertos: GeoJSON (mapa), CSV (planilha) e JSON do grafo (nós e arestas com fonte).
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

export function geojson(pontos: Ponto[], lugares: Lugar[], paradas: Parada[]) {
  return {
    type: 'FeatureCollection' as const,
    features: [
      { type: 'Feature' as const, properties: { tipo: 'trajeto' }, geometry: { type: 'LineString' as const, coordinates: [...pontos].sort((a, b) => a.t - b.t).map(p => [p.lon, p.lat]) } },
      ...pontos.map(p => ({ type: 'Feature' as const, properties: { tipo: 'ponto', t: new Date(p.t).toISOString(), precisao_m: Math.round(p.precisao), hash: p.hash }, geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] } })),
      ...paradas.map(p => ({ type: 'Feature' as const, properties: { tipo: 'parada', inicio: new Date(p.inicio).toISOString(), fim: new Date(p.fim).toISOString(), lugar: lugares.find(l => l.id === p.lugarId)?.nome ?? '' }, geometry: { type: 'Point' as const, coordinates: [p.lon, p.lat] } })),
      ...lugares.map(l => ({ type: 'Feature' as const, properties: { tipo: 'lugar', id: l.id, nome: l.nome, visitas: l.visitas, minutos: l.minutos }, geometry: { type: 'Point' as const, coordinates: [l.lon, l.lat] } })),
    ],
  }
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
