// Dimensão 7 da régua do geo: o GeoJSON que o app exporta é válido na norma, ou não é.
// Até hoje a régua dizia só "exporta GeoJSON", que é uma afirmação sobre intenção, não sobre
// conformidade. Este arquivo é o conferidor: ele lê um GeoJSON e devolve, em português, cada
// ponto em que ele desobedece à RFC 7946. Zero problema é o que a nota 10 exige, e a máquina
// mede isso a cada rodada.
//
// A RFC 7946 (agosto de 2016) substituiu a especificação de 2008 e é a norma do IETF para
// GeoJSON. As regras conferidas aqui, com a seção de origem:
//   §1.1  a ordem é longitude, latitude (x, y) — não latitude primeiro
//   §3.1.1 cada posição é [lon, lat] ou [lon, lat, altitude]; lon em [-180, 180], lat em [-90, 90]
//   §3.1.4 LineString precisa de pelo menos 2 posições
//   §3.1.6 cada anel de Polygon precisa de 4 posições e fechar no mesmo ponto
//   §3.2  Feature tem "geometry" e "properties" (podem ser nulos) e type "Feature"
//   §3.3  FeatureCollection tem "features", que é uma lista
//   §4    as coordenadas são WGS 84 (não há outro sistema permitido)
//   §7.1  nada de "crs": a norma de 2016 tirou esse campo de propósito
//   §11.2 seis casas decimais bastam (cerca de 10 cm); mais que isso só engorda o arquivo
//
// Nada aqui depende de biblioteca de fora: o conferidor é curto e a norma é curta.

export interface ProblemaGeoJSON {
  /** onde: um caminho legível, como "features[2].geometry.coordinates[0]" */
  onde: string
  /** o que está errado, em palavras do dia a dia */
  problema: string
  /** a seção da RFC 7946 que manda o contrário */
  secao: string
}

const GEOMETRIAS = ['Point', 'MultiPoint', 'LineString', 'MultiLineString', 'Polygon', 'MultiPolygon', 'GeometryCollection']

/** Casas decimais que a norma considera suficientes (§11.2). */
export const CASAS_SUFICIENTES = 6

function conferirPosicao(pos: unknown, onde: string, ps: ProblemaGeoJSON[]): void {
  if (!Array.isArray(pos)) { ps.push({ onde, problema: 'a posição não é uma lista de números', secao: '§3.1.1' }); return }
  if (pos.length < 2 || pos.length > 3) {
    ps.push({ onde, problema: `a posição tem ${pos.length} número(s); a norma aceita 2 (longitude e latitude) ou 3 (com altitude)`, secao: '§3.1.1' })
    return
  }
  const [lon, lat] = pos as number[]
  for (const [i, v] of (pos as unknown[]).entries()) {
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      ps.push({ onde: `${onde}[${i}]`, problema: 'não é um número', secao: '§3.1.1' })
      return
    }
  }
  if (lon < -180 || lon > 180) ps.push({ onde: `${onde}[0]`, problema: `longitude ${lon} fora de [-180, 180]`, secao: '§3.1.1' })
  if (lat < -90 || lat > 90) ps.push({ onde: `${onde}[1]`, problema: `latitude ${lat} fora de [-90, 90]`, secao: '§3.1.1' })
  // A troca clássica: alguém grava [lat, lon]. Quando o primeiro número não cabe em latitude
  // mas o segundo cabe, e o primeiro cabe em longitude, não há como distinguir — por isso só
  // acusamos o caso em que o primeiro número é impossível como longitude válida de latitude.
  if (Math.abs(lon) <= 90 && Math.abs(lat) > 90) {
    ps.push({ onde, problema: 'a ordem parece invertida: a norma pede longitude primeiro, latitude depois', secao: '§1.1' })
  }
  for (const [i, v] of [lon, lat].entries()) {
    const casas = (String(v).split('.')[1] ?? '').length
    if (casas > CASAS_SUFICIENTES) {
      ps.push({ onde: `${onde}[${i}]`, problema: `${casas} casas decimais; ${CASAS_SUFICIENTES} já valem cerca de 10 cm e a norma diz que mais que isso não serve para nada`, secao: '§11.2' })
    }
  }
}

