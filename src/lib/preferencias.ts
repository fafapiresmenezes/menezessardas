/**
 * Preferências por usuário (pedido do M, 12/11/2026): cada pessoa escolhe a sua tela inicial
 * e a plataforma lembra. Guardado em `configuracoes` (chave "preferencias_usuarios",
 * JSON { usuario_id: { telaInicial } }), sem mudança de esquema no banco.
 */
import { supabase, supabaseConfigurado } from './supabase'
import { lerConfig, gravarMinhaTela } from './config'

export type Preferencia = { telaInicial?: string }
const CHAVE = 'preferencias_usuarios'

/** Tela de entrada padrão de cada cargo: quem vê tudo abre com os números; os demais, com o próprio dia. */
export const telaPorCargo = (veTudo: boolean) => (veTudo ? '/indicadores' : '/meu-dia')

function limpar(bruto: unknown): Record<string, Preferencia> {
  if (!bruto || typeof bruto !== 'object') return {}
  const saida: Record<string, Preferencia> = {}
  for (const [id, p] of Object.entries(bruto as Record<string, unknown>)) {
    if (p && typeof p === 'object') saida[id] = { telaInicial: typeof (p as Preferencia).telaInicial === 'string' ? (p as Preferencia).telaInicial : undefined }
  }
  return saida
}

export async function lerPreferencias(): Promise<Record<string, Preferencia>> {
  if (!supabaseConfigurado) return {}
  try {
    const bruto = (await lerConfig([CHAVE]))[CHAVE]
    return limpar(bruto ? JSON.parse(bruto) : {})
  } catch { return {} }
}

async function meuId(): Promise<string> {
  try { const r = await Promise.resolve(supabase.auth?.getUser?.()); return r?.data?.user?.id ?? '' } catch { return '' }
}

export async function minhaPreferencia(): Promise<Preferencia> {
  const id = await meuId()
  if (!id) return {}
  return (await lerPreferencias())[id] ?? {}
}

/** Grava a preferência de quem está logado (telaInicial vazia volta ao padrão do cargo). */
export async function definirMinhaPreferencia(p: Preferencia): Promise<void> {
  const id = await meuId()
  if (!id) throw new Error('Entre na plataforma para salvar a sua preferência.')
  // Caminho novo: o banco grava só a preferência de quem pede, sem tocar na dos colegas.
  if (await gravarMinhaTela(p.telaInicial || null)) return
  const todas = await lerPreferencias()
  if (p.telaInicial) todas[id] = { ...todas[id], telaInicial: p.telaInicial }
  else delete todas[id]
  const { error } = await supabase.from('configuracoes').upsert({ chave: CHAVE, valor: JSON.stringify(todas) }, { onConflict: 'chave' })
  if (error) throw new Error(error.message)
}
