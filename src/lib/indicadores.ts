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

/* ------------------- Tendência dos próximos 12 meses ------------------- */

export interface PontoTendencia {
  /** aaaa-mm */
  mes: string
  rotulo: string
  contratosVigentes: number
  receitaMensal: number
  vencimentos: number
  reajustes: number
  documentosAVencer: number
}

const rotuloMes = (d: Date) =>
  d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '') + '/' + String(d.getFullYear()).slice(2)

/**
 * Projeta, mês a mês, o que a carteira terá pela frente: contratos ainda vigentes,
 * receita contratada, vencimentos, reajustes anuais e documentos a vencer.
 * Tudo deriva das datas cadastradas; nada é estimado.
 */
export function tendencia12Meses(imoveis: Imovel[], contratos: Contrato[], meses = 12): PontoTendencia[] {
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  // Vigentes e receita seguem o mesmo critério dos KPIs (contratoAtivo); eventos
  // consideram todo contrato não encerrado, para um vencimento deste mês não sumir.
  const naoEncerrados = contratos.filter(c => !c.encerradoEm)
  const ativosHoje = naoEncerrados.filter(contratoAtivo)
  const docs = [...imoveis.flatMap(i => i.documentos), ...contratos.flatMap(c => c.documentos)]

  return Array.from({ length: meses }, (_, k) => {
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth() + k, 1)
    const fim = new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 0)
    const iniISO = inicio.toISOString().slice(0, 10)
    const fimISO = fim.toISOString().slice(0, 10)
    const noMes = (iso: string | null | undefined) => !!iso && iso >= iniISO && iso <= fimISO

    const vigentes = ativosHoje.filter(c => c.dataInicio <= fimISO && (!c.dataVencimento || c.dataVencimento >= iniISO))
    const reajustes = naoEncerrados.filter(c => {
      if (c.indice === 'sem_reajuste' || c.indice === 'fixo') return false
      const base = new Date((c.dataUltimoReajuste ?? c.dataInicio) + 'T00:00:00')
      const aniversario = new Date(inicio.getFullYear(), base.getMonth(), base.getDate())
      return (
        aniversario.getMonth() === inicio.getMonth() &&
        aniversario > base &&
        (!c.dataVencimento || aniversario.toISOString().slice(0, 10) <= c.dataVencimento)
      )
    }).length

    return {
      mes: iniISO.slice(0, 7),
      rotulo: rotuloMes(inicio),
      contratosVigentes: vigentes.length,
      receitaMensal: vigentes.reduce((s, c) => s + valorMensal(c), 0),
      vencimentos: naoEncerrados.filter(c => noMes(c.dataVencimento)).length,
      reajustes,
      documentosAVencer: docs.filter(d => noMes(d.dataVencimento)).length,
    }
  })
}

/* ----------------------------- OKRs ----------------------------- */

export interface KeyResult {
  descricao: string
  atual: number
  meta: number
  unidade: '%' | 'un'
  /** Meta é um teto (ex.: vacância ≤ 10%), não um piso. */
  menorMelhor?: boolean
}
export interface Objetivo {
  titulo: string
  keyResults: KeyResult[]
}

/** Parte da receita mensal ativa cujo contrato vence nos próximos 90 dias. */
export function receitaEmRisco(contratos: Contrato[], receitaTotal: number): number {
  if (!receitaTotal) return 0
  const emRisco = contratos
    .filter(contratoAtivo)
    .filter(c => { const d = diasAte(c.dataVencimento); return d !== null && d >= 0 && d <= 90 })
    .reduce((s, c) => s + valorMensal(c), 0)
  return Math.round((emRisco / receitaTotal) * 100)
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
    {
      titulo: 'Proteger a receita da carteira',
      keyResults: [
        { descricao: 'Vacância (imóveis vagos)', atual: kpis.vacancia, meta: 10, unidade: '%', menorMelhor: true },
        { descricao: 'Receita mensal que vence em até 90 dias', atual: receitaEmRisco(contratos, kpis.receitaContratadaMensal), meta: 15, unidade: '%', menorMelhor: true },
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
  tipo === 'vencimento' || tipo === 'renovatoria' ? 'alto' : 'medio'

export function matrizPendencias(alertas: Alerta[]): PontoPendencia[] {
  return alertas.map(a => ({
    id: a.id,
    rotulo: a.titulo,
    urgencia: nivelPorPrazo(a.diasRestantes),
    importancia: importanciaPorTipo(a.tipo),
  }))
}