function conferirGeometria(g: unknown, onde: string, ps: ProblemaGeoJSON[]): void {
  if (g === null) return // §3.2: Feature pode ter geometry nulo
  if (typeof g !== 'object') { ps.push({ onde, problema: 'a geometria não é um objeto', secao: '§3.1' }); return }
  const o = g as Record<string, unknown>
  const tipo = o.type
  if (typeof tipo !== 'string' || !GEOMETRIAS.includes(tipo)) {
    ps.push({ onde: `${onde}.type`, problema: `"${String(tipo)}" não é um tipo de geometria da norma`, secao: '§1.4' })
    return
  }
  if ('crs' in o) ps.push({ onde: `${onde}.crs`, problema: 'a norma de 2016 tirou o campo "crs": as coordenadas são sempre WGS 84', secao: '§4' })

  if (tipo === 'GeometryCollection') {
    const gs = o.geometries
    if (!Array.isArray(gs)) { ps.push({ onde: `${onde}.geometries`, problema: 'falta a lista "geometries"', secao: '§3.1.8' }); return }
    gs.forEach((x, i) => conferirGeometria(x, `${onde}.geometries[${i}]`, ps))
    return
  }

  const c = o.coordinates
  if (!Array.isArray(c)) { ps.push({ onde: `${onde}.coordinates`, problema: 'falta a lista "coordinates"', secao: '§3.1' }); return }

  if (tipo === 'Point') { conferirPosicao(c, `${onde}.coordinates`, ps); return }
  if (tipo === 'MultiPoint') { c.forEach((p, i) => conferirPosicao(p, `${onde}.coordinates[${i}]`, ps)); return }
  if (tipo === 'LineString') {
    if (c.length < 2) ps.push({ onde: `${onde}.coordinates`, problema: `uma linha com ${c.length} ponto(s) não é uma linha; a norma exige pelo menos 2`, secao: '§3.1.4' })
    c.forEach((p, i) => conferirPosicao(p, `${onde}.coordinates[${i}]`, ps))
    return
  }
  if (tipo === 'MultiLineString') {
    c.forEach((l, i) => {
      if (!Array.isArray(l) || l.length < 2) ps.push({ onde: `${onde}.coordinates[${i}]`, problema: 'linha com menos de 2 pontos', secao: '§3.1.5' })
      else l.forEach((p, j) => conferirPosicao(p, `${onde}.coordinates[${i}][${j}]`, ps))
    })
    return
  }
  const conferirAnel = (anel: unknown, onde2: string) => {
    if (!Array.isArray(anel) || anel.length < 4) {
      ps.push({ onde: onde2, problema: `o anel tem ${Array.isArray(anel) ? anel.length : 0} ponto(s); a norma exige 4, com o último igual ao primeiro`, secao: '§3.1.6' })
      return
    }
    anel.forEach((p, j) => conferirPosicao(p, `${onde2}[${j}]`, ps))
    const a = anel[0] as number[], z = anel[anel.length - 1] as number[]
    if (Array.isArray(a) && Array.isArray(z) && (a[0] !== z[0] || a[1] !== z[1])) {
      ps.push({ onde: onde2, problema: 'o anel não fecha: o último ponto tem de ser igual ao primeiro', secao: '§3.1.6' })
    }
  }
  if (tipo === 'Polygon') { c.forEach((anel, i) => conferirAnel(anel, `${onde}.coordinates[${i}]`)); return }
  if (tipo === 'MultiPolygon') c.forEach((pol, i) => (Array.isArray(pol) ? pol : []).forEach((anel, j) => conferirAnel(anel, `${onde}.coordinates[${i}][${j}]`)))
}

/** Confere um GeoJSON contra a RFC 7946. Lista vazia = válido. */
export function validarGeoJSON(raiz: unknown, onde = 'raiz'): ProblemaGeoJSON[] {
  const ps: ProblemaGeoJSON[] = []
  if (raiz === null || typeof raiz !== 'object') {
    ps.push({ onde, problema: 'não é nem um objeto GeoJSON', secao: '§3' })
    return ps
  }
  const o = raiz as Record<string, unknown>
  if ('crs' in o) ps.push({ onde: `${onde}.crs`, problema: 'a norma de 2016 tirou o campo "crs": as coordenadas são sempre WGS 84', secao: '§4' })
  if ('bbox' in o) {
    const b = o.bbox
    if (!Array.isArray(b) || (b.length !== 4 && b.length !== 6)) {
      ps.push({ onde: `${onde}.bbox`, problema: 'a caixa envolvente precisa de 4 números (ou 6, com altitude)', secao: '§5' })
    }
  }
  const tipo = o.type
  if (tipo === 'FeatureCollection') {
    const fs = o.features
    if (!Array.isArray(fs)) { ps.push({ onde: `${onde}.features`, problema: 'falta a lista "features"', secao: '§3.3' }); return ps }
    fs.forEach((f, i) => ps.push(...validarGeoJSON(f, `${onde}.features[${i}]`)))
    return ps
  }
  if (tipo === 'Feature') {
    if (!('geometry' in o)) ps.push({ onde: `${onde}.geometry`, problema: 'falta o campo "geometry" (pode ser nulo, mas tem de existir)', secao: '§3.2' })
    else conferirGeometria(o.geometry, `${onde}.geometry`, ps)
    if (!('properties' in o)) ps.push({ onde: `${onde}.properties`, problema: 'falta o campo "properties" (pode ser nulo, mas tem de existir)', secao: '§3.2' })
    else if (o.properties !== null && (typeof o.properties !== 'object' || Array.isArray(o.properties))) {
      ps.push({ onde: `${onde}.properties`, problema: '"properties" tem de ser um objeto ou nulo', secao: '§3.2' })
    }
    return ps
  }
  if (typeof tipo === 'string' && GEOMETRIAS.includes(tipo)) { conferirGeometria(o, onde, ps); return ps }
  ps.push({ onde: `${onde}.type`, problema: `"${String(tipo)}" não é um tipo da norma (esperado FeatureCollection, Feature ou uma geometria)`, secao: '§1.4' })
  return ps
}

/** Arredonda uma posição para as casas que a norma considera suficientes (§11.2). */
export function arredondar(v: number): number {
  return Math.round(v * 10 ** CASAS_SUFICIENTES) / 10 ** CASAS_SUFICIENTES
}
