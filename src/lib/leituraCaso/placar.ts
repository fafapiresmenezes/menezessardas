// Placar das previsões do próprio escritório: compara a chance registrada em cada leitura com o desfecho real.
// Só entram sentenças de mérito (procedente ou improcedente); parcial, acordo e outros ficam de fora do Brier
// porque a chance prevista é de êxito integral do autor.
import { brier, veredito, curvaConfiabilidade, type Par } from '@/lib/calibragem'
import type { LeituraCaso } from './roteiro'

export function paresDoPlacar(casos: LeituraCaso[]): Par[] {
  const out: Par[] = []
  for (const c of casos) {
    if (!c.previsao) continue
    if (c.desfecho === 'procedente') out.push({ p: c.previsao.chance / 100, y: 1 })
    else if (c.desfecho === 'improcedente') out.push({ p: c.previsao.chance / 100, y: 0 })
  }
  return out
}

export function placar(casos: LeituraCaso[]) {
  const pares = paresDoPlacar(casos)
  const registradas = casos.filter(c => c.previsao).length
  const comDesfecho = casos.filter(c => c.previsao && c.desfecho).length
  const b = brier(pares)
  const hits = pares.filter(x => (x.p >= 0.5 ? 1 : 0) === x.y).length
  return {
    registradas, comDesfecho, contam: pares.length, brier: b,
    acertoPct: pares.length ? Math.round((hits / pares.length) * 100) : null,
    veredito: veredito(pares).veredito,
    curva: curvaConfiabilidade(pares, 5).filter(f => f.n > 0),
  }
}

export const nivelBrier = (b: number | null) => b === null ? '—' : b <= 0.1 ? 'excelente' : b <= 0.18 ? 'boa' : b <= 0.25 ? 'fraca' : 'pior que chute'
