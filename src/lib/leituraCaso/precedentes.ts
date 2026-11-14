// Precedentes do próprio escritório: casos já encerrados, com as mesmas features processuais
// públicas (ação, tribunal), usados para dar uma faixa de desfecho explicável. Nunca inventa
// dado: só conta com casos reais já registrados e com desfecho de mérito conhecido.
import type { LeituraCaso, Desfecho } from './roteiro'

export const MINIMO_DE_PRECEDENTES = 3

export interface FeaturesProcessuais {
  acao: string
  tribunal: string
}

export function featuresProcessuais(caso: LeituraCaso): FeaturesProcessuais {
  return { acao: caso.acao, tribunal: caso.tribunal }
}

const mesmasFeatures = (a: FeaturesProcessuais, b: FeaturesProcessuais) => a.acao === b.acao && a.tribunal === b.tribunal

export function precedentesSemelhantes(caso: LeituraCaso, todos: LeituraCaso[]): LeituraCaso[] {
  const features = featuresProcessuais(caso)
  return todos.filter(c => c.id !== caso.id && c.desfecho !== null && mesmasFeatures(featuresProcessuais(c), features))
}

export interface FaixaComPrecedentes {
  n: number
  distribuicao: Record<Desfecho, number>
  casosRef: string[]
}

/** null quando não há precedentes suficientes — nunca estima com poucos casos. */
export function faixaComPrecedentes(caso: LeituraCaso, todos: LeituraCaso[]): FaixaComPrecedentes | null {
  const semelhantes = precedentesSemelhantes(caso, todos)
  if (semelhantes.length < MINIMO_DE_PRECEDENTES) return null
  const contagem: Record<Desfecho, number> = { procedente: 0, improcedente: 0, parcial: 0, acordo: 0, outro: 0 }
  for (const c of semelhantes) if (c.desfecho) contagem[c.desfecho]++
  const n = semelhantes.length
  const pct: Record<Desfecho, number> = { procedente: 0, improcedente: 0, parcial: 0, acordo: 0, outro: 0 }
  for (const k of Object.keys(contagem) as Desfecho[]) pct[k] = Math.round((contagem[k] / n) * 100)
  return { n, distribuicao: pct, casosRef: semelhantes.map(c => c.id) }
}

export const ROTULO_DESFECHO: Record<Desfecho, string> = {
  procedente: 'procedente', improcedente: 'improcedente', parcial: 'parcial', acordo: 'acordo', outro: 'outro',
}
