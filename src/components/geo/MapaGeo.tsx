// Mapa do MVP de geolocalização (G3, G5, G6): MapLibre com OpenStreetMap, camadas de satélite ligáveis,
// trajeto do titular, margem de erro de cada ponto, lugares e o limite do município (IBGE).
import { useEffect, useRef } from 'react'
import maplibregl, { type GeoJSONSource, type Map as MapaML } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import type { Lugar, Ponto } from '@/lib/geo/calculo'
import type { CamadaMapa } from '@/lib/geo/fontes'

interface Props {
  pontos: Ponto[]
  lugares: Lugar[]
  camadas: CamadaMapa[]
  ligadas: string[]
  cenaTiles: string[] | null
  malha: unknown | null
  centro: { lat: number; lon: number } | null
}

const VAZIO = { type: 'FeatureCollection', features: [] } as const

export default function MapaGeo({ pontos, lugares, camadas, ligadas, cenaTiles, malha, centro }: Props) {
  const div = useRef<HTMLDivElement>(null)
  const mapa = useRef<MapaML | null>(null)
  const pronto = useRef(false)
  const centrou = useRef(false)

  useEffect(() => {
    if (!div.current || mapa.current) return
    let m: MapaML
    try {
      m = new maplibregl.Map({
        container: div.current,
        style: {
          version: 8,
          glyphs: 'https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf',
          sources: { osm: { type: 'raster', tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'], tileSize: 256, maxzoom: 19, attribution: '© OpenStreetMap' } },
          layers: [{ id: 'osm', type: 'raster', source: 'osm' }],
        },
        center: [-43.17, -22.9], zoom: 10,
      })
    } catch {
      return // navegador sem WebGL (ou teste): a tela segue com as listas
    }
    m.addControl(new maplibregl.NavigationControl(), 'top-right')
    m.on('load', () => {
      for (const c of camadas) {
        m.addSource(`sat-${c.id}`, { type: 'raster', tiles: c.tiles, tileSize: c.tamanho, maxzoom: c.maxzoom, attribution: c.atribuicao })
        m.addLayer({ id: `sat-${c.id}`, type: 'raster', source: `sat-${c.id}`, layout: { visibility: 'none' }, paint: { 'raster-opacity': c.opacidade } })
      }
      m.addSource('municipio', { type: 'geojson', data: VAZIO as never })
      m.addLayer({ id: 'municipio-linha', type: 'line', source: 'municipio', paint: { 'line-color': '#111', 'line-width': 2, 'line-dasharray': [2, 1] } })
      m.addSource('trajeto', { type: 'geojson', data: VAZIO as never })
      m.addLayer({ id: 'trajeto', type: 'line', source: 'trajeto', paint: { 'line-color': '#0B0B0C', 'line-width': 3, 'line-opacity': 0.8 } })
      m.addSource('pontos', { type: 'geojson', data: VAZIO as never })
      // Margem de erro: círculo claro do tamanho aproximado da precisão (metros → pixels pelo zoom).
      m.addLayer({ id: 'erro', type: 'circle', source: 'pontos', paint: {
        'circle-color': '#75757A', 'circle-opacity': 0.12,
        'circle-radius': ['interpolate', ['exponential', 2], ['zoom'], 10, ['/', ['get', 'precisao'], 152], 20, ['/', ['get', 'precisao'], 0.149]],
      } })
      m.addLayer({ id: 'pontos', type: 'circle', source: 'pontos', paint: { 'circle-color': '#0B0B0C', 'circle-radius': 3 } })
      m.addSource('lugares', { type: 'geojson', data: VAZIO as never })
      m.addLayer({ id: 'lugares', type: 'circle', source: 'lugares', paint: { 'circle-color': '#fff', 'circle-stroke-color': '#0B0B0C', 'circle-stroke-width': 3, 'circle-radius': 8 } })
      m.addLayer({ id: 'lugares-nome', type: 'symbol', source: 'lugares', layout: { 'text-field': ['get', 'nome'], 'text-font': ['Open Sans Semibold'], 'text-offset': [0, 1.4], 'text-size': 12 } })
      m.on('click', 'pontos', e => {
        const p = e.features?.[0]?.properties as { t: string; precisao: number } | undefined
        if (p) new maplibregl.Popup().setLngLat(e.lngLat).setHTML(`${new Date(p.t).toLocaleString('pt-BR')}<br/>margem de erro ±${Math.round(p.precisao)} m`).addTo(m)
      })
      pronto.current = true
      m.fire('theye:pronto')
    })
    mapa.current = m
    return () => { m.remove(); mapa.current = null; pronto.current = false }
  }, [camadas])

  // Atualiza dados sempre que mudam (espera o mapa ficar pronto na primeira vez).
  useEffect(() => {
    const m = mapa.current
    if (!m) return
    const aplicar = () => {
      const ord = [...pontos].sort((a, b) => a.t - b.t)
      ;(m.getSource('trajeto') as GeoJSONSource)?.setData({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: ord.map(p => [p.lon, p.lat]) } })
      ;(m.getSource('pontos') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: ord.map(p => ({ type: 'Feature', properties: { t: p.t, precisao: p.precisao }, geometry: { type: 'Point', coordinates: [p.lon, p.lat] } })) })
      ;(m.getSource('lugares') as GeoJSONSource)?.setData({ type: 'FeatureCollection', features: lugares.map(l => ({ type: 'Feature', properties: { nome: l.nome || '' }, geometry: { type: 'Point', coordinates: [l.lon, l.lat] } })) })
      ;(m.getSource('municipio') as GeoJSONSource)?.setData((malha ?? VAZIO) as never)
      for (const c of camadas) if (m.getLayer(`sat-${c.id}`)) m.setLayoutProperty(`sat-${c.id}`, 'visibility', ligadas.includes(c.id) ? 'visible' : 'none')
      if (m.getLayer('cena')) { m.removeLayer('cena'); m.removeSource('cena') }
      if (cenaTiles?.length) {
        m.addSource('cena', { type: 'raster', tiles: cenaTiles, tileSize: 256, attribution: 'Microsoft Planetary Computer / Copernicus / USGS' })
        m.addLayer({ id: 'cena', type: 'raster', source: 'cena', paint: { 'raster-opacity': 0.9 } }, 'municipio-linha')
      }
      if (centro && !centrou.current) { m.jumpTo({ center: [centro.lon, centro.lat], zoom: 15 }); centrou.current = true }
    }
    if (pronto.current) aplicar()
    else m.once('theye:pronto', aplicar)
  }, [pontos, lugares, ligadas, cenaTiles, malha, centro, camadas])

  return <div ref={div} className="w-full h-[55vh] min-h-[320px] bg-pergaminho" role="region" aria-label="Mapa pessoal" />
}
