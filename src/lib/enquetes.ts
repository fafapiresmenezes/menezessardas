// Bloco B14: enquetes sobre temas do desenvolvimento do direito. Só agregados, sempre com n e margem de erro.

export type Enquete = { id: number; tema: string; pergunta: string; opcoes: string[]; publica: boolean; aberta_ate: string; criado_em: string }
export type Resultado = { n: number; contagens: number[] }
export type Linha = { opcao: string; votos: number; p: number; min: number; max: number }

/** Intervalo de Wilson (95% por padrão) para uma proporção k/n. Melhor que o "normal" quando n é pequeno ou p perto de 0/1. */
export function wilson(k: number, n: number, z = 1.96): { p: number; min: number; max: number } {
  if (n <= 0) return { p: 0, min: 0, max: 0 }
  const p = k / n, z2 = z * z, den = 1 + z2 / n
  const centro = (p + z2 / (2 * n)) / den
  const meia = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / den
  return { p, min: Math.max(0, centro - meia), max: Math.min(1, centro + meia) }
}

/** Margem de erro máxima (p = 50%) para n votos, em pontos percentuais. */
export const margemMaxima = (n: number, z = 1.96) => n > 0 ? Math.round(z * Math.sqrt(0.25 / n) * 1000) / 10 : 100

export const MINIMO_PUBLICACAO = 10

export function resumir(opcoes: string[], r: Resultado | null): { linhas: Linha[]; n: number; margem: number; lider: string | null; empate: boolean; amostraPequena: boolean } {
  const n = r?.n ?? 0
  const linhas = opcoes.map((opcao, i) => ({ opcao, votos: r?.contagens?.[i] ?? 0, ...wilson(r?.contagens?.[i] ?? 0, n) }))
  const ord = [...linhas].sort((a, b) => b.votos - a.votos)
  // Só há "líder" quando o intervalo do primeiro não cruza o do segundo; senão é empate técnico.
  const empate = n > 0 && ord.length > 1 && ord[0].min <= ord[1].max
  return { linhas, n, margem: margemMaxima(n), lider: n > 0 && !empate ? ord[0].opcao : null, empate, amostraPequena: n < MINIMO_PUBLICACAO }
}

export const aberta = (e: Pick<Enquete, 'aberta_ate'>, agora = new Date()) => new Date(e.aberta_ate).getTime() > agora.getTime()

/** Valida uma enquete nova antes de enviar. Devolve a mensagem do primeiro erro, ou null. */
export function validar(e: { tema: string; pergunta: string; opcoes: string[] }): string | null {
  if (e.tema.trim().length < 2) return 'Informe o tema (ex.: locação, LGPD, IA no Judiciário).'
  if (e.pergunta.trim().length < 10) return 'A pergunta precisa ter pelo menos 10 caracteres.'
  if (e.pergunta.trim().length > 300) return 'A pergunta pode ter no máximo 300 caracteres.'
  const op = e.opcoes.map(o => o.trim()).filter(Boolean)
  if (op.length < 2) return 'Dê pelo menos duas opções de resposta.'
  if (op.length > 6) return 'No máximo seis opções.'
  if (new Set(op.map(o => o.toLowerCase())).size !== op.length) return 'Há opções repetidas.'
  return null
}
