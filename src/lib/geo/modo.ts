// Modo de transporte a partir dos pontos gravados (elo R5 do trilho do geomapeamento).
// Baseado em Reddy, Mun, Burke, Estrin, Hansen & Srivastava, "Using mobile phones to
// determine transportation modes" (ACM Transactions on Sensor Networks, 2010): a velocidade
// separa bem parado / a pé / bicicleta / veículo, desde que se SUAVIZE o resultado — um
// ponto solto de GPS ruim não pode virar "você andou de carro por 3 segundos".
//
// Tudo é conta pura sobre os pontos do cofre: nada sai do aparelho.
import { distancia, type Ponto } from './calculo'

export type Modo = 'parado' | 'a pé' | 'bicicleta' | 'veículo' | 'indefinido'

/** Limiares em metros por segundo. Entre parênteses, o equivalente em km/h. */
export const LIMIARES = {
  parado: 0.5,      // até 1,8 km/h — ruído de GPS parado
  aPe: 2.2,         // até ~8 km/h — caminhada e corrida leve
  bicicleta: 6.5,   // até ~23 km/h
} as const

export const FONTE_MODO = {
  autores: 'Reddy, Mun, Burke, Estrin, Hansen & Srivastava',
  titulo: 'Using mobile phones to determine transportation modes',
  onde: 'ACM Transactions on Sensor Networks, 2010',
  url: 'https://doi.org/10.1145/1689239.1689243',
}

export function classificarVelocidade(v: number | null | undefined): Modo {
  if (v == null || !Number.isFinite(v) || v < 0) return 'indefinido'
  if (v < LIMIARES.parado) return 'parado'
  if (v < LIMIARES.aPe) return 'a pé'
  if (v < LIMIARES.bicicleta) return 'bicicleta'
  return 'veículo'
}

/**
 * Velocidade de cada ponto, em m/s. Usa a que o aparelho informou quando existe;
 * senão calcula pela distância e pelo tempo até o ponto anterior.
 */
export function velocidades(pontos: Ponto[]): (number | null)[] {
  return pontos.map((p, i) => {
    if (p.velocidade != null && Number.isFinite(p.velocidade) && p.velocidade >= 0) return p.velocidade
    if (i === 0) return null
    const dt = (p.t - pontos[i - 1].t) / 1000
    if (dt <= 0) return null
    return distancia(pontos[i - 1], p) / dt
  })
}

/** Voto da maioria numa janela deslizante: é o que impede o resultado de ficar piscando. */
export function suavizar(modos: Modo[], janela = 5): Modo[] {
  if (modos.length === 0) return []
  const meia = Math.floor(janela / 2)
  return modos.map((_, i) => {
    const pedaco = modos.slice(Math.max(0, i - meia), Math.min(modos.length, i + meia + 1)).filter(m => m !== 'indefinido')
    if (pedaco.length === 0) return 'indefinido'
    const cont = new Map<Modo, number>()
    for (const m of pedaco) cont.set(m, (cont.get(m) ?? 0) + 1)
    let melhor: Modo = 'indefinido', n = -1
    for (const [m, c] of cont) if (c > n) { melhor = m; n = c }
    return melhor
  })
}

/** O modo de cada ponto, já suavizado. */
export function modosDosPontos(pontos: Ponto[], janela = 5): Modo[] {
  return suavizar(velocidades(pontos).map(classificarVelocidade), janela)
}

export interface ResumoModo { modo: Modo; minutos: number; km: number; pontos: number }

/**
 * Quanto tempo e quanta distância em cada modo. O tempo de um ponto é o intervalo
 * até o ponto seguinte — intervalos absurdos (mais de 1 h) não entram, porque quase
 * sempre significam que o aparelho ficou desligado, não que a pessoa ficou parada ali.
 */
export function resumoDeModos(pontos: Ponto[], janela = 5): { porModo: ResumoModo[]; predominante: Modo } {
  const modos = modosDosPontos(pontos, janela)
  const acc = new Map<Modo, ResumoModo>()
  for (let i = 0; i < pontos.length; i++) {
    const m = modos[i]
    if (m === 'indefinido') continue
    const r = acc.get(m) ?? { modo: m, minutos: 0, km: 0, pontos: 0 }
    r.pontos++
    if (i + 1 < pontos.length) {
      const dt = (pontos[i + 1].t - pontos[i].t) / 1000
      if (dt > 0 && dt <= 3600) {
        r.minutos += dt / 60
        r.km += distancia(pontos[i], pontos[i + 1]) / 1000
      }
    }
    acc.set(m, r)
  }
  const porModo = [...acc.values()].sort((a, b) => b.minutos - a.minutos || b.pontos - a.pontos)
  return { porModo, predominante: porModo[0]?.modo ?? 'indefinido' }
}
