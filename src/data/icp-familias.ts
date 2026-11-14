// Habilidade 1 do replanejamento de mercado (14/11/2026): ICP (perfil de cliente ideal) para cada
// uma das 6 famílias do caderno (src/data/caderno-familias.ts). Objetivo: saber por qual família
// começar a prospecção quando o Instituto não pode atender todas ao mesmo tempo.
//
// Toda afirmação de mercado tem `fonte`. O que não tem fonte pública verificável entra marcado
// "(hipótese, a validar com cliente)" — nunca como fato. Nada aqui promete número de vendas.
import { FAMILIAS, type FamiliaId } from './caderno-familias'

export interface IcpFamilia {
  familia: FamiliaId
  /** Frase verificável e específica da família — não genérica, não repetida entre famílias. */
  sinalDeDorAtiva: string
  tamanhoTipico: string
  /** Em meses; sempre com faixa, nunca número seco. */
  cicloDeVendaEstimado: string
  fonte: string
}

export const ICP_FAMILIAS: IcpFamilia[] = [
  {
    familia: 'dados-seguranca',
    sinalDeDorAtiva: 'A organização já recebeu pedido de titular (LGPD) ou notificação de incidente e não tem inventário de dados pronto para responder.',
    tamanhoTipico: 'Órgão público ou empresa com mais de 200 funcionários, com sistemas legados sem inventário de dados centralizado (hipótese, a validar com cliente).',
    cicloDeVendaEstimado: '2 a 5 meses — depende de licitação quando o comprador é público.',
    fonte: 'Prazo de resposta ao titular: Lei 13.709/2018 (LGPD), art. 19, até 15 dias; obrigação de inventário decorre dos arts. 6º e 37.',
  },
  {
    familia: 'inteligencia-artificial',
    sinalDeDorAtiva: 'A organização já usa inteligência artificial em produção (atendimento, triagem, decisão) sem política interna escrita nem supervisão humana documentada.',
    tamanhoTipico: 'Tribunal, banco, operadora de saúde ou empresa de tecnologia com uso de IA já em produção (hipótese, a validar com cliente — o volume de organizações nessa situação não tem fonte pública consolidada).',
    cicloDeVendaEstimado: '3 a 6 meses — mais curto quando há prazo regulatório definido (ex. resolução do CNJ).',
    fonte: 'Resolução CNJ 615/2025 exige supervisão humana e governança de IA no Judiciário; não há levantamento público do nº de organizações sem política escrita (hipótese).',
  },
  {
    familia: 'bancos',
    sinalDeDorAtiva: 'A instituição financeira ou gestora de ativos digitais vai lançar um produto novo e não tem certeza se precisa de autorização prévia do Banco Central.',
    tamanhoTipico: 'Fintech, corretora de criptoativos ou cooperativa de crédito em fase de lançamento de produto (hipótese, a validar com cliente).',
    cicloDeVendaEstimado: '4 a 8 meses — o ciclo do próprio regulador (sandbox) é o gargalo, não a venda.',
    fonte: 'Regulamentação do BCB sobre ativos virtuais (2025) e o programa de sandbox regulatório do Banco Central (Resolução BCB nº 29/2020 e atualizações) condicionam o lançamento.',
  },
  {
    familia: 'integridade-clima',
    sinalDeDorAtiva: 'A empresa participa de licitação pública ou concessão e precisa comprovar programa de integridade para manter ou ampliar contrato.',
    tamanhoTipico: 'Empresa média ou grande que contrata com o poder público, concessionária ou estatal.',
    cicloDeVendaEstimado: '6 a 12 meses — alinhado ao ciclo do próprio programa de integridade.',
    fonte: 'Lei 12.846/2013 (Lei Anticorrupção) e decretos estaduais que condicionam benefício em licitação a programa de integridade comprovado (varia por ente; conferir norma local antes de citar a cada cliente).',
  },
  {
    familia: 'leis-conflitos',
    sinalDeDorAtiva: 'O setor da organização tem projeto de lei tramitando que pode mudar a regra do negócio em menos de 12 meses, e a organização não tem monitoramento formal.',
    tamanhoTipico: 'Associação setorial, confederação ou grande empresa com área de relações institucionais pequena ou inexistente (hipótese, a validar com cliente).',
    cicloDeVendaEstimado: '2 a 4 meses para o observatório (serviço recorrente); 4 a 7 meses para estudo comparado.',
    fonte: 'Acompanhamento de tramitação é verificável publicamente no site da Câmara dos Deputados e do Senado (nº do projeto e data, a citar caso a caso).',
  },
  {
    familia: 'cursos-estudos',
    sinalDeDorAtiva: 'A equipe jurídica interna enfrenta um tema novo (ex. arbitragem tributária, direito digital) sem ninguém com formação formal no assunto.',
    tamanhoTipico: 'Departamento jurídico de empresa grande, procuradoria ou escritório de advocacia de porte médio (hipótese, a validar com cliente).',
    cicloDeVendaEstimado: '2 a 4 meses — o ciclo de decisão de treinamento corporativo costuma ser mais curto que o de consultoria.',
    fonte: 'Sem levantamento público de ciclo de decisão de compra de treinamento jurídico no Brasil (hipótese, baseada em prazos usuais de aprovação de orçamento de capacitação).',
  },
]

export const icpDaFamilia = (f: FamiliaId): IcpFamilia => {
  const icp = ICP_FAMILIAS.find(i => i.familia === f)
  if (!icp) throw new Error(`Família sem ICP: ${f}`)
  return icp
}

/**
 * Ordena as famílias por prioridade de prospecção quando o Instituto não pode atender todas ao
 * mesmo tempo. Critério documentado (não escondido): ciclo de venda estimado mais curto primeiro
 * — família que fecha mais rápido entra em prospecção primeiro, porque valida a oferta com menos
 * espera. Em caso de empate no ciclo, mantém a ordem de FAMILIAS (capítulo 10 do planejamento).
 */
const mesesMinimo = (faixa: string): number => {
  const m = faixa.match(/(\d+)/)
  return m ? Number(m[1]) : Number.POSITIVE_INFINITY
}

export function prioridadeDeProspeccao(): FamiliaId[] {
  return [...FAMILIAS]
    .map(f => ({ id: f.id, ciclo: mesesMinimo(icpDaFamilia(f.id).cicloDeVendaEstimado) }))
    .sort((a, b) => a.ciclo - b.ciclo)
    .map(x => x.id)
}
