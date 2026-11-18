/**
 * Hierarquia corporativa em seis níveis, cruzada com setor, projeto e país.
 *
 * O modelo de escritório (sócio, gestor, pleno, júnior, em ./hierarquia.ts) responde "este processo é
 * meu?". Um grupo de infraestrutura pergunta outra coisa: "esta informação cabe ao meu nível, ao meu
 * setor e aos meus projetos?". Este arquivo é só a regra, sem banco e sem tela, para que a mesma
 * decisão seja usada pelo menu, pelas listas e pelos testes. A regra que protege os dados de verdade
 * continua sendo a do banco; esta existe para a tela não oferecer o que o banco vai recusar.
 *
 * Regra de ouro, igual à do resto da plataforma: na dúvida, esconder. Errar para o lado de esconder
 * é um incômodo; errar para o lado de mostrar vaza.
 */

/** N1 grupo, N2 país, N3 direção de área, N4 gestão de projeto, N5 operação, N6 externo. */
export type Nivel = 'N1' | 'N2' | 'N3' | 'N4' | 'N5' | 'N6'
export const NIVEIS: Nivel[] = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6']

export type Setor = 'juridico' | 'obra' | 'financeiro' | 'compras' | 'conformidade' | 'pessoas'
export const SETORES: Setor[] = ['juridico', 'obra', 'financeiro', 'compras', 'conformidade', 'pessoas']

export const rotuloNivel: Record<Nivel, string> = {
  N1: 'Grupo', N2: 'País', N3: 'Direção de área', N4: 'Gestão de projeto', N5: 'Operação', N6: 'Externo',
}

export const descricaoNivel: Record<Nivel, string> = {
  N1: 'Vê todos os países, em visão consolidada.',
  N2: 'Vê tudo do seu país: projetos, contratos, dinheiro e risco.',
  N3: 'Vê a sua área em todos os projetos do país.',
  N4: 'Vê os seus projetos, em todas as áreas.',
  N5: 'Vê só o que é seu ou lhe foi atribuído.',
  N6: 'Vê só o que lhe foi partilhado pelo portal.',
}

/** Quem está olhando. Listas vazias significam "nenhum", nunca "todos". */
export interface Pessoa {
  id: string
  nivel: Nivel | null
  paises: string[]
  setores: Setor[]
  projetos: string[]
}

/** O que está sendo olhado: um contrato, um boletim, um indicador, um documento. */
export interface Item {
  pais: string
  setor: Setor
  projeto: string | null
  /** Dono direto (quem criou ou a quem foi atribuído). */
  responsavelId?: string | null
  /** Pessoas externas ou internas com quem o item foi partilhado de propósito. */
  partilhadoCom?: string[]
  /** Valores e pareceres marcados como reservados não descem abaixo da direção de área. */
  reservado?: boolean
}

/** Decide se a pessoa pode ver o item. Sem nível definido, não vê nada. */
export function podeVerItem(p: Pessoa, i: Item): boolean {
  if (!p.nivel) return false
  const meu = !!p.id && (i.responsavelId === p.id || (i.partilhadoCom ?? []).includes(p.id))
  switch (p.nivel) {
    case 'N1':
      return true
    case 'N2':
      return p.paises.includes(i.pais)
    case 'N3':
      return p.paises.includes(i.pais) && p.setores.includes(i.setor)
    case 'N4':
      if (!p.paises.includes(i.pais) || !i.projeto || !p.projetos.includes(i.projeto)) return false
      return !i.reservado || meu
    case 'N5':
      return meu && !i.reservado
    case 'N6':
      return (i.partilhadoCom ?? []).includes(p.id) && !i.reservado
  }
}

export function filtrarItens<T extends Item>(itens: T[], p: Pessoa): T[] {
  return itens.filter(i => podeVerItem(p, i))
}

// ───────────────────────── Alçadas e segregação de funções ─────────────────────────

/** As estações por onde passa um boletim de medição ou um pedido de pagamento. */
export type Estacao = 'medir' | 'fiscalizar' | 'aprovar_tecnica' | 'validar_contrato' | 'liberar_pagamento'
export const ESTACOES: Estacao[] = ['medir', 'fiscalizar', 'aprovar_tecnica', 'validar_contrato', 'liberar_pagamento']

export const rotuloEstacao: Record<Estacao, string> = {
  medir: 'Medição', fiscalizar: 'Fiscalização', aprovar_tecnica: 'Aprovação técnica',
  validar_contrato: 'Validação contratual', liberar_pagamento: 'Liberação de pagamento',
}

/** Pares de estações que a mesma pessoa não pode cumprir no mesmo documento. */
export const INCOMPATIVEIS: [Estacao, Estacao][] = [
  ['medir', 'fiscalizar'],
  ['medir', 'aprovar_tecnica'],
  ['fiscalizar', 'aprovar_tecnica'],
  ['aprovar_tecnica', 'liberar_pagamento'],
  ['medir', 'liberar_pagamento'],
]

export interface Passagem { estacao: Estacao; pessoaId: string }

/**
 * Quem mede não aprova; quem aprova não paga. Devolve o motivo da recusa, ou null se pode.
 * `feitas` são as passagens já registradas no documento.
 */
export function conflitoDeFuncao(feitas: Passagem[], nova: Passagem): string | null {
  for (const [a, b] of INCOMPATIVEIS) {
    const outra = nova.estacao === a ? b : nova.estacao === b ? a : null
    if (outra && feitas.some(f => f.estacao === outra && f.pessoaId === nova.pessoaId)) {
      return `A mesma pessoa não pode fazer ${rotuloEstacao[outra]} e ${rotuloEstacao[nova.estacao]} no mesmo documento.`
    }
  }
  return null
}

/** Uma linha da matriz de alçadas: quem, de que nível e setor, aprova o quê, até que valor. */
export interface Alcada {
  estacao: Estacao
  nivelMinimo: Nivel
  setor: Setor
  /** Teto na moeda de referência da casa; null = sem teto. */
  ate: number | null
}

const ordem = (n: Nivel) => NIVEIS.indexOf(n)

/**
 * A pessoa tem alçada para esta estação e este valor? Procura uma linha da matriz que sirva.
 * Sem linha que sirva, a resposta é não: alçada não se presume.
 */
export function temAlcada(p: Pessoa, estacao: Estacao, valor: number, matriz: Alcada[]): boolean {
  if (!p.nivel || p.nivel === 'N6' || !Number.isFinite(valor) || valor < 0) return false
  return matriz.some(a =>
    a.estacao === estacao &&
    ordem(p.nivel as Nivel) <= ordem(a.nivelMinimo) &&
    p.setores.includes(a.setor) &&
    (a.ate === null || valor <= a.ate),
  )
}

/** A próxima estação pendente de um documento, ou null se a cadeia terminou. */
export function proximaEstacao(feitas: Passagem[], cadeia: Estacao[] = ESTACOES): Estacao | null {
  return cadeia.find(e => !feitas.some(f => f.estacao === e)) ?? null
}
