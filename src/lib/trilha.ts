/**
 * Trilha de auditoria encadeada por hash (S6).
 *
 * Cada ação relevante (cadastro de imóvel, contrato, anexo, remoção, análise)
 * vira um evento imutável. O hash de cada evento inclui o hash do evento
 * anterior, formando uma cadeia: alterar ou remover um evento no meio quebra
 * todos os hashes seguintes, o que a verificação detecta. É a mesma ideia de
 * um "livro-razão" encadeado, sem depender de blockchain externa.
 */
import { supabase, supabaseConfigurado } from './supabase'

export type TipoEvento =
  | 'imovel_criado'
  | 'contrato_criado'
  | 'documento_anexado'
  | 'documento_removido'
  | 'contrato_analisado'
  | 'fornecedor_atualizado'

export interface EventoTrilha {
  id: string
  seq: number
  em: string // ISO completo, com hora
  tipo: TipoEvento
  entidade: string // id do imóvel/contrato envolvido
  resumo: string
  hashAnterior: string
  hash: string
}

const CHAVE = 'lsm-trilha-v1'
const GENESE = '0'.repeat(64)

async function sha256Hex(texto: string): Promise<string> {
  const dados = new TextEncoder().encode(texto)
  const buffer = await crypto.subtle.digest('SHA-256', dados)
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/** String canônica que entra no hash. A ordem dos campos é fixa. */
function conteudo(e: Omit<EventoTrilha, 'id' | 'hash'>): string {
  return [e.seq, e.em, e.tipo, e.entidade, e.resumo, e.hashAnterior].join('|')
}

function lerLocal(): EventoTrilha[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as EventoTrilha[]) : []
  } catch {
    return []
  }
}

function gravarLocal(eventos: EventoTrilha[]) {
  try {
    localStorage.setItem(CHAVE, JSON.stringify(eventos))
  } catch {
    // sem armazenamento: a trilha segue só em memória nesta sessão
  }
}

export async function listarTrilha(): Promise<EventoTrilha[]> {
  if (supabaseConfigurado) {
    const { data } = await supabase.from('trilha_auditoria').select('*').order('seq')
    return (data ?? []).map(r => ({
      id: String(r.id),
      seq: Number(r.seq),
      em: String(r.criado_em),
      tipo: r.tipo as TipoEvento,
      entidade: String(r.entidade ?? ''),
      resumo: String(r.resumo ?? ''),
      hashAnterior: String(r.hash_anterior),
      hash: String(r.hash),
    }))
  }
  return lerLocal()
}

/**
 * Acrescenta um evento ao fim da cadeia. Nunca lança: a trilha é um registro
 * paralelo e não deve impedir a ação principal se algo falhar.
 */
export async function registrarEvento(parcial: { tipo: TipoEvento; entidade: string; resumo: string }): Promise<void> {
  try {
    const eventos = await listarTrilha()
    const anterior = eventos[eventos.length - 1]
    const base: Omit<EventoTrilha, 'id' | 'hash'> = {
      seq: (anterior?.seq ?? 0) + 1,
      em: new Date().toISOString(),
      tipo: parcial.tipo,
      entidade: parcial.entidade,
      resumo: parcial.resumo,
      hashAnterior: anterior?.hash ?? GENESE,
    }
    const hash = await sha256Hex(conteudo(base))
    if (supabaseConfigurado) {
      await supabase.from('trilha_auditoria').insert({
        seq: base.seq,
        tipo: base.tipo,
        entidade: base.entidade,
        resumo: base.resumo,
        hash_anterior: base.hashAnterior,
        hash,
      })
    } else {
      const novo: EventoTrilha = { ...base, id: `${base.seq}-${hash.slice(0, 8)}`, hash }
      gravarLocal([...lerLocal(), novo])
    }
  } catch {
    // registro de auditoria é best-effort; a ação principal já foi feita
  }
}

export interface ResultadoVerificacao {
  integra: boolean
  total: number
  /** seq do primeiro evento com hash inválido, se houver. */
  quebraEm?: number
  /** hash do topo da cadeia, que serve de "selo" do estado atual. */
  selo: string
}

/** Recalcula a cadeia inteira e aponta a primeira quebra, se existir. */
export async function verificarTrilha(): Promise<ResultadoVerificacao> {
  const eventos = await listarTrilha()
  let anterior = GENESE
  for (const e of eventos) {
    const esperado = await sha256Hex(conteudo({ ...e, hashAnterior: anterior }))
    if (e.hashAnterior !== anterior || e.hash !== esperado) {
      return { integra: false, total: eventos.length, quebraEm: e.seq, selo: eventos[eventos.length - 1]?.hash ?? GENESE }
    }
    anterior = e.hash
  }
  return { integra: true, total: eventos.length, selo: anterior }
}
