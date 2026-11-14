/**
 * Medição de contrato, para projeto público e privado, em todas as plataformas.
 * Pedido de M em 13/11/2026, 15h21.
 *
 * "Medição" aqui é o sentido de obra e de serviço continuado: de tempo em tempo mede-se o que foi
 * entregue no período, isso é aprovado, virá fatura, a fatura vence, e o dinheiro cai (ou não cai).
 * O que esta biblioteca faz é essa régua, igual para todas as plataformas (direito, engenharia,
 * geolocalização, saúde, Instituto, quântica), e os avisos de atraso até a parada do serviço.
 *
 * Por que público e privado são separados, e não é frescura de organização: o atraso de um órgão
 * público não se trata como o de uma empresa. O órgão precisa de empenho, nota fiscal e
 * liquidação antes de pagar, a ordem de pagamento é vinculada, e **suspender um serviço público
 * tem regra própria na lei de licitações e contratos**. Por isso, aqui, contrato privado com
 * cláusula pode suspender sozinho, e contrato público NUNCA suspende sozinho: ele só gera a
 * minuta da notificação para um advogado ler, decidir e assinar. Os prazos abaixo são o padrão
 * que o escritório parametriza; a base legal de cada caso é do advogado, não deste arquivo.
 */
import { supabase, supabaseConfigurado } from './supabase'

export type Plataforma = 'direito' | 'engenharia' | 'geolocalizacao' | 'saude' | 'instituto' | 'quantica'
export type Natureza = 'publico' | 'privado'

export const PLATAFORMAS: { id: Plataforma; nome: string }[] = [
  { id: 'direito', nome: 'Direito' },
  { id: 'engenharia', nome: 'Engenharia' },
  { id: 'geolocalizacao', nome: 'Geolocalização' },
  { id: 'saude', nome: 'Saúde' },
  { id: 'instituto', nome: 'Instituto' },
  { id: 'quantica', nome: 'Computação quântica' },
]

export const NATUREZAS: { id: Natureza; nome: string; porQue: string }[] = [
  { id: 'publico', nome: 'Projeto público',
    porQue: 'Órgão público: o pagamento depende de empenho, nota fiscal e liquidação, e parar o serviço tem regra própria na lei. Aqui a parada nunca é automática.' },
  { id: 'privado', nome: 'Projeto privado',
    porQue: 'Empresa ou pessoa: o prazo é o que está no contrato, e a parada do serviço pode ser automática se o contrato tiver a cláusula.' },
]

/** A régua de atraso, em dias corridos depois do vencimento da fatura. */
export const REGUA: Record<Natureza, { avisar: number; avisarDeNovo: number; parar: number }> = {
  // Privado: prazo curto, porque quem contrata responde por si.
  privado: { avisar: 1, avisarDeNovo: 10, parar: 30 },
  // Público: prazos maiores, porque o trâmite é mais lento e a parada passa por advogado.
  publico: { avisar: 1, avisarDeNovo: 30, parar: 60 },
}

export type Grau = 'em_dia' | 'avisar' | 'avisar_de_novo' | 'parar'

export interface Contrato {
  id: string
  cliente: string
  plataforma: Plataforma
  natureza: Natureza
  objeto: string
  valor_total: number
  periodicidade: 'mensal' | 'por_etapa' | 'unica'
  prazo_pagamento_dias: number
  /** Só vale para contrato privado: sem cláusula, a parada não é automática nem no privado. */
  clausula_suspensao: boolean
  servico_suspenso: boolean
}

export interface MedicaoContrato {
  id: string
  contrato_id: string
  numero: number
  periodo: string
  valor_medido: number
  aprovada_em: string | null
  faturada_em: string | null
  vencimento: string | null
  recebida_em: string | null
}

export const diasDeAtraso = (m: MedicaoContrato, hoje = new Date()): number => {
  if (m.recebida_em || !m.vencimento) return 0
  const v = new Date(m.vencimento + 'T00:00:00Z').getTime()
  const h = Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate())
  return Math.max(0, Math.floor((h - v) / 86400000))
}

/** Em que ponto da régua esta medição está. */
export function grauDoAtraso(c: Contrato, m: MedicaoContrato, hoje = new Date()): Grau {
  const d = diasDeAtraso(m, hoje)
  const r = REGUA[c.natureza]
  if (d >= r.parar) return 'parar'
  if (d >= r.avisarDeNovo) return 'avisar_de_novo'
  if (d >= r.avisar) return 'avisar'
  return 'em_dia'
}

