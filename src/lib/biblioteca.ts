// Bloco B04: pasta interna "Já pesquisado". Toda busca ou resposta guardada fica pesquisável.
import { supabase } from '@/lib/supabase'

export type TipoBiblioteca = 'assistente' | 'fontes' | 'parte_adversa' | 'nota'
export const ROTULO_TIPO: Record<TipoBiblioteca, string> = { assistente: 'Assistente', fontes: 'Fontes do advogado', parte_adversa: 'Parte adversa', nota: 'Nota' }
export type ItemBiblioteca = { id: number; tipo: TipoBiblioteca; titulo: string; conteudo: string; etiquetas: string[]; caso: string | null; criado_em: string }

/** Esconde CPF (com ou sem pontuação) antes de guardar. CNPJ e número de processo continuam visíveis. */
export function mascarar(texto: string): string {
  return texto.replace(/(?<!\d|\d[./-])\d{3}\.?\d{3}\.?\d{3}-?\d{2}(?!\d|[./-]\d)/g, '***.***.***-**')
}

/** Guarda sem travar a tela: se o banco falhar, devolve false e a tela segue normal. */
export async function guardarNaBiblioteca(i: { tipo: TipoBiblioteca; titulo: string; conteudo: string; etiquetas?: string[]; caso?: string | null }): Promise<boolean> {
  try {
    const { error } = await supabase.from('biblioteca_pesquisas').insert({
      tipo: i.tipo, titulo: mascarar(i.titulo).slice(0, 300), conteudo: mascarar(i.conteudo).slice(0, 50000),
      etiquetas: (i.etiquetas ?? []).map(e => e.trim().toLowerCase()).filter(Boolean).slice(0, 10), caso: i.caso ?? null,
    })
    return !error
  } catch { return false }
}

export function filtrar(itens: ItemBiblioteca[], busca: string, tipo: TipoBiblioteca | 'todos'): ItemBiblioteca[] {
  const termos = busca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean)
  return itens.filter(i => (tipo === 'todos' || i.tipo === tipo) && termos.every(t =>
    `${i.titulo} ${i.conteudo} ${i.etiquetas.join(' ')} ${i.caso ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t)))
}
