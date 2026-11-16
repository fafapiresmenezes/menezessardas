/**
 * Bloqueio de funções pagas para usuários específicos (P0 Urgente - 15/11/2026)
 *
 * Marcelo Alexandrino e Antonio Costa:
 * - Podem usar tudo GRATUITO (pesquisas, visualizações)
 * - Bloqueados em qualquer função que custe API
 * - Recebem aviso: "Isso gasta dinheiro do Mateus"
 */

import { verificarUsuarioBloqueado } from './acesso'

export type FuncaoPaga =
  | 'jusbrasil' // buscar processos/jurisprudência
  | 'ia_analise' // análise com IA
  | 'ia_geracao' // geração de documentos com IA
  | 'consulta_api_externa' // consultas a APIs externas
  | 'exportacao_premium' // exportação com formatação premium
  | 'relatorio_analise' // geração de relatórios analíticos

/**
 * Descrição de cada função paga para avisar o usuário.
 */
export const descricaoFuncaoPaga: Record<FuncaoPaga, string> = {
  jusbrasil: 'Busca em Jusbrasil (processa consultas pagas)',
  ia_analise: 'Análise com IA (processa com LLM pago)',
  ia_geracao: 'Geração de documentos com IA (processa com LLM pago)',
  consulta_api_externa: 'Consulta a API externa (custa por requisição)',
  exportacao_premium: 'Exportação com formatação premium (processa com engine pago)',
  relatorio_analise: 'Geração de relatório analítico (processa com IA)',
}

/**
 * Aviso padrão para funções pagas bloqueadas.
 */
export const AVISO_CUSTO = 'Isso gasta dinheiro do Mateus — bloqueado para você.'

export const ROTULO_MARCELO = 'Marcelo Alexandrino (sócio iClub geral — gratuito)'
export const ROTULO_ANTONIO = 'Antonio Costa (recebe mensagens — gratuito)'

/**
 * Verifica se o usuário está bloqueado de uma função paga.
 * Retorna true se está bloqueado, false caso contrário.
 */
export async function estaBloqueoEmFuncaoPaga(_funcao: FuncaoPaga): Promise<boolean> {
  const bloqueado = await verificarUsuarioBloqueado()
  return bloqueado !== null
}

/**
 * Bloqueia a execução de uma função paga se o usuário é bloqueado.
 * Lança erro com mensagem amigável se tentar executar.
 */
export async function validarAcessoAFuncaoPaga(_funcao: FuncaoPaga): Promise<void> {
  const bloqueado = await verificarUsuarioBloqueado()

  if (bloqueado) {
    const rotulo = bloqueado === 'marcelo_alexandrino' ? ROTULO_MARCELO : ROTULO_ANTONIO
    throw new Error(
      `${rotulo} não pode usar esta função. ${AVISO_CUSTO}`
    )
  }
}

/**
 * Retorna um aviso para mostrar ao usuário antes de usar uma função paga.
 * Retorna null se o usuário pode usar normalmente.
 */
export async function obterAvisoPaga(_funcao: FuncaoPaga): Promise<string | null> {
  const bloqueado = await verificarUsuarioBloqueado()

  if (bloqueado) {
    const rotulo = bloqueado === 'marcelo_alexandrino' ? ROTULO_MARCELO : ROTULO_ANTONIO
    return `${rotulo} — ${AVISO_CUSTO}`
  }

  return null
}

/**
 * Hook para proteger uma função paga com verificação de acesso.
 * Uso: const resultado = await comBloqueioFuncaoPaga('jusbrasil', () => minhaFuncao())
 */
export async function comBloqueioFuncaoPaga<T>(
  funcao: FuncaoPaga,
  executar: () => Promise<T>
): Promise<T> {
  await validarAcessoAFuncaoPaga(funcao)
  return executar()
}
