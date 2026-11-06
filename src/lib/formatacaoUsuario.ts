// Formatação própria de cada pessoa (06/11/2026): guardada no banco (tabela formatacao_escrita);
// se a tabela ainda não existir, fica no navegador para não perder o envio.
import { supabase, supabaseConfigurado } from './supabase'
import type { Formatacao } from './formatarPeca'

const CHAVE = 'lsm-formatacao-escrita'
const lerLocal = (): Partial<Formatacao> | null => { try { const v = localStorage.getItem(CHAVE); return v ? JSON.parse(v) : null } catch { return null } }

export async function carregarFormatacao(): Promise<Partial<Formatacao> | null> {
  if (supabaseConfigurado) {
    const { data, error } = await supabase.from('formatacao_escrita').select('dados').maybeSingle()
    if (!error) return (data?.dados as Partial<Formatacao>) ?? lerLocal()
  }
  return lerLocal()
}

export async function salvarFormatacao(f: Partial<Formatacao>, origem: string) {
  try { localStorage.setItem(CHAVE, JSON.stringify(f)) } catch { /* sem armazenamento local */ }
  if (!supabaseConfigurado) return
  const { data: u } = await supabase.auth.getUser()
  if (!u?.user) return
  await supabase.from('formatacao_escrita').upsert({ usuario_id: u.user.id, dados: f, origem: origem.slice(0, 200), atualizado_em: new Date().toISOString() })
}

export async function apagarFormatacao() {
  try { localStorage.removeItem(CHAVE) } catch { /* nada */ }
  if (!supabaseConfigurado) return
  const { data: u } = await supabase.auth.getUser()
  if (u?.user) await supabase.from('formatacao_escrita').delete().eq('usuario_id', u.user.id)
}
