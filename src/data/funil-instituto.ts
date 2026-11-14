// Habilidade 4 do replanejamento de mercado (14/11/2026): funil de vendas do Instituto (diferente
// do funil do escritório em src/lib/escritorio/funil.ts, que é para leads jurídicos do dia a dia).
// Este funil segue a escada de compra do caderno (src/data/caderno-familias.ts: entrada, principal,
// anual) e mede conversão etapa a etapa, nunca um número solto de "taxa de conversão geral" que
// escode onde o cliente está travando.
import { FAMILIAS, type FamiliaId } from './caderno-familias'

/** Ordem real do funil do Instituto, do primeiro contato ao contrato recorrente. */
export const ETAPAS_FUNIL_INSTITUTO = [
  'contato',
  'diagnostico_de_entrada',
  'proposta_enviada',
  'contrato_principal',
  'contrato_anual',
] as const

export type EtapaFunilInstituto = (typeof ETAPAS_FUNIL_INSTITUTO)[number]

export interface RegistroDeFunil {
  familia: FamiliaId
  etapa: EtapaFunilInstituto
  quando: string
}

const indiceDaEtapa = (e: EtapaFunilInstituto) => ETAPAS_FUNIL_INSTITUTO.indexOf(e)

/**
 * Conversão etapa a etapa de cada família: quantos registros chegaram a cada etapa e qual fração
 * dos que chegaram na etapa anterior avançou. Nunca mistura famílias (o funil da família A não
 * entra na conta da família B) e nunca divide por zero (fica null quando não há base de comparação).
 */
export function conversaoPorFamilia(registros: RegistroDeFunil[]) {
  return FAMILIAS.map(f => {
    const doisFamilia = registros.filter(r => r.familia === f.id)
    const contagemPorEtapa = ETAPAS_FUNIL_INSTITUTO.map(etapa => ({
      etapa,
      // conta quem chegou NESTA etapa ou além (funil acumulado, não só o "parado" nela)
      chegou: doisFamilia.filter(r => indiceDaEtapa(r.etapa) >= indiceDaEtapa(etapa)).length,
    }))
    const comConversao = contagemPorEtapa.map((atual, i) => {
      const anterior = i === 0 ? null : contagemPorEtapa[i - 1]
      const conversaoDaEtapaAnterior = anterior && anterior.chegou > 0 ? atual.chegou / anterior.chegou : null
      return { ...atual, conversaoDaEtapaAnterior }
    })
    return { familia: f.id, etapas: comConversao }
  })
}

/** Onde cada família mais trava: a etapa com a menor conversão a partir da anterior (a que precisa de atenção primeiro). */
export function etapaComMaisAtrito(familia: FamiliaId, registros: RegistroDeFunil[]): EtapaFunilInstituto | null {
  const dados = conversaoPorFamilia(registros).find(d => d.familia === familia)
  if (!dados) return null
  const comTaxa = dados.etapas.filter(e => e.conversaoDaEtapaAnterior !== null)
  if (comTaxa.length === 0) return null
  return comTaxa.reduce((pior, atual) => (atual.conversaoDaEtapaAnterior! < pior.conversaoDaEtapaAnterior! ? atual : pior)).etapa
}
