/**
 * Configurações do escritório (cargos, preferências, metas, parâmetros de escrita).
 * Cada escritório lê e grava só as suas, pelas funções do banco `config_ler` e `config_gravar`.
 * Enquanto o banco ainda não tem essas funções, cai no caminho antigo (tabela direto),
 * para a tela nunca depender da ordem em que site e banco são publicados.
 */
import { supabase, supabaseConfigurado } from './supabase'

type Linha = { chave: string; valor: string }
type Erro = { code?: string; message?: string } | null

/** Função ainda não existe no banco (ou o PostgREST ainda não a enxerga). */
const semFuncao = (e: Erro) => !!e && (e.code === 'PGRST202' || e.code === '42883' || /could not find the function|does not exist/i.test(e.message ?? ''))

const mapa = (linhas: unknown): Record<string, string> => {
  const saida: Record<string, string> = {}
  for (const l of (Array.isArray(linhas) ? linhas : []) as Linha[]) if (l && typeof l.chave === 'string') saida[l.chave] = String(l.valor ?? '')
  return saida
}

/** Lê as chaves pedidas do escritório de quem está logado. Chave sem valor não aparece no resultado. */
export async function lerConfig(chaves: string[]): Promise<Record<string, string>> {
  if (!supabaseConfigurado || !chaves.length) return {}
  const r = await supabase.rpc('config_ler', { p_chaves: chaves })
  if (!r.error) return mapa(r.data)
  if (!semFuncao(r.error)) throw new Error(r.error.message)
  const antigo = await supabase.from('configuracoes').select('chave, valor').in('chave', chaves)
  return mapa(antigo.data)
}

/** Lê todas as chaves que começam com o prefixo (hoje só "escrita_"). */
export async function lerConfigPrefixo(prefixo: string): Promise<Record<string, string>> {
  if (!supabaseConfigurado) return {}
  const r = await supabase.rpc('config_ler', { p_prefixo: prefixo })
  if (!r.error) return mapa(r.data)
  if (!semFuncao(r.error)) throw new Error(r.error.message)
  const antigo = await supabase.from('configuracoes').select('chave, valor').like('chave', `${prefixo}%`)
  return mapa(antigo.data)
}

/** Grava várias chaves de uma vez. Só a administração do escritório consegue. */
export async function gravarConfig(itens: Record<string, string>): Promise<void> {
  if (!supabaseConfigurado) return
  const r = await supabase.rpc('config_gravar', { p_itens: itens })
  if (!r.error) return
  if (!semFuncao(r.error)) throw new Error(r.error.message)
  const linhas = Object.entries(itens).map(([chave, valor]) => ({ chave, valor }))
  const antigo = await supabase.from('configuracoes').upsert(linhas, { onConflict: 'chave' })
  if (antigo.error) throw new Error(antigo.error.message)
}

/** Grava a tela inicial de quem está logado (null volta ao padrão). Devolve false se o banco ainda não tem a função. */
export async function gravarMinhaTela(tela: string | null): Promise<boolean> {
  const r = await supabase.rpc('preferencia_gravar', { p_tela: tela })
  if (!r.error) return true
  if (semFuncao(r.error)) return false
  throw new Error(r.error.message)
}
