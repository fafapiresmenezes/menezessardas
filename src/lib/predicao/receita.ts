/**
 * Passo C17 — o mapa de onde o Instituto ganha dinheiro.
 *
 * Regra de honestidade que manda neste arquivo: **preço que M não decidiu não entra na conta**.
 * É fácil escrever uma planilha bonita chutando mensalidade e número de clientes; o resultado é um
 * número que ninguém pode cobrar de ninguém. Aqui, produto sem preço decidido aparece na lista com
 * o que falta para ter preço, e fica FORA do total dos 90 dias. O total, por isso, é um piso — e
 * dizer que é piso é mais útil que inventar um teto.
 *
 * O percentual de 5% do Instituto sobre venda que não é trabalho de processo vive em
 * `src/lib/royalties.ts` e no banco; aqui ele só é apontado por produto.
 */
import { PARCELA_INSTALACAO, PARCELAS_INSTALACAO, PRECO_INSTALACAO, PRECO_USUARIO_MES } from '@/lib/precos'
import { PERCENTUAL as ROYALTY } from '@/lib/royalties'

export const NAO_E_PROMESSA = [
  'Este mapa não é promessa de receita: é a ordem de ataque e o que falta para cada produto poder ser vendido.',
  'Produto sem preço decidido pelo dono fica fora do total. O total é um piso, não uma previsão.',
  'Número de clientes aqui é meta de trabalho, não cliente fechado. Cliente fechado aparece no financeiro, não nesta tela.',
]

/** Marca de preço que ainda é do dono para decidir. Nenhuma conta usa este valor. */
export const A_DEFINIR = null

export type Cobranca = 'assinatura-mensal' | 'por-usuario-mes' | 'uma-vez' | 'por-estudo'

export type Produto = {
  id: string
  nome: string
  quemCompra: string
  cobranca: Cobranca
  /** Preço em reais já decidido por M, ou A_DEFINIR. */
  preco: number | null
  /** De onde veio o preço decidido, ou o que falta para decidir. */
  precoVemDe: string
  /** Meta de contratos nos próximos 90 dias — trabalho a fazer, não cliente fechado. */
  meta90: number
  /** Quantos meses dos 90 dias entram na conta de uma cobrança recorrente. */
  mesesNoPrazo: number
  /** O que custa atender, em palavras: é isto que some da margem. */
  custoDeAtender: string
  /** A venda paga os 5% ao Instituto? Trabalho de processo não paga. */
  pagaRoyalty: boolean
  /** O que falta para este produto poder ser vendido. Vazio é proibido pelo teste. */
  oQueFalta: string
  /** Esforço para destravar: 1 pouco, 3 muito. Entra na ordem de ataque. */
  esforco: 1 | 2 | 3
}

