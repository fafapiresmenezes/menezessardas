// Busca direto nas fontes oficiais (DataJud, DJEN, Receita, Querido Diário), sem intermediário pago.
// Aqui ficam as partes que não dependem de rede: os blocos de período e a montagem da lista de processos
// a partir das publicações, do jeito que o Escavador mostra (um processo por linha, com partes e advogados).
import { isoLocal } from '@/lib/datas'

export type Parte = { nome: string; polo: string | null }
export type Advogado = { nome: string; oab: string | null }
export type Publicacao = {
  id: string; data: string; tribunal: string | null; orgao: string | null; tipo: string | null; documento: string | null
  classe: string | null; numero: string; texto: string; link: string | null; partes: Parte[]; advogados: Advogado[]
}
export type ProcessoEncontrado = {
  numero: string; digitos: string; tribunal: string | null; classe: string | null; orgao: string | null
  partes: Parte[]; advogados: Advogado[]; primeira: string; ultima: string; total: number; publicacoes: Publicacao[]
}
export type Bloco = { inicio: string; fim: string }

/** Blocos de `dias` dias, colados, do mais recente para o mais antigo, cobrindo `meses` meses (máx. 60). */
export function blocos(meses: number, hoje: Date = new Date(), dias = 90): Bloco[] {
  const totalDias = Math.max(1, Math.min(60, Math.round(meses))) * 30
  const n = Math.ceil(totalDias / dias)
  const base = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate(), 12)
  const dia = (k: number) => isoLocal(new Date(base.getTime() - k * 86400000))
  return Array.from({ length: n }, (_, k) => ({ fim: dia(dias * k), inicio: dia(Math.min(dias * k + dias - 1, totalDias - 1)) }))
}

const chaveNome = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim()
function unir<T extends { nome: string }>(lista: T[], novos: T[]): T[] {
  const vistos = new Set(lista.map(x => chaveNome(x.nome)))
  for (const n of novos) { const k = chaveNome(n.nome); if (k && !vistos.has(k)) { vistos.add(k); lista.push(n) } }
  return lista
}

/** Tira repetidas (mesmo id) e agrupa por número de processo; a lista sai do processo com publicação mais recente. */
export function agruparPorProcesso(pubs: Publicacao[]): ProcessoEncontrado[] {
  const unicas = new Map<string, Publicacao>()
  for (const p of pubs) if (!unicas.has(p.id)) unicas.set(p.id, p)
  const mapa = new Map<string, ProcessoEncontrado>()
  for (const p of unicas.values()) {
    const digitos = p.numero.replace(/\D/g, '')
    if (!digitos) continue
    let g = mapa.get(digitos)
    if (!g) { g = { numero: p.numero, digitos, tribunal: p.tribunal, classe: p.classe, orgao: p.orgao, partes: [], advogados: [], primeira: p.data, ultima: p.data, total: 0, publicacoes: [] }; mapa.set(digitos, g) }
    g.total++; g.publicacoes.push(p)
    if (p.data < g.primeira) g.primeira = p.data
    if (p.data >= g.ultima) { g.ultima = p.data; g.orgao = p.orgao ?? g.orgao; g.classe = p.classe ?? g.classe }
    if (!/\D/.test(g.numero) && /\D/.test(p.numero)) g.numero = p.numero // prefere o número com máscara
    unir(g.partes, p.partes); unir(g.advogados, p.advogados)
  }
  for (const g of mapa.values()) g.publicacoes.sort((a, b) => b.data.localeCompare(a.data))
  return [...mapa.values()].sort((a, b) => b.ultima.localeCompare(a.ultima) || b.total - a.total)
}

export const POLO: Record<string, string> = { A: 'polo ativo', P: 'polo passivo', T: 'terceiro' }

/** Números para colar no importador ("Lista de números"). */
export const numerosParaImportar = (ps: ProcessoEncontrado[]) => ps.filter(p => p.digitos.length === 20).map(p => p.numero).join('\n')
