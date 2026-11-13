// Bloco B04: pasta interna "Já pesquisado". Toda busca ou resposta guardada fica pesquisável.
import { supabase } from '@/lib/supabase'

export type TipoBiblioteca = 'assistente' | 'fontes' | 'parte_adversa' | 'nota'
export const ROTULO_TIPO: Record<TipoBiblioteca, string> = { assistente: 'Assistente', fontes: 'Fontes do advogado', parte_adversa: 'Parte adversa', nota: 'Nota' }
export type ItemBiblioteca = { id: number; tipo: TipoBiblioteca; titulo: string; conteudo: string; etiquetas: string[]; caso: string | null; criado_em: string; criado_por?: string | null }

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

/** Repositório aberto para pesquisa (pedido do M, 12/11/2026): fontes oficiais e gratuitas de
 *  legislação, jurisprudência e teses, para qualquer pessoa do escritório pesquisar. */
export const REPOSITORIOS_ABERTOS: { grupo: string; itens: { nome: string; url: string; desc: string }[] }[] = [
  { grupo: 'Legislação', itens: [
    { nome: 'Planalto — Legislação Federal', url: 'https://www4.planalto.gov.br/legislacao/', desc: 'Constituição, códigos, leis e decretos, no texto oficial e atualizado.' },
    { nome: 'LexML Brasil', url: 'https://www.lexml.gov.br/', desc: 'Rede de informação legislativa e jurídica: busca leis, julgados e doutrina de todos os entes.' },
  ] },
  { grupo: 'Jurisprudência', itens: [
    { nome: 'STF — Pesquisa de jurisprudência', url: 'https://jurisprudencia.stf.jus.br/', desc: 'Acórdãos e decisões do Supremo, com inteiro teor.' },
    { nome: 'STJ — Pesquisa de jurisprudência', url: 'https://scon.stj.jus.br/SCON/', desc: 'Acórdãos, súmulas e informativos do Superior Tribunal de Justiça.' },
    { nome: 'CNJ — DataJud e DJEN', url: 'https://www.cnj.jus.br/sistemas/datajud/', desc: 'Base nacional de processos e o Diário de Justiça Eletrônico Nacional — é daqui que o robô de prazos lê.' },
  ] },
  { grupo: 'Teses e pesquisa acadêmica', itens: [
    { nome: 'BDTD (IBICT)', url: 'https://bdtd.ibict.br/', desc: 'Biblioteca Digital Brasileira de Teses e Dissertações: mestrados e doutorados de todo o país.' },
    { nome: 'Teses USP', url: 'https://teses.usp.br/', desc: 'Teses e dissertações da USP em texto integral, inclusive da Faculdade de Direito.' },
    { nome: 'Lume (UFRGS)', url: 'https://lume.ufrgs.br/', desc: 'Repositório digital da UFRGS: teses, dissertações e artigos.' },
    { nome: 'Repositório UFMG', url: 'https://repositorio.ufmg.br/', desc: 'Produção acadêmica da UFMG, com a área do Direito.' },
    { nome: 'Repositório UnB', url: 'https://repositorio.unb.br/', desc: 'Teses e dissertações da Universidade de Brasília.' },
    { nome: 'Repositório UFBA', url: 'https://repositorio.ufba.br/', desc: 'Produção acadêmica da UFBA, incluindo o PPGD.' },
    { nome: 'SciELO', url: 'https://www.scielo.br/', desc: 'Artigos científicos revisados por pares, em acesso aberto.' },
  ] },
]

export function filtrar(itens: ItemBiblioteca[], busca: string, tipo: TipoBiblioteca | 'todos'): ItemBiblioteca[] {
  const termos = busca.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').split(/\s+/).filter(Boolean)
  return itens.filter(i => (tipo === 'todos' || i.tipo === tipo) && termos.every(t =>
    `${i.titulo} ${i.conteudo} ${i.etiquetas.join(' ')} ${i.caso ?? ''}`.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes(t)))
}
