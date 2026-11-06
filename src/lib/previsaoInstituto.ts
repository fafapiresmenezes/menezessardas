// U13 (plano unificado I-02): probabilidade do Instituto THEYE para ações de locação.
// A Edge `previsao-locacao` só responde para a equipe do escritório (usuarios_perfis) e não lê dados do escritório.
import { supabase } from '@/lib/supabase'
import { combinarProbabilidades } from '@/lib/calibragem'

export interface PrevisaoInstituto {
  convencional: { p: number; ic95: [number, number]; n: number }
  grafo: { p: number } | null
  confianca: 'alta' | 'media' | 'baixa' | string
  placar_atual: string
  aviso: string
  fonte: string
}

export const CLASSES_LOCACAO = [
  'Despejo por Falta de Pagamento Cumulado Com Cobrança',
  'Despejo por Falta de Pagamento',
  'Despejo',
  'Renovatória de Locação',
  'Consignação em Pagamento',
]

export const pct = (p: number) => `${(p * 100).toFixed(1).replace('.', ',')}%`

/** Texto curto, em linguagem simples, para o cartão da tela Previsões. */
export function resumirPrevisaoInstituto(r: PrevisaoInstituto): { titulo: string; detalhe: string; grafo: string | null; confianca: string } {
  const [a, b] = r.convencional.ic95
  return {
    titulo: `${pct(r.convencional.p)} de procedência`,
    detalhe: `Margem (95%): entre ${pct(a)} e ${pct(b)} · ${r.convencional.n.toLocaleString('pt-BR')} processos`,
    grafo: r.grafo ? `Modelo por grafo: ${pct(r.grafo.p)} (placar ${r.placar_atual})` : null,
    confianca: r.confianca === 'alta' ? 'alta' : r.confianca === 'media' ? 'média' : r.confianca === 'baixa' ? 'baixa' : String(r.confianca),
  }
}

export async function consultarPrevisaoInstituto(body: { tribunal: string; classe: string; orgao?: string; assunto?: string }): Promise<PrevisaoInstituto> {
  const { data, error } = await supabase.functions.invoke('previsao-locacao', { body })
  if (error) {
    const corpo = await (error as { context?: Response }).context?.json?.().catch(() => null)
    throw new Error(corpo?.erro ?? corpo?.aviso ?? 'A API do Instituto não respondeu.')
  }
  if (data?.erro) throw new Error(data.erro)
  return data as PrevisaoInstituto
}

// Passo 561 (D16 do Instituto THEYE): chance por classe de ação, só agregados públicos, com IC95 de Wilson.
export interface ChanceClasse { classe: string; acoes?: number; n: number; tribunais?: string[] | number; p: number; ic95: [number, number] }
export async function chanceClassesInstituto(): Promise<ChanceClasse[]> {
  const { data, error } = await supabase.rpc('instituto_chance_classes')
  if (error || !Array.isArray(data)) return []
  return (data as ChanceClasse[]).filter(c => typeof c.p === 'number' && Array.isArray(c.ic95))
}
export const textoChanceClasse = (c: ChanceClasse) =>
  `${c.classe}: ${Math.round(c.p * 100)}% (margem de 95%: ${Math.round(c.ic95[0] * 100)}–${Math.round(c.ic95[1] * 100)}%, n = ${c.n.toLocaleString('pt-BR')})`

/** B07: probabilidade única. Junta as fontes com peso pela amostra. O modelo por grafo só entra
 *  quando vencer o convencional no placar pré-registrado; até lá o peso dele é zero e a tela diz isso. */
export function probabilidadeUnica(r: PrevisaoInstituto, grafoAprovado = false, escritorio?: { p: number; n: number }): { texto: string; explicacao: string } | null {
  const fontes = [{ nome: 'DataJud (Instituto)', p: r.convencional.p, n: r.convencional.n }]
  if (escritorio && escritorio.n > 0) fontes.push({ nome: 'Histórico do escritório', p: escritorio.p, n: escritorio.n })
  if (grafoAprovado && r.grafo) fontes.push({ nome: 'Grafo', p: r.grafo.p, n: r.convencional.n })
  const c = combinarProbabilidades(fontes)
  if (!c) return null
  const pesos = c.pesos.map(w => `${w.nome} ${Math.round(w.peso * 100)}%`).join(', ')
  return { texto: `Probabilidade única THEYE: ${pct(c.p)}`, explicacao: `Pesos: ${pesos}${!grafoAprovado && r.grafo ? '; grafo com peso 0 até vencer o modelo convencional no placar' : ''}.` }
}
