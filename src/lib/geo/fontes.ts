// G5 (satélites), G6 (camadas públicas por município) e C15 (GDELT) no MVP.
// Tudo aberto e sem chave. Quando uma consulta sai do aparelho, ela leva no máximo a posição
// arredondada (cerca de 1 km) ou o nome do município, nunca a trilha do titular.

export interface Satelite {
  nome: string
  mede: string
  resolucao: string
  revisita: string
  licenca: string
  catalogo: string
  noMapa: boolean
}

/** Inventário G5.1: o que é aberto, o que mede e onde se baixa por área e período (STAC). */
export const SATELITES: Satelite[] = [
  { nome: 'Sentinel-2 (Copernicus, ESA)', mede: 'Cor real e infravermelho: vegetação (NDVI), água (NDWI), área construída', resolucao: '10 m', revisita: '5 dias', licenca: 'Copernicus, livre inclusive comercial', catalogo: 'https://planetarycomputer.microsoft.com/api/stac/v1 (coleção sentinel-2-l2a) e https://catalogue.dataspace.copernicus.eu/stac', noMapa: true },
  { nome: 'Sentinel-1 (Copernicus, ESA)', mede: 'Radar: enxerga através de nuvem, alagamento, deformação do solo', resolucao: '10 m', revisita: '6 a 12 dias', licenca: 'Copernicus, livre inclusive comercial', catalogo: 'https://planetarycomputer.microsoft.com/api/stac/v1 (coleção sentinel-1-rtc)', noMapa: false },
  { nome: 'Landsat 8 e 9 (USGS/NASA)', mede: 'Cor, infravermelho e temperatura da superfície; série desde 1984', resolucao: '30 m (térmico 100 m)', revisita: '8 dias (os dois juntos)', licenca: 'Domínio público (USGS)', catalogo: 'https://landsatlook.usgs.gov/stac-server e Planetary Computer (landsat-c2-l2)', noMapa: true },
  { nome: 'CBERS-4A e Amazonia-1 (INPE)', mede: 'Cor e infravermelho sobre o Brasil; base do PRODES e DETER', resolucao: '2 a 64 m', revisita: '5 a 31 dias', licenca: 'Livre (INPE, CC BY-SA)', catalogo: 'https://data.inpe.br/bdc/stac/v1', noMapa: false },
  { nome: 'VIIRS Black Marble (NASA)', mede: 'Luz noturna: atividade econômica, apagões, crescimento urbano', resolucao: '500 m', revisita: 'diária (composto anual no mapa)', licenca: 'Domínio público (NASA)', catalogo: 'https://gibs.earthdata.nasa.gov (camada VIIRS_Black_Marble)', noMapa: true },
  { nome: 'FIRMS / VIIRS focos de calor (NASA)', mede: 'Focos de calor (fogo ativo)', resolucao: '375 m', revisita: 'várias vezes ao dia', licenca: 'Domínio público (NASA)', catalogo: 'https://firms.modaps.eosdis.nasa.gov (chave grátis para CSV) e GIBS', noMapa: true },
  { nome: 'MODIS Terra (NASA)', mede: 'Cor real do dia anterior, nuvem, fumaça', resolucao: '250 m', revisita: 'diária', licenca: 'Domínio público (NASA)', catalogo: 'https://gibs.earthdata.nasa.gov', noMapa: true },
]

export interface CamadaMapa { id: string; nome: string; dica: string; tiles: string[]; tamanho: number; maxzoom: number; atribuicao: string; opacidade: number }

