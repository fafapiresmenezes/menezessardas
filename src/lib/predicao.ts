/**
 * Previsões da carteira, todas explicáveis: cada número vem com os fatores que o compõem.
 * Não há modelo treinado (o escritório ainda não tem histórico de pagamentos); são regras
 * de risco usuais em gestão locatícia, com pesos declarados aqui para o advogado conferir.
 */
import type { Contrato, Imovel } from './repositorio'
import { contratoAtivo, valorMensal } from './indicadores'
import { diasAte } from './datas'

export interface Fator { fator: string; pontos: number }
export type Faixa = 'baixo' | 'moderado' | 'alto'

export interface PrevisaoContrato {
  contrato: Contrato
  imovel?: Imovel
  risco: number
  faixaRisco: Faixa
  fatoresRisco: Fator[]
  renovacao: number
  fatoresRenovacao: Fator[]
  acao: string
}

const PESO_GARANTIA: Record<Contrato['garantia'], number> = {
  sem_garantia: 30, fiador: 14, caucao: 10, titulo_capitalizacao: 6, seguro_fianca: 4,
}
const NOME_GARANTIA: Record<Contrato['garantia'], string> = {
  sem_garantia: 'Sem garantia locatícia', fiador: 'Garantia por fiador (execução mais lenta)', caucao: 'Caução (cobre poucos meses)',
  titulo_capitalizacao: 'Título de capitalização', seguro_fianca: 'Seguro-fiança',
}

const mesesEntre = (a: string, b: Date = new Date()) => (b.getTime() - new Date(a + 'T00:00:00').getTime()) / (30.44 * 86400000)

/** Valor por m² mediano da carteira, para comparar cada contrato com o "mercado interno". */
export function medianaM2(contratos: Contrato[], imoveis: Imovel[]): number | null {
  const area = new Map(imoveis.map(i => [i.id, i.areaM2 ?? 0]))
  const v = contratos.filter(contratoAtivo).map(c => (area.get(c.imovelId) ? valorMensal(c) / area.get(c.imovelId)! : 0)).filter(x => x > 0).sort((a, b) => a - b)
  return v.length ? v[Math.floor(v.length / 2)] : null
}

export function preverContrato(c: Contrato, imovel: Imovel | undefined, mediana: number | null): PrevisaoContrato {
  const risco: Fator[] = [{ fator: NOME_GARANTIA[c.garantia], pontos: PESO_GARANTIA[c.garantia] }]
  const renov: Fator[] = [{ fator: 'Base (média de renovação em locação urbana)', pontos: 60 }]
  const dias = diasAte(c.dataVencimento)

  const ultimoReajuste = c.dataUltimoReajuste ?? c.dataInicio
  if (c.indice !== 'sem_reajuste' && c.indice !== 'fixo' && mesesEntre(ultimoReajuste) > 13) {
    risco.push({ fator: 'Reajuste anual atrasado (defasagem acumulada)', pontos: 15 })
    renov.push({ fator: 'Reajuste atrasado: renovação exigirá salto de valor', pontos: -8 })
  } else renov.push({ fator: 'Reajuste em dia', pontos: 5 })

  if (dias !== null && dias < 0) {
    risco.push({ fator: 'Contrato vencido e não encerrado (prazo indeterminado)', pontos: 25 })
    renov.push({ fator: 'Já vencido sem renovação formal', pontos: -15 })
  } else if (dias !== null && dias <= 90) {
    risco.push({ fator: 'Vence em até 90 dias', pontos: 12 })
  }

  const duracaoMeses = c.dataVencimento ? mesesEntre(c.dataInicio, new Date(c.dataVencimento + 'T00:00:00')) : 0
  if (c.tipo === 'locacao_comercial' && duracaoMeses >= 59) {
    renov.push({ fator: 'Locação comercial de 5 anos ou mais: direito à renovatória (art. 51 da Lei 8.245/91)', pontos: 20 })
  }
  if (mesesEntre(c.dataInicio) > 36) renov.push({ fator: 'Relação de mais de 3 anos', pontos: 8 })
  if (c.garantia === 'sem_garantia') renov.push({ fator: 'Sem garantia: locador tende a não renovar', pontos: -10 })

  const docsVencidos = (imovel?.documentos ?? []).filter(d => (diasAte(d.dataVencimento ?? null) ?? 1) < 0).length
  if (docsVencidos) risco.push({ fator: `${docsVencidos} documento(s) do imóvel vencido(s) (risco de multa e disputa)`, pontos: Math.min(15, 6 * docsVencidos) })

  if (mediana && imovel?.areaM2) {
    const razao = valorMensal(c) / imovel.areaM2 / mediana
    if (razao > 1.3) {
      risco.push({ fator: `Aluguel ${Math.round((razao - 1) * 100)}% acima da mediana por m² da carteira`, pontos: 10 })
      renov.push({ fator: 'Valor acima da carteira: locatário pode buscar outro imóvel', pontos: -12 })
    } else if (razao < 0.75) {
      renov.push({ fator: 'Valor abaixo da carteira: locatário tende a ficar', pontos: 10 })
    }
  }

  const r = Math.max(0, Math.min(100, risco.reduce((s, f) => s + f.pontos, 0)))
  const p = Math.max(5, Math.min(95, renov.reduce((s, f) => s + f.pontos, 0)))
  const faixa: Faixa = r >= 45 ? 'alto' : r >= 25 ? 'moderado' : 'baixo'
  const acao = dias !== null && dias < 0
    ? 'Formalizar renovação ou notificar desocupação (art. 46/56 da Lei 8.245/91).'
    : faixa === 'alto'
      ? c.garantia === 'sem_garantia' ? 'Exigir garantia no aditivo (art. 37 da Lei 8.245/91) e acompanhar pagamentos mensalmente.' : 'Acompanhar pagamentos e checar a garantia antes do vencimento.'
      : p < 50 ? 'Abrir conversa de renovação com antecedência e preparar plano de vacância.'
        : 'Manter acompanhamento normal.'
  return { contrato: c, imovel, risco: r, faixaRisco: faixa, fatoresRisco: risco, renovacao: p, fatoresRenovacao: renov, acao }
}

