// Bloco B07 e B08: probabilidade única e calibragem honesta.
// Meta de M: erro de calibragem (ECE) entre 1% e 5%: quando a plataforma diz 70%, deve acontecer entre 65% e 75% das vezes.
// Não é "acertar 95% dos casos", o que nenhuma plataforma do mundo comprova.

export type Par = { p: number; y: 0 | 1 }
export type Faixa = { de: number; ate: number; n: number; previstoMedio: number; observado: number }

const clamp = (p: number) => Math.min(1 - 1e-6, Math.max(1e-6, p))
const logit = (p: number) => Math.log(clamp(p) / (1 - clamp(p)))
const sigm = (x: number) => 1 / (1 + Math.exp(-x))

export function brier(pares: Par[]): number | null {
  return pares.length ? pares.reduce((s, { p, y }) => s + (p - y) ** 2, 0) / pares.length : null
}

/** Curva de confiabilidade: em cada faixa de probabilidade, quanto foi previsto e quanto aconteceu. */
export function curvaConfiabilidade(pares: Par[], faixas = 10): Faixa[] {
  const out: Faixa[] = []
  for (let i = 0; i < faixas; i++) {
    const de = i / faixas, ate = (i + 1) / faixas
    const f = pares.filter(({ p }) => p >= de && (i === faixas - 1 ? p <= ate : p < ate))
    if (f.length) out.push({ de, ate, n: f.length, previstoMedio: f.reduce((s, x) => s + x.p, 0) / f.length, observado: f.reduce((s, x) => s + x.y, 0) / f.length })
  }
  return out
}

/** ECE: média, ponderada pelo número de casos, da distância entre previsto e observado em cada faixa. */
export function ece(pares: Par[], faixas = 10): number | null {
  if (!pares.length) return null
  return curvaConfiabilidade(pares, faixas).reduce((s, f) => s + (f.n / pares.length) * Math.abs(f.previstoMedio - f.observado), 0)
}

/** Intervalo de 95% do ECE por reamostragem (bootstrap) com semente fixa, para o resultado ser reproduzível. */
export function eceIntervalo(pares: Par[], reamostras = 500, semente = 42, faixas = 10): { min: number; max: number } | null {
  if (pares.length < 2) return null
  let s = semente >>> 0
  const aleat = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 2 ** 32 }
  const vals: number[] = []
  for (let b = 0; b < reamostras; b++) {
    const amostra = Array.from({ length: pares.length }, () => pares[Math.floor(aleat() * pares.length)])
    vals.push(ece(amostra, faixas)!)
  }
  vals.sort((a, b) => a - b)
  return { min: vals[Math.floor(0.025 * reamostras)], max: vals[Math.min(reamostras - 1, Math.ceil(0.975 * reamostras) - 1)] }
}

/** Casos necessários por faixa para que o observado tenha margem de ±margem com 95% de confiança (pior caso p = 50%). */
export const casosPorFaixa = (margem = 0.05, z = 1.96) => Math.ceil(0.25 * (z / margem) ** 2)

export type Veredito = 'sem dados' | 'amostra pequena' | 'dentro da meta' | 'fora da meta'
/** Só declara "dentro da meta" quando o limite superior do intervalo fica abaixo de 5% e há casos suficientes. */
export function veredito(pares: Par[], meta = 0.05, minimo = 100): { veredito: Veredito; ece: number | null; intervalo: { min: number; max: number } | null; n: number } {
  const e = ece(pares), ic = eceIntervalo(pares)
  if (!pares.length) return { veredito: 'sem dados', ece: null, intervalo: null, n: 0 }
  if (pares.length < minimo) return { veredito: 'amostra pequena', ece: e, intervalo: ic, n: pares.length }
  return { veredito: ic && ic.max <= meta ? 'dentro da meta' : 'fora da meta', ece: e, intervalo: ic, n: pares.length }
}

export type BlocoIsotonico = { pMax: number; valor: number; n: number }
/** Aplica blocos guardados (modelo salvo no banco) a uma probabilidade bruta. */
export function aplicarIsotonico(blocos: BlocoIsotonico[], p: number): number {
  if (!blocos.length) return p
  return (blocos.find(b => p <= b.pMax) ?? blocos[blocos.length - 1]).valor
}
/** Ajusta e devolve os blocos (para guardar e reaplicar depois). */
export function ajustarIsotonico(pares: Par[]): BlocoIsotonico[] {
  if (!pares.length) return []
  const f = recalibradorIsotonico(pares) as ((p: number) => number) & { blocos?: BlocoIsotonico[] }
  return f.blocos ?? []
}

/** Recalibração isotônica (algoritmo PAV): devolve uma função que corrige a probabilidade bruta sem inverter a ordem. */
export function recalibradorIsotonico(pares: Par[]): (p: number) => number {
  if (!pares.length) return p => p
  // Probabilidades iguais entram juntas, para empates não serem cortados ao meio.
  const grupos = new Map<number, { soma: number; n: number }>()
  for (const { p, y } of pares) { const g = grupos.get(p) ?? { soma: 0, n: 0 }; g.soma += y; g.n++; grupos.set(p, g) }
  const ord = [...grupos.entries()].sort((a, b) => a[0] - b[0])
  const blocos: { soma: number; n: number; pMin: number; pMax: number }[] = []
  for (const [p, g] of ord) {
    blocos.push({ soma: g.soma, n: g.n, pMin: p, pMax: p })
    while (blocos.length > 1 && blocos[blocos.length - 2].soma / blocos[blocos.length - 2].n > blocos[blocos.length - 1].soma / blocos[blocos.length - 1].n) {
      const b = blocos.pop()!, a = blocos.pop()!
      blocos.push({ soma: a.soma + b.soma, n: a.n + b.n, pMin: a.pMin, pMax: b.pMax })
    }
  }
  const saida: BlocoIsotonico[] = blocos.map(b => ({ pMax: b.pMax, valor: b.soma / b.n, n: b.n }))
  return Object.assign((p: number) => aplicarIsotonico(saida, p), { blocos: saida })
}

export type Fonte = { nome: string; p: number; n: number }
/** B07: probabilidade única. Junta as fontes na escala log-odds, com peso pela raiz do tamanho da amostra de cada uma.
 *  Devolve também a contribuição de cada fonte, para a tela explicar o porquê. */
export function combinarProbabilidades(fontes: Fonte[]): { p: number; nTotal: number; pesos: { nome: string; peso: number }[] } | null {
  const validas = fontes.filter(f => f.n > 0 && Number.isFinite(f.p))
  if (!validas.length) return null
  const w = validas.map(f => Math.sqrt(f.n)), soma = w.reduce((a, b) => a + b, 0)
  const x = validas.reduce((s, f, i) => s + (w[i] / soma) * logit(f.p), 0)
  return { p: sigm(x), nTotal: validas.reduce((s, f) => s + f.n, 0), pesos: validas.map((f, i) => ({ nome: f.nome, peso: w[i] / soma })) }
}