const ontem = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10)
const gibs = (camada: string, data: string, nivel: number, ext: 'jpg' | 'png') =>
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${camada}/default/${data}/GoogleMapsCompatible_Level${nivel}/{z}/{y}/{x}.${ext}`

export function camadasSatelite(): CamadaMapa[] {
  return [
    { id: 's2', nome: 'Sentinel-2 sem nuvens (2023)', dica: 'Mosaico de 10 m sem nuvens, ótimo para ver ruas e quadras. Licença não comercial (EOX): no produto pago, usar cenas próprias do Sentinel-2.', tiles: ['https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg'], tamanho: 256, maxzoom: 17, atribuicao: 'Sentinel-2 cloudless 2023 by EOX (CC BY-NC-SA 4.0), Copernicus', opacidade: 1 },
    { id: 'modis', nome: 'Cor real de ontem (MODIS)', dica: 'Foto do planeta de ontem, 250 m: nuvem, fumaça, enchente grande.', tiles: [gibs('MODIS_Terra_CorrectedReflectance_TrueColor', ontem(), 9, 'jpg')], tamanho: 256, maxzoom: 9, atribuicao: 'NASA GIBS / MODIS Terra', opacidade: 1 },
    { id: 'luz', nome: 'Luz noturna (VIIRS)', dica: 'Onde há luz à noite: sinal de atividade econômica e de gente.', tiles: [gibs('VIIRS_Black_Marble', '2016-01-01', 8, 'png')], tamanho: 256, maxzoom: 8, atribuicao: 'NASA Black Marble (VIIRS)', opacidade: 0.85 },
    { id: 'fogo', nome: 'Focos de calor de ontem (FIRMS/VIIRS)', dica: 'Pontos de fogo ativo detectados ontem pelo satélite.', tiles: [gibs('VIIRS_NOAA20_Thermal_Anomalies_375m_All', ontem(), 9, 'png')], tamanho: 256, maxzoom: 9, atribuicao: 'NASA FIRMS / GIBS', opacidade: 1 },
  ]
}

export interface Cena { id: string; data: string; nuvem: number | null; satelite: string; colecao: string; tilejson?: string; miniatura?: string }

const STAC_PC = 'https://planetarycomputer.microsoft.com/api/stac/v1'

/** G5.2: cenas por área e período (nunca o planeta inteiro). Usa o catálogo STAC aberto do Planetary Computer. */
export async function buscarCenas(lat: number, lon: number, colecao: 'sentinel-2-l2a' | 'landsat-c2-l2' = 'sentinel-2-l2a', dias = 60): Promise<Cena[]> {
  const fim = new Date(), ini = new Date(Date.now() - dias * 86400000)
  const d = 0.01
  const r = await fetch(`${STAC_PC}/search`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ collections: [colecao], bbox: [lon - d, lat - d, lon + d, lat + d], datetime: `${ini.toISOString()}/${fim.toISOString()}`, limit: 12, sortby: [{ field: 'datetime', direction: 'desc' }] }),
  })
  if (!r.ok) throw new Error(`Catálogo de satélite respondeu ${r.status}`)
  const j = await r.json() as { features: { id: string; collection: string; properties: Record<string, unknown>; links: { rel: string; href: string }[]; assets: Record<string, { href: string }> }[] }
  return j.features.map(f => ({
    id: f.id, colecao: f.collection,
    data: String(f.properties.datetime ?? '').slice(0, 10),
    nuvem: typeof f.properties['eo:cloud_cover'] === 'number' ? Math.round(f.properties['eo:cloud_cover'] as number) : null,
    satelite: String(f.properties.platform ?? colecao),
    tilejson: f.links.find(l => l.rel === 'tilejson')?.href,
    miniatura: f.assets.rendered_preview?.href,
  }))
}

/** Camada de índice de vegetação (NDVI) de uma cena Sentinel-2, desenhada pelo serviço aberto do Planetary Computer. */
export function tileNdvi(cena: Cena): string {
  const q = new URLSearchParams({ collection: cena.colecao, item: cena.id, expression: '(B08-B04)/(B08+B04)', asset_as_band: 'true', rescale: '-1,1', colormap_name: 'rdylgn' })
  return `https://planetarycomputer.microsoft.com/api/data/v1/item/tiles/WebMercatorQuad/{z}/{x}/{y}@1x?${q}`
}

export async function tilesDaCena(cena: Cena): Promise<string[]> {
  if (!cena.tilejson) throw new Error('Esta cena não traz camada pronta para o mapa')
  const r = await fetch(cena.tilejson)
  if (!r.ok) throw new Error(`Serviço da cena respondeu ${r.status}`)
  return (await r.json()).tiles as string[]
}

// ---------- G6: município (IBGE) ----------

export interface Municipio { codigo: number; nome: string; uf: string; populacao2022: number | null; malha: GeoJSON.GeoJSON | null; fontes: string[] }

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
const arred = (x: number) => Math.round(x * 100) / 100 // ~1 km: a consulta externa não leva a posição exata

export async function municipioDe(lat: number, lon: number): Promise<Municipio> {
  const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=10&accept-language=pt-BR&lat=${arred(lat)}&lon=${arred(lon)}`)
  if (!r.ok) throw new Error(`Não achei o município (OpenStreetMap respondeu ${r.status})`)
  const a = (await r.json()).address as Record<string, string> | undefined
  const nome = a?.city ?? a?.town ?? a?.municipality ?? a?.village ?? ''
  const uf = (a?.['ISO3166-2-lvl4'] ?? '').replace('BR-', '')
  if (!nome || !uf) throw new Error('Fora do Brasil ou sem município nesse ponto')
  const lista = await (await fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${uf}/municipios`)).json() as { id: number; nome: string }[]
  const m = lista.find(x => semAcento(x.nome) === semAcento(nome))
  if (!m) throw new Error(`O IBGE não tem "${nome}" em ${uf}`)
  return fichaMunicipio(m.id, m.nome, uf)
}