/**
 * A parada só é automática em contrato privado COM cláusula de suspensão.
 * Em contrato público é sempre falso, de propósito.
 */
export const paradaAutomatica = (c: Contrato, m: MedicaoContrato, hoje = new Date()): boolean =>
  c.natureza === 'privado' && c.clausula_suspensao && grauDoAtraso(c, m, hoje) === 'parar'

/** O que fazer, em uma frase, para quem está olhando a tela. */
export function acaoSugerida(c: Contrato, m: MedicaoContrato, hoje = new Date()): string {
  const d = diasDeAtraso(m, hoje)
  switch (grauDoAtraso(c, m, hoje)) {
    case 'em_dia': return m.recebida_em ? 'Recebida.' : 'Dentro do prazo.'
    case 'avisar': return `Atraso de ${d} dias: mandar o primeiro aviso de cobrança.`
    case 'avisar_de_novo': return `Atraso de ${d} dias: segundo aviso, agora por escrito e com prazo.`
    case 'parar':
      return c.natureza === 'publico'
        ? `Atraso de ${d} dias: a minuta de notificação está pronta, e a suspensão depende de um advogado ler, decidir e assinar. O sistema não para serviço público sozinho.`
        : c.clausula_suspensao
          ? `Atraso de ${d} dias: o contrato permite suspender, e o serviço será parado nesta medição.`
          : `Atraso de ${d} dias: o contrato não tem cláusula de suspensão, então a parada precisa de acordo ou de medida judicial.`
  }
}

export interface Aviso {
  contrato: Contrato
  medicao: MedicaoContrato
  grau: Grau
  dias: number
  acao: string
  automatica: boolean
}

/** Tudo o que está em atraso, do pior para o menos grave. É isto que alimenta os avisos. */
export function avisos(contratos: Contrato[], medicoes: MedicaoContrato[], hoje = new Date()): Aviso[] {
  const peso: Record<Grau, number> = { parar: 3, avisar_de_novo: 2, avisar: 1, em_dia: 0 }
  const saida: Aviso[] = []
  for (const m of medicoes) {
    const c = contratos.find(x => x.id === m.contrato_id)
    if (!c) continue
    const grau = grauDoAtraso(c, m, hoje)
    if (grau === 'em_dia') continue
    saida.push({ contrato: c, medicao: m, grau, dias: diasDeAtraso(m, hoje),
                 acao: acaoSugerida(c, m, hoje), automatica: paradaAutomatica(c, m, hoje) })
  }
  return saida.sort((a, b) => peso[b.grau] - peso[a.grau] || b.dias - a.dias)
}

/** O quadro de um contrato: medido, recebido e a receber. */
export function resumoDoContrato(c: Contrato, medicoes: MedicaoContrato[]) {
  const minhas = medicoes.filter(m => m.contrato_id === c.id)
  const soma = (f: (m: MedicaoContrato) => boolean) =>
    Math.round(minhas.filter(f).reduce((t, m) => t + m.valor_medido, 0) * 100) / 100
  const medido = soma(() => true)
  const recebido = soma(m => !!m.recebida_em)
  return {
    quantas: minhas.length,
    medido,
    recebido,
    aReceber: Math.round((medido - recebido) * 100) / 100,
    doContrato: c.valor_total > 0 ? Math.round((medido / c.valor_total) * 1000) / 10 : 0,
  }
}

const erroTabela = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || /does not exist|could not find the table/i.test(e.message ?? ''))

export async function lerContratosEMedicoes(): Promise<{ contratos: Contrato[]; medicoes: MedicaoContrato[]; semTabela: boolean }> {
  if (!supabaseConfigurado) return { contratos: [], medicoes: [], semTabela: true }
  const c = await supabase.from('contratos_servico').select('*').order('cliente')
  if (c.error) return { contratos: [], medicoes: [], semTabela: erroTabela(c.error) }
  const m = await supabase.from('medicoes_contrato').select('*').order('numero')
  return { contratos: (c.data ?? []) as Contrato[], medicoes: (m.data ?? []) as MedicaoContrato[], semTabela: false }
}

export const dinheiro = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