export const PRODUTOS: Produto[] = [
  {
    id: 'plataforma-juridica-usuario',
    nome: 'Plataforma jurídica, por usuário',
    quemCompra: 'Escritórios de advocacia',
    cobranca: 'por-usuario-mes',
    preco: PRECO_USUARIO_MES,
    precoVemDe: 'Preço decidido por M em 10/11/2026 e aplicado também pelo banco na geração de faturas.',
    meta90: 12,
    mesesNoPrazo: 3,
    custoDeAtender: 'Consumo de inteligência artificial por usuário, suporte e hospedagem.',
    pagaRoyalty: false,
    oQueFalta: 'Nada para vender. Está no ar e em teste com o primeiro escritório.',
    esforco: 1,
  },
  {
    id: 'plataforma-juridica-instalacao',
    nome: 'Instalação da plataforma no escritório',
    quemCompra: 'Escritórios de advocacia',
    cobranca: 'uma-vez',
    preco: PRECO_INSTALACAO,
    precoVemDe: `Preço decidido por M em 10/11/2026: ${PARCELAS_INSTALACAO} parcelas de R$ ${PARCELA_INSTALACAO.toLocaleString('pt-BR')}.`,
    meta90: 2,
    mesesNoPrazo: 1,
    custoDeAtender: 'Trazer os processos do sistema antigo, parametrizar e treinar a equipe.',
    pagaRoyalty: false,
    oQueFalta: 'Nada para vender.',
    esforco: 1,
  },
  {
    id: 'boletim-commodities',
    nome: 'Boletim semanal de preço (etanol, boi, milho)',
    quemCompra: 'Usinas, frigoríficos médios, cooperativas, tradings e crédito rural',
    cobranca: 'assinatura-mensal',
    preco: A_DEFINIR,
    precoVemDe:
      'Falta o preço do dono. E falta o que dá direito de cobrar: o boletim só sai depois de a régua ' +
      'do passo C7 mostrar acerto medido sobre dado coletado.',
    meta90: 10,
    mesesNoPrazo: 2,
    custoDeAtender: 'Coleta diária automática (dado público, de graça), geração do PDF e revisão humana por edição.',
    pagaRoyalty: true,
    oQueFalta: 'Coleta de preço do CEPEA/CONAB/B3 (C5), sinal do grafo medido (C8) e o gerador do boletim (C9).',
    esforco: 2,
  },
  {
    id: 'estudo-sob-encomenda',
    nome: 'Estudo sob encomenda do Instituto',
    quemCompra: 'Órgãos públicos, prefeituras, empresas e entidades de classe',
    cobranca: 'por-estudo',
    preco: A_DEFINIR,
    precoVemDe: 'Cada estudo tem escopo próprio; falta a tabela de faixas de preço do dono.',
    meta90: 3,
    mesesNoPrazo: 1,
    custoDeAtender: 'Horas de consultor, revisão humana e, quando há, compra de dado.',
    pagaRoyalty: true,
    oQueFalta: 'Tabela de faixas por tamanho de estudo e um modelo de contrato com medição por entrega.',
    esforco: 2,
  },
  {
    id: 'trilhas-estudo',
    nome: 'Trilhas de estudo',
    quemCompra: 'Escritórios que já assinam a plataforma e profissionais avulsos',
    cobranca: 'assinatura-mensal',
    preco: A_DEFINIR,
    precoVemDe: 'Quatro modelos de cobrança já estão escritos; a coluna de preço está em branco esperando o dono.',
    meta90: 20,
    mesesNoPrazo: 2,
    custoDeAtender: 'Quase nada: as trilhas saem da ementa que os consultores já têm.',
    pagaRoyalty: true,
    oQueFalta: 'O preço. O produto está no ar.',
    esforco: 1,
  },
  {
    id: 'interface-de-dados',
    nome: 'Interface de dados para empresa',
    quemCompra: 'Empresas que querem a série e o grafo dentro do sistema delas',
    cobranca: 'assinatura-mensal',
    preco: A_DEFINIR,
    precoVemDe: 'Falta o preço e a medição de consumo por chamada, para a conta fechar com o custo.',
    meta90: 2,
    mesesNoPrazo: 2,
    custoDeAtender: 'Servidor, banda e a mesma coleta que já roda para o boletim.',
    pagaRoyalty: true,
    oQueFalta: 'Medição por chamada, limite por contrato e aviso de corte por falta de pagamento.',
    esforco: 2,
  },
  {
    id: 'geomapeamento-municipal',
    nome: 'Geomapeamento municipal',
    quemCompra: 'Prefeituras e secretarias',
    cobranca: 'por-estudo',
    preco: A_DEFINIR,
    precoVemDe: 'Falta o preço, e venda para órgão público passa por licitação, que tem prazo próprio.',
    meta90: 1,
    mesesNoPrazo: 1,
    custoDeAtender: 'Camadas públicas de graça, mais horas de montagem e validação.',
    pagaRoyalty: true,
    oQueFalta: 'O painel demo de um município (passo C10) e o caminho de compra pública.',
    esforco: 3,
  },
  {
    id: 'plataforma-engenharia',
    nome: 'Plataforma de engenharia',
    quemCompra: 'Escritórios de projeto e construtoras',
    cobranca: 'por-usuario-mes',
    preco: A_DEFINIR,
    precoVemDe: 'Falta o preço. A vertente já tem tela e consultores, e anda em conversa própria do projeto.',
    meta90: 2,
    mesesNoPrazo: 2,
    custoDeAtender: 'Consumo de inteligência artificial e revisão de engenheiro habilitado, que assina.',
    pagaRoyalty: true,
    oQueFalta: 'Preço e um piloto com empresa ou órgão.',
    esforco: 3,
  },
  {
    id: 'plataforma-saude',
    nome: 'Plataforma de saúde',
    quemCompra: 'Clínicas, operadoras e secretarias de saúde',
    cobranca: 'por-usuario-mes',
    preco: A_DEFINIR,
    precoVemDe: 'Falta o preço. A vertente tem tela e 427 consultores lastreados.',
    meta90: 2,
    mesesNoPrazo: 2,
    custoDeAtender: 'Consumo de inteligência artificial e revisão de profissional de saúde.',
    pagaRoyalty: true,
    oQueFalta: 'Preço, piloto e as regras de dado de paciente, que são mais duras que as nossas.',
    esforco: 3,
  },
]

const mensal: Cobranca[] = ['assinatura-mensal', 'por-usuario-mes']

/** Receita dos 90 dias de UM produto. Preço não decidido devolve 0, nunca um chute. */
export function receita90(p: Produto): number {
  if (p.preco === null) return 0
  const meses = mensal.includes(p.cobranca) ? p.mesesNoPrazo : 1
  return p.preco * p.meta90 * meses
}

export const comPreco = (ps: Produto[] = PRODUTOS) => ps.filter(p => p.preco !== null)
export const semPreco = (ps: Produto[] = PRODUTOS) => ps.filter(p => p.preco === null)

/** O piso dos 90 dias: só produto com preço decidido. */
export function pisoDe90Dias(ps: Produto[] = PRODUTOS): number {
  return comPreco(ps).reduce((s, p) => s + receita90(p), 0)
}

/** Quanto desse piso é do Instituto pelos 5%. Plataforma jurídica não paga, e aqui isso aparece. */
export function royaltyDoPiso(ps: Produto[] = PRODUTOS): number {
  return comPreco(ps).filter(p => p.pagaRoyalty).reduce((s, p) => s + receita90(p) * ROYALTY, 0)
}

/**
 * A ordem de ataque: primeiro o que já pode ser vendido, depois o que destrava com pouco esforço.
 * Dentro do mesmo grupo, manda a receita possível nos 90 dias.
 */
export function ordemDeAtaque(ps: Produto[] = PRODUTOS): Produto[] {
  return [...ps].sort((a, b) => {
    const prontoA = a.preco === null ? 1 : 0
    const prontoB = b.preco === null ? 1 : 0
    if (prontoA !== prontoB) return prontoA - prontoB
    if (a.esforco !== b.esforco) return a.esforco - b.esforco
    return receita90(b) - receita90(a) || a.nome.localeCompare(b.nome)
  })
}

export const brl = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

export const PERCENTUAL_INSTITUTO = ROYALTY