export async function fichaMunicipio(codigo: number, nome: string, uf: string): Promise<Municipio> {
  const [malha, pop] = await Promise.allSettled([
    fetch(`https://servicodados.ibge.gov.br/api/v3/malhas/municipios/${codigo}?formato=application/vnd.geo%2Bjson&qualidade=minima`).then(r => r.json()),
    fetch(`https://servicodados.ibge.gov.br/api/v3/agregados/4709/periodos/2022/variaveis/93?localidades=N6[${codigo}]`).then(r => r.json()),
  ])
  let populacao2022: number | null = null
  if (pop.status === 'fulfilled') {
    const v = pop.value?.[0]?.resultados?.[0]?.series?.[0]?.serie?.['2022']
    populacao2022 = v ? Number(v) : null
  }
  return {
    codigo, nome, uf, populacao2022, malha: malha.status === 'fulfilled' ? malha.value : null,
    fontes: ['IBGE, Localidades (código do município)', 'IBGE, Malhas territoriais (limite do município)', 'IBGE, Censo 2022, tabela 4709 (população)'],
  }
}

// ---------- C15 no MVP: GDELT ----------

export interface Noticia { titulo: string; url: string; fonte: string; data: string; idioma: string; tom?: number }

/** Notícias dos últimos dias sobre o município, pela interface DOC 2.0 do GDELT (aberta, sem chave). */
export async function noticiasGdelt(municipio: string, uf: string, dias = 7): Promise<Noticia[]> {
  const q = `"${municipio}" sourcecountry:BR`
  const u = `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=artlist&maxrecords=30&format=json&sort=datedesc&timespan=${dias}d`
  const r = await fetch(u)
  if (!r.ok) throw new Error(`GDELT respondeu ${r.status}`)
  const texto = await r.text()
  if (!texto.trim().startsWith('{')) throw new Error(`GDELT: ${texto.slice(0, 120)}`)
  const j = JSON.parse(texto) as { articles?: { title: string; url: string; domain: string; seendate: string; language: string }[] }
  void uf
  return (j.articles ?? []).map(a => ({
    titulo: a.title, url: a.url, fonte: a.domain, idioma: a.language,
    data: a.seendate ? `${a.seendate.slice(0, 4)}-${a.seendate.slice(4, 6)}-${a.seendate.slice(6, 8)}` : '',
  }))
}

/** Tom médio das notícias por dia (−10 muito negativo a +10 muito positivo), para a série do grafo. */
export async function tomGdelt(municipio: string, dias = 30): Promise<{ data: string; tom: number }[]> {
  const q = `"${municipio}" sourcecountry:BR`
  const r = await fetch(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q)}&mode=timelinetone&format=json&timespan=${dias}d`)
  if (!r.ok) throw new Error(`GDELT respondeu ${r.status}`)
  const j = await r.json() as { timeline?: { data: { date: string; value: number }[] }[] }
  return (j.timeline?.[0]?.data ?? []).map(d => ({ data: `${d.date.slice(0, 4)}-${d.date.slice(4, 6)}-${d.date.slice(6, 8)}`, tom: Math.round(d.value * 100) / 100 }))
}

/** Camadas públicas que ainda não estão no mapa (G6), com o caminho de cada uma, para o relatório não esconder lacunas. */
export const CAMADAS_PENDENTES = [
  { nome: 'MapBiomas (uso e cobertura do solo)', caminho: 'GeoTIFF anual por município em https://brasil.mapbiomas.org; precisa de servidor de tiles próprio' },
  { nome: 'ANA (rios, outorgas, estações)', caminho: 'Serviços WMS/ArcGIS em https://metadados.snirh.gov.br' },
  { nome: 'ANM (processos minerários, SIGMINE)', caminho: 'Shapefile por UF em https://geo.anm.gov.br' },
  { nome: 'INCRA/SIGEF e CAR (imóveis rurais)', caminho: 'https://acervofundiario.incra.gov.br e https://consultapublica.car.gov.br' },
  { nome: 'DNIT (rodovias federais)', caminho: 'Shapefile SNV em https://www.gov.br/dnit' },
  { nome: 'IBGE setores censitários 2022', caminho: 'https://www.ibge.gov.br/geociencias (malha de setores); precisa de servidor de tiles' },
]
