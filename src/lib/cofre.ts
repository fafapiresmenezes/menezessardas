// Banco de senhas (pedido de M, 19/11/2026).
// Tudo é cifrado NO NAVEGADOR com a frase-mestra do escritório (PBKDF2 + AES-GCM). O banco recebe só o
// texto embaralhado: a frase nunca é enviada nem guardada, e sem ela ninguém lê as senhas.
import { supabase } from '@/lib/supabase'

export interface ItemCofre { nome: string; usuario: string; senha: string; observacao: string }
export interface LinhaCofre { id: string; cifra: string; sal: string; iv: string; atualizado_em?: string }
export interface ItemAberto extends ItemCofre { id: string }

const VOLTAS = 310_000
export const FRASE_MINIMA = 12

const b64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const deB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

async function chave(frase: string, sal: Uint8Array): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(frase), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: sal as BufferSource, iterations: VOLTAS, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt'])
}

export async function cifrar(item: ItemCofre, frase: string): Promise<{ cifra: string; sal: string; iv: string }> {
  const sal = crypto.getRandomValues(new Uint8Array(16)); const iv = crypto.getRandomValues(new Uint8Array(12))
  const dados = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: iv as BufferSource }, await chave(frase, sal), new TextEncoder().encode(JSON.stringify(item)))
  return { cifra: b64(new Uint8Array(dados)), sal: b64(sal), iv: b64(iv) }
}

/** Devolve o item, ou null quando a frase não é a que cifrou (ou a linha está estragada). */
export async function decifrar(l: Pick<LinhaCofre, 'cifra' | 'sal' | 'iv'>, frase: string): Promise<ItemCofre | null> {
  try {
    const claro = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: deB64(l.iv) as BufferSource }, await chave(frase, deB64(l.sal)), deB64(l.cifra) as BufferSource)
    const o = JSON.parse(new TextDecoder().decode(claro)) as Partial<ItemCofre>
    return { nome: String(o.nome ?? ''), usuario: String(o.usuario ?? ''), senha: String(o.senha ?? ''), observacao: String(o.observacao ?? '') }
  } catch { return null }
}

export async function listarCofre(): Promise<LinhaCofre[]> {
  const { data, error } = await supabase.from('cofre_senhas').select('id,cifra,sal,iv,atualizado_em').order('criado_em', { ascending: true }).limit(1000)
  if (error) throw error
  return (data ?? []) as LinhaCofre[]
}

export async function guardarNoCofre(item: ItemCofre, frase: string, id?: string): Promise<void> {
  const c = await cifrar(item, frase)
  const { error } = id
    ? await supabase.from('cofre_senhas').update({ ...c, atualizado_em: new Date().toISOString() }).eq('id', id)
    : await supabase.from('cofre_senhas').insert(c)
  if (error) throw error
}

export async function apagarDoCofre(id: string): Promise<void> {
  const { error } = await supabase.from('cofre_senhas').delete().eq('id', id)
  if (error) throw error
}

/** Abre todas as linhas com a frase. `fechadas` conta as que a frase não abriu. */
export async function abrirCofre(linhas: LinhaCofre[], frase: string): Promise<{ itens: ItemAberto[]; fechadas: number }> {
  const itens: ItemAberto[] = []; let fechadas = 0
  for (const l of linhas) { const i = await decifrar(l, frase); if (i) itens.push({ id: l.id, ...i }); else fechadas++ }
  return { itens, fechadas }
}
