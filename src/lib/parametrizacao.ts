/**
 * Primeiro acesso de quem administra um escritório (pedido de M, 13/11/2026):
 * "garanta que Fátima quando entrar veja uma tela enorme dizendo parametrize a plataforma e
 * defina a hierarquia, somente uma vez".
 *
 * O "somente uma vez" é por ESCRITÓRIO, não por pessoa e não por navegador: a hierarquia se
 * define uma vez para a casa inteira. Por isso a marca mora em `configuracoes`, na chave
 * `parametrizacao_feita`, que as funções `config_ler` e `config_gravar` já separam por
 * escritório. Guardar no navegador faria a tela voltar em outro computador e sumir para sempre
 * se alguém limpasse o histórico — as duas coisas erradas.
 *
 * Quem não administra nunca vê esta tela: ela pede coisas que só a administração pode fazer.
 */
import { lerConfig, gravarConfig } from './config'
import { supabaseConfigurado } from './supabase'

export const CHAVE_PARAMETRIZACAO = 'parametrizacao_feita'

export interface EstadoParametrizacao {
  /** Já foi marcada como feita alguma vez neste escritório. */
  feita: boolean
  /** Quantas pessoas já têm cargo. Zero significa que a hierarquia ainda não foi definida. */
  comCargo: number
}

export async function estadoParametrizacao(): Promise<EstadoParametrizacao> {
  if (!supabaseConfigurado) return { feita: true, comCargo: 0 }
  try {
    const c = await lerConfig([CHAVE_PARAMETRIZACAO, 'cargos'])
    const mapa = c.cargos ? JSON.parse(c.cargos) : {}
    const comCargo = mapa && typeof mapa === 'object' ? Object.keys(mapa).length : 0
    return { feita: !!c[CHAVE_PARAMETRIZACAO], comCargo }
  } catch {
    // Sem resposta do banco, não mostra nada: melhor não aparecer do que aparecer errado.
    return { feita: true, comCargo: 0 }
  }
}

/** Marca o escritório como parametrizado. Daqui em diante a tela não aparece mais para ninguém. */
export async function marcarParametrizada(): Promise<void> {
  await gravarConfig({ [CHAVE_PARAMETRIZACAO]: new Date().toISOString() })
}
