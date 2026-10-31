/**
 * Monitor de legislação (S8): normas que importam para a carteira, quais
 * imóveis cada uma alcança, a ação sugerida e o acompanhamento de quem cuida.
 *
 * Duas camadas, sem misturar:
 *  1. Catálogo editorial: normas estáveis do nicho, com a regra que decide
 *     "imóveis afetados" (calculada sempre a partir da carteira atual).
 *  2. Novidades: normas recém-publicadas, buscadas no LexML pela função
 *     `monitor-legislacao` (no servidor). Sem Supabase, só se mostra um
 *     exemplo marcado como tal.
 */
import { supabase, supabaseConfigurado } from './supabase'
import type { Imovel } from './repositorio'
import { registrarEvento } from './trilha'

export type StatusAcompanhamento = 'nova' | 'em_analise' | 'concluida' | 'nao_se_aplica'

export const ROTULO_STATUS: Record<StatusAcompanhamento, string> = {
  nova: 'Nova',
  em_analise: 'Em análise',
  concluida: 'Ação concluída',
  nao_se_aplica: 'Não se aplica',
}

export interface Norma {
  id: string
  titulo: string
  ementa: string
  fonte: string
  link: string
  /** Quem a norma alcança; ausente = todos os imóveis. */
  alcance?: (i: Imovel) => boolean
  alcanceTexto: string
  acao: string
  /** true = norma do catálogo; false = novidade vinda da busca ao vivo. */
  catalogo: boolean
  exemplo?: boolean
  publicadaEm?: string
}

const comercial = (i: Imovel) =>
  ['loja', 'sala_comercial', 'conjunto_comercial', 'edificio', 'galpao', 'comercial', 'hotel'].includes(i.tipo)
const locado = (i: Imovel) => ['locado', 'comodato'].includes(i.uso)

export const CATALOGO: Norma[] = [
  {
    id: 'lei-8245-1991', catalogo: true,
    titulo: 'Lei nº 8.245/1991 — Lei do Inquilinato',
    ementa: 'Locação de imóveis urbanos: prazos, reajuste, garantias, renovação e despejo.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm',
    alcance: i => locado(i) || i.uso === 'vago',
    alcanceTexto: 'Imóveis locados, em comodato ou à espera de locação',
    acao: 'Conferir em cada contrato: garantia única (art. 37), prazo, índice de reajuste e, nas locações comerciais, o direito à renovação (art. 51).',
  },
  {
    id: 'cc-10406-2002', catalogo: true,
    titulo: 'Lei nº 10.406/2002 — Código Civil (contratos, posse e condomínio edilício)',
    ementa: 'Regras gerais de contratos, comodato, propriedade e condomínio edilício.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
    alcanceTexto: 'Todos os imóveis',
    acao: 'Usar como base na revisão dos contratos e aditivos; atenção a comodatos e ao registro de alterações.',
  },
  {
    id: 'lgpd-13709-2018', catalogo: true,
    titulo: 'Lei nº 13.709/2018 — LGPD',
    ementa: 'Tratamento de dados pessoais de locatários, fiadores e fornecedores.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
    alcance: i => locado(i) || comercial(i),
    alcanceTexto: 'Imóveis com contrato (há dados pessoais de partes)',
    acao: 'Manter base legal e finalidade registradas, limitar acessos por perfil e guardar a trilha de auditoria.',
  },
  {
    id: 'lei-4591-1964', catalogo: true,
    titulo: 'Lei nº 4.591/1964 — Condomínio em edificações e incorporações',
    ementa: 'Condomínio em edificações e incorporações imobiliárias.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/leis/l4591.htm',
    alcance: i => ['apartamento', 'sala_comercial', 'conjunto_comercial', 'loja', 'garagem'].includes(i.tipo) || i.uso === 'em_construcao',
    alcanceTexto: 'Unidades em edifícios e imóveis em construção',
    acao: 'Verificar convenção, taxas condominiais e, nas obras, a documentação da incorporação.',
  },
  {
    id: 'lc-214-2025', catalogo: true,
    titulo: 'Lei Complementar nº 214/2025 — IBS, CBS e Imposto Seletivo (reforma tributária)',
    ementa: 'Regulamenta a reforma tributária do consumo; inclui regras para operações com bens imóveis.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/leis/lcp/lcp214.htm',
    alcance: i => locado(i) || i.uso === 'em_desenvolvimento' || i.uso === 'em_construcao',
    alcanceTexto: 'Imóveis que geram receita de locação ou estão em desenvolvimento',
    acao: 'Pedir parecer tributário sobre o impacto na receita de locação e nos contratos de longa duração. Conferir o texto oficial antes de decidir.',
  },
  {
    id: 'lei-6015-1973', catalogo: true,
    titulo: 'Lei nº 6.015/1973 — Registros Públicos',
    ementa: 'Matrícula, averbações e registros do imóvel.',
    fonte: 'Planalto', link: 'https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm',
    alcanceTexto: 'Todos os imóveis',
    acao: 'Manter a matrícula atualizada e averbar construções, locações de longo prazo e alterações de titularidade.',
  },
]

