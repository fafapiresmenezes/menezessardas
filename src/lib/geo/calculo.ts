// Fase G do plano mestre THEYE v4 (G2, G3, G7): contas puras sobre os pontos gravados pelo titular.
// Nada aqui toca rede, câmera ou disco: só recebe pontos e devolve paradas, lugares, resumo e previsão.

export interface Ponto {
  t: number            // horário em milissegundos (UTC)
  lat: number
  lon: number
  precisao: number     // margem de erro em metros, como o aparelho informou
  velocidade?: number | null // m/s, se o aparelho informou
  bateria?: number | null    // 0 a 1, se o navegador informa
  hash?: string        // elo da corrente (sha256 do anterior + este ponto)
}

export interface Parada {
  inicio: number
  fim: number
  lat: number
  lon: number
  precisao: number     // pior margem de erro dentro da parada
  pontos: number
  lugarId?: string
}

export interface Lugar {
  id: string
  lat: number
  lon: number
  nome: string         // dado pelo titular (casa, escritório, fórum); vazio = sem nome
  visitas: number
  minutos: number
}

const R = 6371000
const rad = (g: number) => (g * Math.PI) / 180

/** Distância em metros entre dois pontos (fórmula de haversine). */
export function distancia(a: { lat: number; lon: number }, b: { lat: number; lon: number }): number {
  const dLat = rad(b.lat - a.lat), dLon = rad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Quilômetros percorridos, ignorando saltos que são só erro do GPS (ponto impreciso ou velocidade impossível). */
export function quilometros(pontos: Ponto[]): number {
  const p = [...pontos].sort((a, b) => a.t - b.t).filter(x => x.precisao <= 150)
  let m = 0
  for (let i = 1; i < p.length; i++) {
    const d = distancia(p[i - 1], p[i])
    const s = (p[i].t - p[i - 1].t) / 1000
    if (s <= 0) continue
    if (d / s > 70) continue // mais de 250 km/h em terra: é salto de sinal, não deslocamento
    if (d < Math.max(p[i].precisao, p[i - 1].precisao)) continue // dentro da margem de erro: parado
    m += d
  }
  return m / 1000
}

/**
 * Paradas: trechos em que o titular ficou dentro de um raio (padrão 100 m) por pelo menos N minutos (padrão 5).
 * O centro é a média ponderada pela precisão (ponto mais preciso pesa mais).
 */
export function detectarParadas(pontos: Ponto[], raio = 100, minutosMin = 5): Parada[] {
  const p = [...pontos].sort((a, b) => a.t - b.t)
  const out: Parada[] = []
  let i = 0
  while (i < p.length) {
    let j = i + 1
    while (j < p.length && distancia(p[i], p[j]) <= raio) j++
    const grupo = p.slice(i, j)
    const dur = grupo[grupo.length - 1].t - grupo[0].t
    if (dur >= minutosMin * 60000) {
      let sw = 0, sl = 0, so = 0
      for (const g of grupo) { const w = 1 / Math.max(5, g.precisao); sw += w; sl += g.lat * w; so += g.lon * w }
      out.push({ inicio: grupo[0].t, fim: grupo[grupo.length - 1].t, lat: sl / sw, lon: so / sw, precisao: Math.max(...grupo.map(g => g.precisao)), pontos: grupo.length })
      i = j
    } else i++
  }
  return out
}

/** Junta paradas próximas (padrão 150 m) no mesmo lugar e conta visitas e minutos. Mantém nomes já dados. */
export function agruparLugares(paradas: Parada[], nomes: Lugar[] = [], raio = 150): { lugares: Lugar[]; paradas: Parada[] } {
  const lugares: Lugar[] = nomes.map(l => ({ ...l, visitas: 0, minutos: 0 }))
  const marcadas = paradas.map(pa => {
    let alvo = lugares.find(l => distancia(l, pa) <= raio)
    if (!alvo) {
      alvo = { id: `L${lugares.length + 1}-${Math.round(pa.lat * 1e4)}${Math.round(pa.lon * 1e4)}`, lat: pa.lat, lon: pa.lon, nome: '', visitas: 0, minutos: 0 }
      lugares.push(alvo)
    }
    alvo.visitas++
    alvo.minutos += Math.round((pa.fim - pa.inicio) / 60000)
    return { ...pa, lugarId: alvo.id }
  })
  return { lugares: lugares.filter(l => l.visitas > 0 || l.nome).sort((a, b) => b.minutos - a.minutos), paradas: marcadas }
}

export interface ResumoSemana { km: number; porLugar: { lugar: Lugar; minutos: number }[]; dias: number; pontos: number }

export function resumoPeriodo(pontos: Ponto[], lugares: Lugar[], paradas: Parada[], desde: number, ate: number): ResumoSemana {
  const pts = pontos.filter(p => p.t >= desde && p.t < ate)
  const mins = new Map<string, number>()
  for (const pa of paradas) {
    if (pa.fim < desde || pa.inicio >= ate || !pa.lugarId) continue
    const m = (Math.min(pa.fim, ate) - Math.max(pa.inicio, desde)) / 60000
    mins.set(pa.lugarId, (mins.get(pa.lugarId) ?? 0) + m)
  }
  const porLugar = [...mins.entries()].map(([id, minutos]) => ({ lugar: lugares.find(l => l.id === id)!, minutos: Math.round(minutos) }))
    .filter(x => x.lugar).sort((a, b) => b.minutos - a.minutos)
  const dias = new Set(pts.map(p => new Date(p.t).toDateString())).size
  return { km: quilometros(pts), porLugar, dias, pontos: pts.length }
}

/** Linha do tempo do dia: alterna "parado em X" e "em deslocamento". */
export function linhaDoTempo(paradas: Parada[], lugares: Lugar[], dia: Date): { de: number; ate: number; texto: string; tipo: 'parado' | 'movimento' }[] {
  const ini = new Date(dia); ini.setHours(0, 0, 0, 0)
  const fim = ini.getTime() + 86400000
  const doDia = paradas.filter(p => p.fim >= ini.getTime() && p.inicio < fim).sort((a, b) => a.inicio - b.inicio)
  const out: { de: number; ate: number; texto: string; tipo: 'parado' | 'movimento' }[] = []
  doDia.forEach((p, k) => {
    if (k > 0) out.push({ de: doDia[k - 1].fim, ate: p.inicio, texto: 'Em deslocamento', tipo: 'movimento' })
    const l = lugares.find(x => x.id === p.lugarId)
    out.push({ de: p.inicio, ate: p.fim, texto: l?.nome ? `Em ${l.nome}` : 'Parado em lugar sem nome', tipo: 'parado' })
  })
  return out
}

/**
 * Previsão do próximo lugar (o pedaço "preditivo" do grafo no MVP): conta, para cada lugar,
 * quantas vezes o titular saiu dele e foi para cada outro (cadeia de Markov de 1ª ordem),
 * com suavização de Laplace e o número de observações, para a tela mostrar a incerteza.
 */
export function preverProximo(paradas: Parada[], atualId: string): { lugarId: string; chance: number; vezes: number }[] {
  const seq = [...paradas].filter(p => p.lugarId).sort((a, b) => a.inicio - b.inicio).map(p => p.lugarId!)
  const destinos = new Set(seq)
  const cont = new Map<string, number>()
  let total = 0
  for (let i = 1; i < seq.length; i++) {
    if (seq[i - 1] !== atualId || seq[i] === atualId) continue
    cont.set(seq[i], (cont.get(seq[i]) ?? 0) + 1); total++
  }
  destinos.delete(atualId)
  const k = destinos.size
  if (k === 0) return []
  return [...destinos].map(id => ({ lugarId: id, vezes: cont.get(id) ?? 0, chance: ((cont.get(id) ?? 0) + 1) / (total + k) }))
    .sort((a, b) => b.chance - a.chance)
}

export const fmtMin = (m: number) => (m >= 60 ? `${Math.floor(m / 60)} h ${String(Math.round(m % 60)).padStart(2, '0')} min` : `${Math.round(m)} min`)