export function preverCarteira(imoveis: Imovel[], contratos: Contrato[]): PrevisaoContrato[] {
  const porId = new Map(imoveis.map(i => [i.id, i]))
  const mediana = medianaM2(contratos, imoveis)
  return contratos
    .filter(c => contratoAtivo(c) || (!c.encerradoEm && (diasAte(c.dataVencimento) ?? 0) < 0))
    .filter(c => c.natureza !== 'aditivo' && c.tipo !== 'sla_fornecedor' && c.tipo !== 'comodato')
    .map(c => preverContrato(c, porId.get(c.imovelId), mediana))
    .sort((a, b) => b.risco - a.risco)
}

export interface PontoReceita { mes: string; contratada: number; esperada: number }

/**
 * Receita dos próximos 12 meses: "contratada" conta só o que está em contrato vigente;
 * "esperada" aplica o índice de reajuste no aniversário e a probabilidade de renovação após o vencimento.
 */
export function preverReceita(previsoes: PrevisaoContrato[], indices: Partial<Record<string, number>>, meses = 12): PontoReceita[] {
  const hoje = new Date()
  return Array.from({ length: meses }, (_, k) => {
    const ref = new Date(hoje.getFullYear(), hoje.getMonth() + k + 1, 1)
    let contratada = 0
    let esperada = 0
    for (const p of previsoes) {
      const c = p.contrato
      let v = valorMensal(c)
      const aniversario = new Date((c.dataUltimoReajuste ?? c.dataInicio) + 'T00:00:00')
      aniversario.setFullYear(aniversario.getFullYear() + 1)
      const taxa = (indices[c.indice] ?? 0) / 100
      if (taxa && ref >= aniversario) v *= 1 + taxa
      const fim = c.dataVencimento ? new Date(c.dataVencimento + 'T00:00:00') : null
      const vigente = !fim || ref <= fim
      if (vigente) { contratada += v; esperada += v } else esperada += v * (p.renovacao / 100)
    }
    return { mes: ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), contratada: Math.round(contratada), esperada: Math.round(esperada) }
  })
}

/** Intervalo de confiança de 95% (Wilson) para uma proporção: calibragem honesta em amostras pequenas. */
export function intervaloWilson(sucessos: number, n: number, z = 1.96): { min: number; max: number } | null {
  if (n <= 0) return null
  const p = sucessos / n
  const den = 1 + (z * z) / n
  const centro = (p + (z * z) / (2 * n)) / den
  const margem = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / den
  return { min: Math.max(0, Math.round((centro - margem) * 100)), max: Math.min(100, Math.round((centro + margem) * 100)) }
}

/**
 * Coleta para calibragem: grava o que foi previsto (sem dados pessoais) para comparar
 * depois com o desfecho real. Falha silenciosa: coletar nunca pode travar a tela.
 */
export async function registrarPrevisoes(linhas: { tipo: string; referencia?: string; previsto: unknown; amostra?: number; fonte?: string }[]) {
  const { supabase, supabaseConfigurado } = await import('./supabase')
  if (!supabaseConfigurado || !linhas.length) return
  try { await supabase.from('registro_previsoes').insert(linhas) } catch { /* ignorado */ }
}
