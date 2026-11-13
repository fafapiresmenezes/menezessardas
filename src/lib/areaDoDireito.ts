/**
 * Tipo de direito (matéria) de uma tarefa, prazo ou caso — e o agrupamento das listas por ele.
 *
 * Pedido do M (12/11/2026): "segmentar 'meu dia'/prazos por tipo de direito em vez de lista única misturada".
 * A lista de áreas NÃO nasce aqui: vem de AREAS_DIREITO (que por sua vez vem das especialidades do
 * assistente), para a plataforma inteira falar a mesma língua. Aqui só se resolve o apelido:
 * o banco guarda às vezes a chave ('trabalhista') e às vezes o rótulo ('Trabalhista', vindo da planilha
 * importada), e as duas formas precisam cair no mesmo bloco em vez de virar dois blocos iguais.
 */
import { AREAS_DIREITO } from './assistente'

const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, ' ').trim()

/** { apelido normalizado -> chave canônica }: aceita a chave, o rótulo e variações de acento e caixa. */
const PORAPELIDO = new Map<string, string>()
for (const a of AREAS_DIREITO) {
  PORAPELIDO.set(norm(a.chave), a.chave)
  PORAPELIDO.set(norm(a.nome), a.chave)
  // "Família e sucessões" também é achada por "familia"; "Cível e contratos", por "civel".
  const curto = norm(a.nome).split(' e ')[0]
  if (curto && !PORAPELIDO.has(curto)) PORAPELIDO.set(curto, a.chave)
}
const NOMES = new Map(AREAS_DIREITO.map(a => [a.chave, a.nome]))

export const SEM_AREA = 'geral'
export const ROTULO_SEM_AREA = 'Geral (sem área marcada)'

/** Chave canônica da área: aceita chave, rótulo ou nada ('geral'). Área desconhecida volta como ela mesma. */
export function chaveDaArea(area: string | null | undefined): string {
  const texto = (area ?? '').trim()
  if (!texto) return SEM_AREA
  return PORAPELIDO.get(norm(texto)) ?? texto
}

/** Nome em português da área, para o título do bloco. */
export function nomeDaArea(area: string | null | undefined): string {
  const chave = chaveDaArea(area)
  if (chave === SEM_AREA) return ROTULO_SEM_AREA
  return NOMES.get(chave) ?? chave
}

export type GrupoArea<T> = { area: string; nome: string; itens: T[] }

/**
 * Separa a lista por tipo de direito, preservando dentro de cada bloco a ordem em que os itens chegaram
 * (as consultas já vêm em ordem de prazo) e pondo primeiro o bloco cujo prazo mais próximo vence antes.
 * Itens sem prazo contam como os últimos. O bloco "Geral" fica no fim quando empata.
 */
export function agruparPorArea<T extends { area?: string | null; prazo?: string | null }>(itens: T[]): GrupoArea<T>[] {
  const grupos = new Map<string, T[]>()
  for (const i of itens) {
    const chave = chaveDaArea(i.area)
    const atual = grupos.get(chave)
    if (atual) atual.push(i); else grupos.set(chave, [i])
  }
  const primeiroPrazo = (itens: T[]) => itens.reduce((m, i) => (i.prazo && i.prazo < m ? i.prazo : m), '9999-12-31')
  return [...grupos.entries()]
    .map(([area, itens]) => ({ area, nome: nomeDaArea(area), itens }))
    .sort((a, b) => primeiroPrazo(a.itens).localeCompare(primeiroPrazo(b.itens)) || (a.area === SEM_AREA ? 1 : b.area === SEM_AREA ? -1 : a.nome.localeCompare(b.nome, 'pt-BR')))
}

/** Contagem por área, em ordem decrescente: vira "Trabalhista: 3 · Cível e contratos: 2" na tela. */
export function contarPorArea<T extends { area?: string | null }>(itens: T[]): { area: string; nome: string; total: number }[] {
  const contas = new Map<string, number>()
  for (const i of itens) { const c = chaveDaArea(i.area); contas.set(c, (contas.get(c) ?? 0) + 1) }
  return [...contas.entries()]
    .map(([area, total]) => ({ area, nome: nomeDaArea(area), total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome, 'pt-BR'))
}
