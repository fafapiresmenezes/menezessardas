/**
 * Indicadores da carteira, todos derivados dos dados cadastrados. Nada é
 * inventado: o que depende de dado que ainda não existe (pagamentos) é
 * marcado como indisponível, não estimado.
 */
import type { Contrato, Imovel, Alerta } from './repositorio'
import { diasAte } from './datas'
import type { Periodicidade } from './dominio'

const mesesPorPeriodo: Record<Periodicidade, number> = { mensal: 1, trimestral: 3, semestral: 6, anual: 12, unica: 0 }

export const contratoAtivo = (c: Contrato): boolean => {
  if (c.encerradoEm) return false
  const d = diasAte(c.dataVencimento)
  return d === null || d >= 0
}

export const valorMensal = (c: Contrato): number => {
  const m = mesesPorPeriodo[c.periodicidade]
  return m ? c.valor / m : 0
}

const statusDoc = (dataVencimento?: string): 'valido' | 'a_renovar' | 'vencido' => {
  const d = diasAte(dataVencimento ?? null)
  if (d === null) return 'valido'
  if (d < 0) return 'vencido'
  if (d <= 60) return 'a_renovar'
  return 'valido'
}

export interface KPIs {
  imoveis: number
  vacancia: number // %
  receitaContratadaMensal: number
  documentacaoEmDia: number // %
  prazoMedioDias: number | null
  contratosVencidos: number
}

export function calcularKPIs(imoveis: Imovel[], contratos: Contrato[]): KPIs {
  const vagos = imoveis.filter(i => i.uso === 'vago').length
  const ativos = contratos.filter(contratoAtivo)
  const receita = ativos.reduce((s, c) => s + valorMensal(c), 0)

  const docs = [...imoveis.flatMap(i => i.documentos), ...contratos.flatMap(c => c.documentos)]
  const emDia = docs.filter(d => statusDoc(d.dataVencimento) === 'valido').length
  const documentacaoEmDia = docs.length ? Math.round((emDia / docs.length) * 100) : 100

  const prazos = ativos.map(c => diasAte(c.dataVencimento)).filter((d): d is number => d !== null)
  const prazoMedio = prazos.length ? Math.round(prazos.reduce((a, b) => a + b, 0) / prazos.length) : null

  return {
    imoveis: imoveis.length,
    vacancia: imoveis.length ? Math.round((vagos / imoveis.length) * 100) : 0,
    receitaContratadaMensal: receita,
    documentacaoEmDia,
    prazoMedioDias: prazoMedio,
    contratosVencidos: contratos.filter(c => !contratoAtivo(c)).length,
  }
}

/* ----------------------------- OKRs ----------------------------- */

export interface KeyResult {
  descricao: string
  atual: number
  meta: number
  unidade: '%' | 'un'
}
export interface Objetivo {
  titulo: string
  keyResults: KeyResult[]
}

export function calcularOKRs(imoveis: Imovel[], contratos: Contrato[], alertas: Alerta[]): Objetivo[] {
  const totalImoveis = imoveis.length || 1
  const semPendenciaVencida = imoveis.filter(
    i => !alertas.some(a => a.imovelId === i.id && a.diasRestantes < 0)
  ).length
  const pctRegular = Math.round((semPendenciaVencida / totalImoveis) * 100)

  const kpis = calcularKPIs(imoveis, contratos)
  const renovaveis = contratos.filter(c => c.dataVencimento)
  const renovadasAntecip = renovaveis.filter(c => {
    const d = diasAte(c.dataVencimento)
    return d !== null && d >= 60
  }).length
  const pctAntecip = renovaveis.length ? Math.round((renovadasAntecip / renovaveis.length) * 100) : 100

  return [
    {
      titulo: 'Manter a carteira regular',
      keyResults: [
        { descricao: 'Imóveis sem pendência vencida', atual: pctRegular, meta: 90, unidade: '%' },
        { descricao: 'Documentação em dia', atual: kpis.documentacaoEmDia, meta: 95, unidade: '%' },
      ],
    },
    {
      titulo: 'Antecipar renovações e reajustes',
      keyResults: [
        { descricao: 'Contratos com mais de 60 dias de prazo', atual: pctAntecip, meta: 80, unidade: '%' },
        { descricao: 'Contratos vencidos sem renovação', atual: kpis.contratosVencidos, meta: 0, unidade: 'un' },
      ],
    },
  ]
}

/* --------------------- Matriz de risco (prob × impacto) --------------------- */

export type Nivel = 'baixo' | 'medio' | 'alto'

export interface PontoRisco {
  imovelId: string
  rotulo: string
  probabilidade: Nivel // urgência do prazo
  impacto: Nivel // valor do contrato
}

const nivelPorValor = (v: number): Nivel => (v >= 20000 ? 'alto' : v >= 5000 ? 'medio' : 'baixo')
const nivelPorPrazo = (dias: number | null): Nivel => {
  if (dias === null) return 'baixo'
  if (dias < 0 || dias <= 30) return 'alto'
  if (dias <= 120) return 'medio'
  return 'baixo'
}

export function matrizRisco(imoveis: Imovel[], contratos: Contrato[]): PontoRisco[] {
  return contratos.map(c => {
    const imovel = imoveis.find(i => i.id === c.imovelId)
    return {
      imovelId: c.imovelId,
      rotulo: imovel ? imovel.endereco : c.parte,
      probabilidade: nivelPorPrazo(diasAte(c.dataVencimento)),
      impacto: nivelPorValor(valorMensal(c)),
    }
  })
}

/* ------------- Matriz urgência × importância (pendências) ------------- */

export interface PontoPendencia {
  id: string
  rotulo: string
  urgencia: Nivel
  importancia: Nivel
}

const importanciaPorTipo = (tipo: Alerta['tipo']): Nivel =>
  tipo === 'vencimento' ? 'alto' : tipo === 'reajuste' ? 'medio' : 'medio'

export function matrizPendencias(alertas: Alerta[]): PontoPendencia[] {
  return alertas.map(a => ({
    id: a.id,
    rotulo: a.titulo,
    urgencia: nivelPorPrazo(a.diasRestantes),
    importancia: importanciaPorTipo(a.tipo),
  }))
}
