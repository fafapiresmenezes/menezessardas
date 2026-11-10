// Passo D22 (Diamante): white-label — cada escritório parceiro vê a própria marca (nome, cor, logo) na plataforma
// e pode usar domínio próprio. O rodapé "Desenvolvido pelo Instituto THEYE" permanece.
import { supabase, supabaseConfigurado } from './supabase'

export type MarcaEscritorio = { nome: string; cor: string; logo_url: string | null; sede: boolean }
export const COR_PADRAO = '#14213D'
const CHAVE = 'gm-marca-v1'
const DOMINIOS_DA_PLATAFORMA = ['localhost', '127.0.0.1', 'vercel.app', 'github.io']

export function corValida(cor: string | null | undefined): string { return cor && /^#[0-9A-Fa-f]{6}$/.test(cor) ? cor : COR_PADRAO }
export function logoValida(url: string | null | undefined): string | null { return url && /^https:\/\/\S+$/.test(url) ? url : null }
/** Domínio próprio = qualquer host que não seja da plataforma (vercel.app, github.io, localhost). */
export function ehDominioProprio(host: string): boolean {
  const h = host.toLowerCase()
  return h !== '' && !DOMINIOS_DA_PLATAFORMA.some(d => h === d || h.endsWith('.' + d))
}
function normalizar(d: unknown): MarcaEscritorio | null {
  if (!d || typeof d !== 'object') return null
  const m = d as Record<string, unknown>
  if (m.sede === true) return null
  const nome = typeof m.nome === 'string' ? m.nome.trim() : ''
  if (!nome) return null
  return { nome, cor: corValida(m.cor as string), logo_url: logoValida(m.logo_url as string), sede: false }
}

/** Marca do escritório da pessoa logada; null para a sede (lockup Instituto THEYE). Guardada na sessão. */
export async function minhaMarca(): Promise<MarcaEscritorio | null> {
  if (!supabaseConfigurado) return null
  try { const k = sessionStorage.getItem(CHAVE); if (k !== null) return k ? JSON.parse(k) : null } catch { /* sem sessionStorage */ }
  try {
    const { data } = await supabase.rpc('minha_marca')
    const m = normalizar(data)
    try { sessionStorage.setItem(CHAVE, m ? JSON.stringify(m) : '') } catch { /* ignora */ }
    return m
  } catch { return null }
}
export function esquecerMarca() { try { sessionStorage.removeItem(CHAVE) } catch { /* ignora */ } }

/** Marca pelo domínio de acesso, para a tela de login (antes de entrar). */
export async function marcaPorDominio(host = typeof window !== 'undefined' ? window.location.hostname : ''): Promise<MarcaEscritorio | null> {
  if (!supabaseConfigurado || !ehDominioProprio(host)) return null
  try { const { data } = await supabase.rpc('marca_por_dominio', { p_dominio: host.replace(/^www\./, '') }); return normalizar(data) } catch { return null }
}
