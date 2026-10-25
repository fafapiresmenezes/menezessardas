/**
 * Configuração da chave da IA pelo administrador, dentro da plataforma.
 * O valor vai direto ao servidor por RPC; o navegador só recebe o estado
 * (definida ou não, data e os 4 últimos caracteres), nunca a chave.
 */
import { supabase } from './supabase'
import { registrarEvento } from './trilha'

export interface EstadoChaveIA {
  permitido: boolean
  definida: boolean
  atualizadoEm: string | null
  sufixo: string | null
}

const CHAVE = 'anthropic_api_key'

const mensagem = (e: unknown, padrao: string) =>
  e instanceof Error && e.message ? e.message : padrao

export async function estadoChaveIA(): Promise<EstadoChaveIA> {
  const { data, error } = await supabase.rpc('estado_configuracao', { p_chave: CHAVE })
  if (error) throw new Error(error.message)
  const linha = (Array.isArray(data) ? data[0] : data) as
    | { permitido: boolean; definida: boolean; atualizado_em: string | null; sufixo: string | null }
    | undefined
  return {
    permitido: Boolean(linha?.permitido),
    definida: Boolean(linha?.definida),
    atualizadoEm: linha?.atualizado_em ?? null,
    sufixo: linha?.sufixo ?? null,
  }
}

export async function salvarChaveIA(valor: string): Promise<void> {
  const limpo = valor.trim()
  const { error } = await supabase.rpc('definir_configuracao', { p_chave: CHAVE, p_valor: limpo })
  if (error) throw new Error(error.message)
  await registrarEvento({
    tipo: 'configuracao_alterada',
    entidade: CHAVE,
    resumo: `Chave da IA atualizada (final …${limpo.slice(-4)})`,
  })
}

export async function removerChaveIA(): Promise<void> {
  const { error } = await supabase.rpc('remover_configuracao', { p_chave: CHAVE })
  if (error) throw new Error(error.message)
  await registrarEvento({ tipo: 'configuracao_alterada', entidade: CHAVE, resumo: 'Chave da IA removida' })
}

/** Faz uma chamada mínima à IA para confirmar que a chave funciona. */
export async function testarChaveIA(): Promise<{ ok: boolean; modelo: string }> {
  try {
    const { data, error } = await supabase.functions.invoke('analisar-contrato', { body: { teste: true } })
    if (error) {
      // A função devolve o motivo em JSON mesmo com status de erro.
      const ctx = (error as { context?: Response }).context
      if (ctx && typeof ctx.json === 'function') {
        const corpo = await ctx.json().catch(() => null)
        if (corpo?.erro) throw new Error(corpo.erro)
      }
      throw new Error(error.message)
    }
    if (data?.erro) throw new Error(data.erro)
    return { ok: Boolean(data?.ok), modelo: String(data?.modelo ?? '') }
  } catch (e) {
    throw new Error(mensagem(e, 'Não foi possível testar a IA agora.'))
  }
}
