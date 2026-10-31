// U13 (plano unificado I-02): probabilidade do Instituto THEYE para ações de locação.
// A Edge `previsao-locacao` só responde para a equipe do escritório (usuarios_perfis) e não lê dados do escritório.
import { supabase } from '@/lib/supabase'

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
