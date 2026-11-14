// Habilidade 8 do replanejamento de mercado (14/11/2026): CAC/LTV, sem gasto real de mídia.
// A plataforma não compra mídia por conta própria (limite permanente do projeto) — esta camada só
// calcula o teto saudável de custo de aquisição a partir do preço já existente (habilidade 3) e da
// regra clássica LTV:CAC ≥ 3 (referência pública amplamente usada em SaaS/serviços B2B; aqui
// aplicada sem inventar taxa de recorrência real — assume só o que a escada de compra já promete:
// um ciclo de contrato principal, com a renovação anual tratada como possível, não garantida).
import { FAMILIAS, type FamiliaId } from './caderno-familias'
import { faixaDaFamilia } from './precificacao-familias'

export interface EstimativaCacLtv {
  familia: FamiliaId
  ticketMedioMil: number
  /** LTV conservador: só o ticket do contrato principal, sem contar a renovação anual como certa. */
  ltvConservadorMil: number
  /** Teto de CAC saudável pela regra LTV:CAC ≥ 3. Nunca é orçamento aprovado — é o limite para não virar prejuízo. */
  cacMaximoMil: number
}

const RAZAO_MINIMA_LTV_CAC = 3

/**
 * Estima o teto de custo de aquisição por família, só a partir do preço já existente (nunca
 * inventa taxa de conversão de mídia nem recorrência garantida). Não decide gasto real — a
 * plataforma não compra mídia por conta própria.
 */
export function estimativasCacLtv(): EstimativaCacLtv[] {
  return FAMILIAS.map(f => {
    const faixa = faixaDaFamilia(f.id)
    const ticketMedioMil = (faixa.pisoMil + faixa.tetoMil) / 2
    const ltvConservadorMil = ticketMedioMil
    return {
      familia: f.id,
      ticketMedioMil,
      ltvConservadorMil,
      cacMaximoMil: ltvConservadorMil / RAZAO_MINIMA_LTV_CAC,
    }
  })
}

export const estimativaCacLtvDaFamilia = (f: FamiliaId): EstimativaCacLtv => {
  const e = estimativasCacLtv().find(x => x.familia === f)
  if (!e) throw new Error(`Família sem estimativa de CAC/LTV: ${f}`)
  return e
}

/** Texto para M: nunca promete gasto, só o limite para não entrar no vermelho. */
export const AVISO_CAC_LTV =
  'Isto é o teto para não dar prejuízo (regra de 3x entre o que o cliente vale e o que custa trazê-lo), nunca um orçamento aprovado. A plataforma não compra mídia por conta própria — decisão de gasto real é sempre humana.'
