/**
 * Ancoragem externa da trilha de auditoria (S6/S7) com OpenTimestamps.
 *
 * O "selo" (hash do topo da cadeia) vira um pequeno arquivo de texto; o SHA-256
 * desse arquivo é enviado a um calendário público do OpenTimestamps, que o
 * inclui numa transação agregada no Bitcoin (confirmação em algumas horas).
 * Guardamos a prova devolvida e geramos o arquivo .ots, que qualquer pessoa
 * verifica em opentimestamps.org junto com o arquivo do selo — sem depender
 * desta plataforma. Nenhum dado de cliente sai daqui, só um hash.
 */
import { supabase, supabaseConfigurado } from './supabase'
import { listarTrilha, verificarTrilha, registrarEvento } from './trilha'

export interface Ancoragem {
  id: string
  seq: number
  selo: string
  digest: string
  calendario: string
  /** Resposta do calendário (base64), parte final do arquivo .ots. */
  provaB64: string
  em: string
}

export const CALENDARIOS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

const CHAVE = 'lsm-ancoragens-v1'

export function textoDoSelo(seq: number, selo: string): string {
  return `Plataforma de Gestão de Contratos - GMenezes Advogados Associados\nSelo da trilha de auditoria\nregistros: ${seq}\nselo: ${selo}\n`
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
}

const hex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
const paraB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const deB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

function lerLocal(): Ancoragem[] {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as Ancoragem[]) : []
  } catch {
    return []
  }
}

export async function listarAncoragens(): Promise<Ancoragem[]> {
  if (supabaseConfigurado) {
    const { data } = await supabase.from('ancoragens').select('*').order('seq')
    return (data ?? []).map(r => ({
      id: String(r.id), seq: Number(r.seq), selo: String(r.selo), digest: String(r.digest),
      calendario: String(r.calendario), provaB64: String(r.prova_b64), em: String(r.criado_em),
    }))
  }
  return lerLocal()
}

/** Ancora o estado atual da trilha. Lança erro claro se a trilha estiver comprometida ou os calendários inacessíveis. */
export async function ancorarAgora(): Promise<Ancoragem> {
  const v = await verificarTrilha()
  if (v.total === 0) throw new Error('Ainda não há registros na trilha para ancorar.')
  if (!v.integra) throw new Error(`A cadeia está comprometida a partir do registro nº ${v.quebraEm}; não é seguro ancorar.`)

  const eventos = await listarTrilha()
  const seq = eventos[eventos.length - 1].seq
  const arquivo = new TextEncoder().encode(textoDoSelo(seq, v.selo))
  const digest = await sha256(arquivo)

  let ultimoErro = ''
  for (const cal of CALENDARIOS) {
    try {
      const resp = await fetch(`${cal}/digest`, {
        method: 'POST',
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: digest as BodyInit,
      })
      if (!resp.ok) {
        ultimoErro = `${cal} respondeu ${resp.status}`
        continue
      }
      const prova = new Uint8Array(await resp.arrayBuffer())
      const anc: Ancoragem = {
        id: `${seq}-${hex(digest).slice(0, 8)}`,
        seq, selo: v.selo, digest: hex(digest), calendario: cal, provaB64: paraB64(prova), em: new Date().toISOString(),
      }
      if (supabaseConfigurado) {
        const { error } = await supabase.from('ancoragens').insert({
          seq, selo: anc.selo, digest: anc.digest, calendario: cal, prova_b64: anc.provaB64,
        })
        if (error) throw error
      } else {
        localStorage.setItem(CHAVE, JSON.stringify([...lerLocal(), anc]))
      }
      await registrarEvento({ tipo: 'trilha_ancorada', entidade: anc.id, resumo: `Selo do registro nº ${seq} enviado ao OpenTimestamps` })
      return anc
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e)
    }
  }
  throw new Error(`Não foi possível falar com os calendários públicos agora (${ultimoErro}). Tente de novo mais tarde.`)
}

/** Monta o arquivo .ots: cabeçalho padrão + SHA-256 do arquivo + árvore devolvida pelo calendário. */
export function montarOts(a: Ancoragem): Uint8Array {
  const magic = new Uint8Array([
    0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00,
    0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
  ])
  const digest = Uint8Array.from(a.digest.match(/../g)!.map(h => parseInt(h, 16)))
  const prova = deB64(a.provaB64)
  const saida = new Uint8Array(magic.length + 1 + 1 + digest.length + prova.length)
  saida.set(magic, 0)
  saida[magic.length] = 0x01 // versão
  saida[magic.length + 1] = 0x08 // operação SHA-256
  saida.set(digest, magic.length + 2)
  saida.set(prova, magic.length + 2 + digest.length)
  return saida
}

export function baixarArquivo(nome: string, conteudo: BlobPart, tipo = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const a = document.createElement('a')
  a.href = url
  a.download = nome
  a.click()
  URL.revokeObjectURL(url)
}

export interface Lastro {
  ancoragemId: string
  seq: number
  /** O registro daquele número ainda tem o mesmo hash que foi ancorado? */
  coerente: boolean
  motivo?: string
}

/**
 * Confere cada ancoragem com a cadeia atual: o hash do registro ancorado não
 * pode ter mudado. A confirmação no Bitcoin é conferida no opentimestamps.org
 * com os arquivos baixados (a prova só fica completa após algumas horas).
 */
export async function verificarLastro(): Promise<Lastro[]> {
  const [ancs, eventos] = await Promise.all([listarAncoragens(), listarTrilha()])
  const resultados: Lastro[] = []
  for (const a of ancs) {
    const ev = eventos.find(e => e.seq === a.seq)
    if (!ev) resultados.push({ ancoragemId: a.id, seq: a.seq, coerente: false, motivo: 'O registro ancorado não existe mais na trilha.' })
    else if (ev.hash !== a.selo) resultados.push({ ancoragemId: a.id, seq: a.seq, coerente: false, motivo: 'O registro foi alterado depois de ancorado.' })
    else {
      const digest = hex(await sha256(new TextEncoder().encode(textoDoSelo(a.seq, a.selo))))
      resultados.push(digest === a.digest
        ? { ancoragemId: a.id, seq: a.seq, coerente: true }
        : { ancoragemId: a.id, seq: a.seq, coerente: false, motivo: 'O digest guardado não confere com o selo.' })
    }
  }
  return resultados
}
