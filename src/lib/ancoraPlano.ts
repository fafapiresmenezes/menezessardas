/**
 * Âncora pública do trilho do PLANO MESTRE (passos C13 e T2).
 *
 * O trilho do plano é uma corrente de hashes (predicao/trilho-v4-andamento.jsonl, servido em
 * /lastro). Ancorar = provar, fora do Instituto, a data em que aquele topo já existia. Fazemos do
 * jeito do OpenTimestamps: escrevemos um "selo" (um textinho com o número de registros e o código
 * do topo), tiramos o SHA-256 desse selo e mandamos esse SHA-256 a um calendário público, que o
 * inclui numa transação do Bitcoin. Guardamos a prova e montamos o arquivo .ots. Qualquer pessoa
 * confere em opentimestamps.org com o selo + o .ots, sem depender desta plataforma.
 *
 * Só um hash sai daqui: nenhum dado de pessoa. O envio para fora foi autorizado por M em 14/11/2026.
 *
 * O carimbo roda na sessão de quem está vendo (administração): quando o navegador não alcança os
 * calendários, a função de servidor `ancorar-hash` fala com eles. Nada de senha nem segredo passa
 * por aqui.
 */
import { supabase, supabaseConfigurado } from './supabase'

export const CALENDARIOS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

const CHAVE = 'theye-ancora-plano-v1'

export interface AncoraPlano {
  /** Nº de registros da corrente quando foi carimbada. */
  registros: number
  /** Código do topo da corrente (o que ficou provado). */
  topo: string
  /** O texto do selo cujo SHA-256 foi enviado ao calendário. */
  selo: string
  /** SHA-256 do selo, em hex. */
  digest: string
  calendario: string
  /** Resposta do calendário (base64), parte final do arquivo .ots. */
  provaB64: string
  em: string
}

export function textoDoSeloPlano(registros: number, topo: string): string {
  return `Instituto THEYE — selo do trilho do plano mestre\nregistros: ${registros}\ntopo: ${topo}\n`
}

async function sha256(bytes: Uint8Array): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes as BufferSource))
}
const hex = (b: Uint8Array) => Array.from(b).map(x => x.toString(16).padStart(2, '0')).join('')
const paraB64 = (b: Uint8Array) => btoa(String.fromCharCode(...b))
const deB64 = (s: string) => Uint8Array.from(atob(s), c => c.charCodeAt(0))

export function ultimaAncoraPlano(): AncoraPlano | null {
  try {
    const bruto = localStorage.getItem(CHAVE)
    return bruto ? (JSON.parse(bruto) as AncoraPlano) : null
  } catch {
    return null
  }
}
function guardar(a: AncoraPlano) {
  try { localStorage.setItem(CHAVE, JSON.stringify(a)) } catch { /* sem armazenamento, segue a sessão */ }
}

/**
 * Carimba o topo da corrente agora. Tenta os calendários direto do navegador; se não alcançar,
 * usa a função de servidor `ancorar-hash` (que fala com os mesmos calendários). Lança erro claro
 * se nada responder.
 */
export async function carimbarPlano(registros: number, topo: string): Promise<AncoraPlano> {
  if (!/^[0-9a-f]{64}$/.test(topo)) throw new Error('O código do topo da corrente está num formato inesperado.')
  const selo = textoDoSeloPlano(registros, topo)
  const digestBytes = await sha256(new TextEncoder().encode(selo))
  const digest = hex(digestBytes)

  let ultimoErro = ''
  for (const cal of CALENDARIOS) {
    try {
      const resp = await fetch(`${cal}/digest`, {
        method: 'POST',
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: digestBytes as BodyInit,
      })
      if (!resp.ok) { ultimoErro = `${cal} respondeu ${resp.status}`; continue }
      const prova = new Uint8Array(await resp.arrayBuffer())
      const a: AncoraPlano = { registros, topo, selo, digest, calendario: cal, provaB64: paraB64(prova), em: new Date().toISOString() }
      guardar(a)
      return a
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e)
    }
  }

  // Reserva: o servidor fala com os calendários quando o navegador não alcança (rede corporativa,
  // bloqueio de extensão). Precisa de sessão válida (a função confere o acesso).
  if (supabaseConfigurado && typeof supabase.functions?.invoke === 'function') {
    try {
      const { data, error } = await supabase.functions.invoke('ancorar-hash', { body: { digest } })
      const r = data as { calendario?: string; provaB64?: string; erro?: string } | null
      if (!error && r?.provaB64 && r.calendario) {
        const a: AncoraPlano = { registros, topo, selo, digest, calendario: r.calendario, provaB64: r.provaB64, em: new Date().toISOString() }
        guardar(a)
        return a
      }
      ultimoErro = r?.erro || (error instanceof Error ? error.message : ultimoErro)
    } catch (e) {
      ultimoErro = e instanceof Error ? e.message : String(e)
    }
  }
  throw new Error(`Não foi possível falar com os calendários públicos agora (${ultimoErro}). Tente de novo mais tarde.`)
}

/** Monta o arquivo .ots padrão do OpenTimestamps: cabeçalho + SHA-256 do selo + árvore do calendário. */
export function montarOtsPlano(a: AncoraPlano): Uint8Array {
  const magic = new Uint8Array([
    0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00,
    0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94,
  ])
  const digest = Uint8Array.from(a.digest.match(/../g)!.map(h => parseInt(h, 16)))
  const prova = deB64(a.provaB64)
  const saida = new Uint8Array(magic.length + 2 + digest.length + prova.length)
  saida.set(magic, 0)
  saida[magic.length] = 0x01 // versão
  saida[magic.length + 1] = 0x08 // operação SHA-256
  saida.set(digest, magic.length + 2)
  saida.set(prova, magic.length + 2 + digest.length)
  return saida
}

export function baixarArquivo(nome: string, conteudo: BlobPart, tipo = 'application/octet-stream') {
  const url = URL.createObjectURL(new Blob([conteudo], { type: tipo }))
  const el = document.createElement('a')
  el.href = url
  el.download = nome
  el.click()
  URL.revokeObjectURL(url)
}
