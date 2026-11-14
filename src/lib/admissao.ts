/**
 * Pedir entrada: o visitante que ainda não é membro deixa um pedido na porta.
 *
 * O pedido NÃO escreve direto no banco (a blindagem trancou isso): vai pela função do servidor
 * `pedir-entrada`, que confere, segura spam e grava. Admin da sede lê e responde pelas funções
 * `pedidos_entrada_publico_listar` e `pedidos_entrada_publico_marcar`.
 */
import { supabase } from '@/lib/supabase'

export type MotivoEntrada = 'entrada' | 'proposta' | 'aviso' | 'apoio'
export type EstadoPedido = 'novo' | 'lido' | 'respondido' | 'arquivado'

export interface FormPedidoEntrada {
  nome: string
  escritorio?: string
  email: string
  telefone?: string
  motivo: MotivoEntrada
  frente?: string
  mensagem?: string
  /** milissegundos que a pessoa levou na tela (anti-robô); preenchido pela tela. */
  ms: number
  /** campo-armadilha: fica escondido; se vier preenchido, é robô. */
  site?: string
}

export interface PedidoEntradaPublico {
  id: string
  protocolo: string
  criado_em: string
  nome: string
  escritorio: string | null
  email: string
  telefone: string | null
  motivo: MotivoEntrada
  frente: string | null
  mensagem: string | null
  estado: EstadoPedido
  decidido_em: string | null
}

export interface ReciboEntrada { protocolo: string; criado_em: string }

/** Manda o pedido. Devolve o recibo, ou uma mensagem de erro para mostrar na tela. */
export async function pedirEntrada(form: FormPedidoEntrada): Promise<{ recibo?: ReciboEntrada; erro?: string }> {
  const { data, error } = await supabase.functions.invoke('pedir-entrada', { body: form })
  const resposta = error ? await (error as { context?: Response }).context?.json?.().catch(() => null) : data
  if (error && !resposta?.erro) return { erro: 'O pedido não foi enviado agora. Tente de novo em instantes.' }
  if (resposta?.erro) return { erro: resposta.erro }
  if (resposta?.protocolo) return { recibo: { protocolo: resposta.protocolo, criado_em: resposta.criado_em } }
  return { erro: 'O pedido não foi enviado agora. Tente de novo em instantes.' }
}

/** Admin da sede: lista os pedidos recebidos. */
export async function listarPedidosEntrada(): Promise<PedidoEntradaPublico[]> {
  const { data, error } = await supabase.rpc('pedidos_entrada_publico_listar')
  if (error) throw error
  return (data ?? []) as PedidoEntradaPublico[]
}

/** Admin da sede: muda o estado de um pedido. */
export async function marcarPedidoEntrada(id: string, estado: EstadoPedido): Promise<boolean> {
  const { data, error } = await supabase.rpc('pedidos_entrada_publico_marcar', { p_id: id, p_estado: estado })
  if (error) throw error
  return Boolean(data)
}