/** Exemplo de novidade, usado só no modo demonstração e sempre marcado como tal. */
export const NOVIDADE_EXEMPLO: Norma = {
  id: 'exemplo-novidade', catalogo: false, exemplo: true,
  titulo: 'Exemplo: nova norma sobre locação comercial',
  ementa: 'Isto é um exemplo para mostrar como uma novidade aparece. Com o banco real ligado, o sistema busca no LexML.',
  fonte: 'Exemplo', link: 'https://www.lexml.gov.br/',
  alcance: comercial,
  alcanceTexto: 'Imóveis comerciais, lojas e hotéis',
  acao: 'Ler a norma, identificar os contratos afetados e decidir se há aditivo a propor.',
  publicadaEm: new Date().toISOString().slice(0, 10),
}

export function imoveisAfetados(n: Norma, imoveis: Imovel[]): Imovel[] {
  return n.alcance ? imoveis.filter(n.alcance) : imoveis
}

/* ------------------------------ Acompanhamento ------------------------------ */

const CHAVE = 'lsm-legislacao-v1'
type Mapa = Record<string, StatusAcompanhamento>

export async function lerAcompanhamento(): Promise<Mapa> {
  if (supabaseConfigurado) {
    const { data } = await supabase.from('legislacao_acompanhamento').select('norma_id, status')
    return Object.fromEntries((data ?? []).map(r => [String(r.norma_id), r.status as StatusAcompanhamento]))
  }
  try {
    return JSON.parse(localStorage.getItem(CHAVE) ?? '{}') as Mapa
  } catch {
    return {}
  }
}

export async function definirStatus(norma: Norma, status: StatusAcompanhamento): Promise<void> {
  if (supabaseConfigurado) {
    const { error } = await supabase
      .from('legislacao_acompanhamento')
      .upsert({ norma_id: norma.id, titulo: norma.titulo, status, atualizado_em: new Date().toISOString() })
    if (error) throw error
  } else {
    const atual = await lerAcompanhamento()
    atual[norma.id] = status
    try {
      localStorage.setItem(CHAVE, JSON.stringify(atual))
    } catch {
      // sessão só em memória
    }
  }
  await registrarEvento({ tipo: 'legislacao_acompanhada', entidade: norma.id, resumo: `${norma.titulo}: ${ROTULO_STATUS[status]}` })
}

/* ------------------------------ Busca ao vivo ------------------------------ */

export interface ResultadoBusca {
  novidades: Norma[]
  consultadoEm: string
  /** Texto curto de diagnóstico, para saber se a fonte respondeu. */
  situacao: string
}

/** Pede ao servidor as normas recentes no LexML. Sem Supabase, devolve só o exemplo. */
export async function buscarNovidades(): Promise<ResultadoBusca> {
  const agora = new Date().toISOString()
  if (!supabaseConfigurado) {
    return { novidades: [NOVIDADE_EXEMPLO], consultadoEm: agora, situacao: 'Modo demonstração: mostrando apenas um exemplo.' }
  }
  const { data, error } = await supabase.functions.invoke('monitor-legislacao', { body: {} })
  if (error) throw new Error(error.message)
  if (data?.erro) throw new Error(data.erro)
  const itens = (data?.itens ?? []) as { urn: string; titulo: string; data?: string; link: string }[]
  return {
    consultadoEm: agora,
    situacao: String(data?.situacao ?? `${itens.length} norma(s) encontrada(s).`),
    novidades: itens.map(it => ({
      id: it.urn, catalogo: false, titulo: it.titulo,
      ementa: 'Norma recente encontrada no LexML. Leia o texto oficial para avaliar o efeito.',
      fonte: 'LexML', link: it.link, alcanceTexto: 'A definir após a leitura',
      acao: 'Ler a norma e decidir se alcança algum imóvel ou contrato da carteira.',
      publicadaEm: it.data,
    })),
  }
}

/** Radar dos portais: novidades captadas todo dia pelo servidor (Câmara e notícias dos tribunais). */
export interface NovidadePortal {
  id: string
  fonte: string
  tipo: 'Projeto' | 'Notícia' | string
  titulo: string
  resumo?: string
  link: string
  data?: string
  termo?: string
  vistoEm: string
  afetados?: { tipo: 'contrato' | 'caso'; id: string; nome: string; palavras: number }[]
}

export async function radarPortais(area?: string): Promise<NovidadePortal[]> {
  if (!supabaseConfigurado) {
    return [{
      id: 'ex-1', fonte: 'Câmara dos Deputados', tipo: 'Projeto', titulo: 'PL 3925/2026',
      resumo: 'Altera a Lei nº 8.245/1991 para vedar a oferta publicitária de locação residencial com aluguel diferente do contratado (exemplo da demonstração).',
      link: 'https://www.camara.leg.br/', data: new Date().toISOString().slice(0, 10), termo: 'inquilinato', vistoEm: new Date().toISOString(),
    }]
  }
  let q = supabase
    .from('novidades_portais')
    .select('id,fonte,tipo,titulo,resumo,link,data,termo,visto_em,afetados')
    .order('data', { ascending: false, nullsFirst: false })
    .limit(60)
  if (area) q = q.eq('area', area)
  const { data, error } = await q
  if (error) throw new Error(error.message)
  return (data ?? []).map(r => ({ ...r, resumo: r.resumo ?? undefined, data: r.data ?? undefined, termo: r.termo ?? undefined, vistoEm: r.visto_em, afetados: (r.afetados ?? undefined) as NovidadePortal['afetados'] }))
}
