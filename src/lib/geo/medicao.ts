// R11: as REGRAS que transformam uma medição em nota. Ficam aqui, em código, por um motivo:
// quem escreve a régua não pode escolher o número depois de ver o resultado.
//
// Três dimensões da régua são medidas pela máquina a cada rodada do CI:
//   dim. 2 (desempenho)     — Lighthouse na casa /geo, com rede de celular simulada
//   dim. 3 (acessibilidade) — violações do axe-core nas telas da casa /geo + índice do Lighthouse
//   dim. 9 (manutenção)     — fração dos arquivos de lib do geo que têm teste
// O script scripts/geo/medir-nota.mjs mede, aplica estas regras e COMPARA com o que
// src/data/geo/nota.ts declara. Se divergir, o CI fica vermelho. Ou seja: a régua não
// consegue mentir sobre essas três sem quebrar a obra.
//
// As outras sete continuam escritas à mão, cada uma com a evidência ao lado, e estão
// marcadas como tal no painel. Dizer que são medidas pela máquina seria mentira.

/** De onde vem a nota de cada dimensão. */
export type FonteDaNota =
  | 'ci'      // a máquina mede a cada rodada e o CI quebra se a régua divergir
  | 'manual'  // medido à mão, com a evidência escrita ao lado
  | 'externo' // depende de passo fora do nosso alcance (campo, loja, aparelho de M)

export const EXPLICA_FONTE: Record<FonteDaNota, string> = {
  ci: 'a máquina mede isto a cada rodada; se a nota aqui divergir da medição, a obra quebra',
  manual: 'medido à mão, com a evidência escrita ao lado — não dá para repetir sozinho ainda',
  externo: 'depende de um passo que não está nas nossas mãos; fica sem nota em vez de fingir',
}

/**
 * Dimensão 3 — acessibilidade (WCAG 2.2 AA).
 * Nota 10 exige as duas coisas: zero violação do axe E o índice de acessibilidade do
 * Lighthouse ≥95. Sem o Lighthouse medido, o teto é 9, por mais limpo que o axe esteja.
 */
export function notaAcessibilidade(violacoes: number, lighthouse?: number | null): number {
  if (!Number.isFinite(violacoes) || violacoes < 0) return 0
  if (violacoes === 0) return lighthouse != null && lighthouse >= 95 ? 10 : 9
  if (violacoes <= 2) return 7
  if (violacoes <= 5) return 5
  return 3
}

/**
 * Dimensão 2 — desempenho (Core Web Vitals).
 * O critério de nota 10 da régua é "LCP ≤2,5s · INP ≤200ms · Lighthouse ≥90". O INP só existe
 * com gente usando a tela, então no laboratório usamos o TBT, que é o substituto que o próprio
 * Lighthouse recomenda, com o mesmo teto de 200 ms. Exigimos as quatro coisas juntas: nota do
 * Lighthouse, LCP, TBT e CLS. Faltar uma já derruba, para a nota não sair de uma média gentil.
 *
 * Medimos sempre com a rede de celular simulada do Lighthouse (4G lento, processador 4x mais
 * devagar). Não é o mesmo que um celular de verdade numa rede de verdade, e a régua diz isso
 * na evidência em vez de esconder.
 */
export function notaDesempenho(lighthouse: number | null | undefined, lcpMs: number, tbtMs: number, cls: number): number {
  const nums = [lighthouse, lcpMs, tbtMs, cls]
  if (nums.some(v => v == null || !Number.isFinite(v as number) || (v as number) < 0)) return 0
  const lh = lighthouse as number
  const bomLcp = lcpMs <= 2500, bomTbt = tbtMs <= 200, bomCls = cls <= 0.1
  if (lh >= 90 && bomLcp && bomTbt && bomCls) return 10
  if (lh >= 80 && bomLcp && bomCls) return 8
  if (lh >= 70 && bomLcp) return 7
  if (lh >= 50) return 5
  return 3
}

/**
 * Dimensão 9 — manutenção. O critério de nota 10 da régua é "CI verde · cobertura ≥80%
 * nas libs geo". Medimos a cobertura pela fração de arquivos de lib que têm arquivo de
 * teste ao lado: é grosseiro, mas é verificável e não dá para inflar sem escrever teste.
 */
export function notaManutencao(comTeste: number, total: number, ciVerde = true): number {
  if (!Number.isFinite(total) || total <= 0) return 0
  const fracao = Math.max(0, Math.min(1, comTeste / total))
  if (!ciVerde) return Math.min(5, Math.round(fracao * 5))
  if (fracao >= 0.95) return 10
  if (fracao >= 0.8) return 8
  if (fracao >= 0.6) return 7
  if (fracao >= 0.4) return 5
  return 3
}

export interface MedicaoDoCI {
  quando: string
  /** dimensão → { nota, valor medido, como foi medido } */
  dimensoes: Record<string, { nota: number; valor: string; como: string }>
}

/** Confere a medição contra a régua. Devolve as divergências, em português. */
export function conferir(
  medicao: MedicaoDoCI,
  regua: { n: number; nota: number | null }[],
): string[] {
  const problemas: string[] = []
  for (const [n, m] of Object.entries(medicao.dimensoes)) {
    const d = regua.find(r => r.n === Number(n))
    if (!d) { problemas.push(`dimensão ${n} medida, mas não existe na régua`); continue }
    if (d.nota !== m.nota) {
      problemas.push(`dimensão ${n}: a régua diz ${d.nota ?? 'a medir'} e a medição deu ${m.nota} (${m.valor})`)
    }
  }
  return problemas
}
