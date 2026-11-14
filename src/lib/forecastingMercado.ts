// Habilidade 7 do replanejamento de mercado (14/11/2026): forecasting de demanda e receita.
// Regra permanente (capítulo 02 + limites do projeto): previsão de mercado nunca é um número seco
// — sempre vem com faixa de erro. Usa a mesma disciplina estatística da régua de calibragem
// (src/lib/calibragem.ts, bloco B07/B08/C19): sem dado suficiente, a função diz que não tem dado
// suficiente, nunca inventa uma faixa para preencher espaço.

export interface PontoDeSerie {
  quando: string // aaaa-mm
  valor: number
}

export interface Previsao {
  quando: string
  previsto: number
  faixaBaixa: number
  faixaAlta: number
}

const MINIMO_DE_PONTOS = 4

/** Regressão linear simples (mínimos quadrados) sobre índices 0..n-1. */
function regressaoLinear(valores: number[]): { a: number; b: number; residuoPadrao: number } {
  const n = valores.length
  const xs = valores.map((_, i) => i)
  const mediaX = xs.reduce((s, x) => s + x, 0) / n
  const mediaY = valores.reduce((s, y) => s + y, 0) / n
  const num = xs.reduce((s, x, i) => s + (x - mediaX) * (valores[i] - mediaY), 0)
  const den = xs.reduce((s, x) => s + (x - mediaX) ** 2, 0)
  const b = den === 0 ? 0 : num / den
  const a = mediaY - b * mediaX
  const residuos = valores.map((y, i) => y - (a + b * xs[i]))
  const residuoPadrao = Math.sqrt(residuos.reduce((s, r) => s + r ** 2, 0) / Math.max(1, n - 2))
  return { a, b, residuoPadrao }
}

const proximoMes = (aaaaMm: string): string => {
  const [ano, mes] = aaaaMm.split('-').map(Number)
  const data = new Date(ano, mes - 1 + 1, 1)
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}`
}

/**
 * Projeta `horizonte` meses à frente por regressão linear simples, com faixa de ±1,96 desvios do
 * resíduo (aprox. 95%). Nunca projeta com menos de MINIMO_DE_PONTOS meses de histórico — devolve
 * null, porque uma faixa calculada com poucos pontos é mais ruído que previsão.
 */
export function previsaoComFaixa(serie: PontoDeSerie[], horizonte = 1): Previsao[] | null {
  if (serie.length < MINIMO_DE_PONTOS) return null
  const valores = serie.map(p => p.valor)
  const { a, b, residuoPadrao } = regressaoLinear(valores)
  const resultado: Previsao[] = []
  let quando = serie[serie.length - 1].quando
  for (let passo = 1; passo <= horizonte; passo++) {
    quando = proximoMes(quando)
    const x = valores.length - 1 + passo
    const previsto = a + b * x
    resultado.push({
      quando,
      previsto,
      faixaBaixa: previsto - 1.96 * residuoPadrao,
      faixaAlta: previsto + 1.96 * residuoPadrao,
    })
  }
  return resultado
}

/** Formata a previsão como o capítulo 02 exige: nunca um número seco, sempre a faixa. */
export function previsaoComoTexto(p: Previsao): string {
  return `${p.quando}: entre ${Math.round(p.faixaBaixa)} e ${Math.round(p.faixaAlta)} (estimativa central ${Math.round(p.previsto)})`
}
