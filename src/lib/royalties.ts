/**
 * Royalties do Instituto: 5% sobre toda venda feita pela plataforma que NÃO seja trabalho de
 * processo. Pedido de M em 13/11/2026.
 *
 * A regra, em uma frase: estudo, consultoria, laudo, curso, dado e pesquisa pagam 5% ao Instituto;
 * contrato e trabalho de processo não pagam nada. A conta é feita no instante em que a venda é
 * registrada, pelo banco (gatilho da migração 132), não por esta tela: assim ninguém esquece, e
 * ninguém muda o número por fora.
 *
 * O QUE ESTE ARQUIVO NÃO FAZ: mandar dinheiro. Nenhuma linha daqui faz Pix nem manda bitcoin. Ele
 * calcula, registra, mostra e trava a entrega. A confirmação de que o valor caiu na conta é dada
 * pelo Instituto, e fica guardada com data e comprovante. Enquanto não houver um provedor de
 * pagamento conectado pelo dono, "divisão automática" quer dizer: a parte é separada, cobrada e
 * travada sozinha — a transferência em si ainda passa por uma pessoa.
 */
import { supabase, supabaseConfigurado } from './supabase'

/** Um só percentual, e ele também vive no banco. Mudar exige migração, não tela. */
export const PERCENTUAL = 0.05

export type Forma = 'pix' | 'bitcoin' | 'transferencia'

export const FORMAS: { id: Forma; nome: string; oQuePedir: string }[] = [
  { id: 'pix', nome: 'Pix', oQuePedir: 'Chave Pix (CPF, CNPJ, e-mail, telefone ou chave aleatória)' },
  { id: 'bitcoin', nome: 'Bitcoin', oQuePedir: 'Endereço da carteira' },
  { id: 'transferencia', nome: 'Transferência bancária', oQuePedir: 'Banco, agência e conta' },
]

export type TipoVenda = 'estudo' | 'consultoria' | 'laudo' | 'curso' | 'dado' | 'pesquisa' | 'outro'

export const TIPOS: { id: TipoVenda; nome: string }[] = [
  { id: 'estudo', nome: 'Estudo' },
  { id: 'consultoria', nome: 'Consultoria' },
  { id: 'laudo', nome: 'Laudo ou parecer' },
  { id: 'curso', nome: 'Curso ou treinamento' },
  { id: 'dado', nome: 'Dado ou base' },
  { id: 'pesquisa', nome: 'Pesquisa' },
  { id: 'outro', nome: 'Outro serviço' },
]

export interface Venda {
  id: string
  descricao: string
  tipo: TipoVenda
  processual: boolean
  valor_total: number
  moeda: string
  forma_pagamento: string
  recebido_em: string | null
  entregue_em: string | null
}

export interface Repasse {
  id: string
  venda_id: string
  percentual: number
  valor: number
  status: 'pendente' | 'enviado' | 'confirmado'
  confirmado_em: string | null
}

export interface Conta {
  id: string
  titular: string
  forma: Forma
  destino: string
  apelido: string | null
  ativa: boolean
}

/** Quanto é do Instituto nesta venda. Venda de processo não paga royalty. */
export function parteDoInstituto(valorTotal: number, processual: boolean): number {
  if (processual || !(valorTotal > 0)) return 0
  return Math.round(valorTotal * PERCENTUAL * 100) / 100
}

/** Quanto sobra para o escritório. */
export const parteDoEscritorio = (valorTotal: number, processual: boolean): number =>
  Math.round((valorTotal - parteDoInstituto(valorTotal, processual)) * 100) / 100

/**
 * A trava: a entrega só sai quando a parte do Instituto está confirmada na conta.
 * Vale para qualquer forma de pagamento, e é por isso que o pagamento em dinheiro não escapa.
 */
export function podeEntregar(venda: Venda, repasse: Repasse | null): boolean {
  if (venda.processual) return true
  return !!repasse && repasse.status === 'confirmado'
}

/** Por que está travado, em uma frase para quem está olhando a tela. */
export function porQueTravado(venda: Venda, repasse: Repasse | null): string {
  if (podeEntregar(venda, repasse)) return ''
  if (!repasse) return 'A parte do Instituto ainda não foi calculada para esta venda.'
  if (repasse.status === 'pendente') return 'Os 5% do Instituto ainda não foram enviados.'
  return 'Os 5% foram enviados, mas o Instituto ainda não confirmou que caíram na conta.'
}

const erroTabela = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || /does not exist|could not find the table/i.test(e.message ?? ''))

export async function lerVendas(): Promise<{ vendas: Venda[]; repasses: Repasse[]; semTabela: boolean }> {
  if (!supabaseConfigurado) return { vendas: [], repasses: [], semTabela: true }
  const v = await supabase.from('vendas_servico').select('*').order('criado_em', { ascending: false })
  if (v.error) return { vendas: [], repasses: [], semTabela: erroTabela(v.error) }
  const r = await supabase.from('repasses_royalties').select('*')
  return { vendas: (v.data ?? []) as Venda[], repasses: (r.data ?? []) as Repasse[], semTabela: false }
}

export async function lerContas(): Promise<{ contas: Conta[]; semTabela: boolean }> {
  if (!supabaseConfigurado) return { contas: [], semTabela: true }
  const c = await supabase.from('royalties_contas').select('*').order('criado_em')
  if (c.error) return { contas: [], semTabela: erroTabela(c.error) }
  return { contas: (c.data ?? []) as Conta[], semTabela: false }
}

/** Guarda uma conta de recebimento e, se pedido, deixa só ela ativa. */
export async function gravarConta(conta: { titular: string; forma: Forma; destino: string; apelido?: string; ativa?: boolean }): Promise<void> {
  if (!supabaseConfigurado) return
  if (conta.ativa) await supabase.from('royalties_contas').update({ ativa: false }).eq('ativa', true)
  const r = await supabase.from('royalties_contas').insert({
    titular: conta.titular, forma: conta.forma, destino: conta.destino,
    apelido: conta.apelido ?? null, ativa: !!conta.ativa,
  })
  if (r.error) throw new Error(r.error.message)
}

/** Troca qual conta recebe. */
export async function escolherConta(id: string): Promise<void> {
  if (!supabaseConfigurado) return
  await supabase.from('royalties_contas').update({ ativa: false }).eq('ativa', true)
  const r = await supabase.from('royalties_contas').update({ ativa: true }).eq('id', id)
  if (r.error) throw new Error(r.error.message)
}

/** O Instituto confirma que o valor caiu. Só isto destrava a entrega. */
export async function confirmarRecebimento(repasseId: string, comprovante: string): Promise<void> {
  if (!supabaseConfigurado) return
  const r = await supabase.from('repasses_royalties')
    .update({ status: 'confirmado', confirmado_em: new Date().toISOString(), comprovante })
    .eq('id', repasseId)
  if (r.error) throw new Error(r.error.message)
}

export const dinheiro = (v: number, moeda = 'BRL') =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: moeda })
