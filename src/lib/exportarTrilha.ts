// Passo 17 do plano: exportação da Trilha de auditoria por período em PDF, com SHA-256 do arquivo
// e selo OpenTimestamps (.ots) baixável. O PDF lista cada registro do período com hash e elo anterior,
// o resultado da verificação da cadeia inteira, e o hash do próprio PDF entra no selo.
import { supabase, supabaseConfigurado } from '@/lib/supabase'
import { listarTrilha, verificarTrilha, registrarEvento, type EventoTrilha } from '@/lib/trilha'
import { gerarPdfTexto, quebrar } from '@/lib/pdfSimples'

const MAGIC = new Uint8Array([0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94])
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
const CALENDARIOS = ['https://alice.btc.calendar.opentimestamps.org', 'https://bob.btc.calendar.opentimestamps.org', 'https://finney.calendar.eternitywall.com']

export interface ExportacaoTrilha {
  pdf: Uint8Array<ArrayBuffer>
  sha256: string
  ots: Uint8Array<ArrayBuffer> | null
  calendario: string | null
  total: number
  nomeBase: string
}

const dataHora = (iso: string) => new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })

export async function provaOts(digestHex: string): Promise<{ prova: Uint8Array; calendario: string } | null> {
  const digest = Uint8Array.from(digestHex.match(/../g)!.map(h => parseInt(h, 16)))
  for (const cal of CALENDARIOS) {
    try {
      const r = await fetch(`${cal}/digest`, { method: 'POST', headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded' }, body: digest as BodyInit })
      if (r.ok) return { prova: new Uint8Array(await r.arrayBuffer()), calendario: cal }
    } catch { /* tenta o próximo */ }
  }
  // Reserva: o servidor fala com os calendários (redes que bloqueiam o navegador).
  if (supabaseConfigurado) {
    const { data } = await supabase.functions.invoke('ancorar-hash', { body: { digest: digestHex } })
    if (data?.prova_b64 && data?.calendario) return { prova: Uint8Array.from(atob(data.prova_b64), c => c.charCodeAt(0)), calendario: String(data.calendario) }
  }
  return null
}

/** Monta um arquivo .ots completo (cabeçalho + digest + prova do calendário) para um SHA-256 em hex. */
export async function selarDigest(sha256Hex: string): Promise<{ ots: Uint8Array<ArrayBuffer>; calendario: string } | null> {
  const prova = await provaOts(sha256Hex)
  if (!prova) return null
  const ots = new Uint8Array(new ArrayBuffer(MAGIC.length + 2 + 32 + prova.prova.length))
  ots.set(MAGIC, 0); ots[MAGIC.length] = 0x01; ots[MAGIC.length + 1] = 0x08
  ots.set(Uint8Array.from(sha256Hex.match(/../g)!.map(h => parseInt(h, 16))), MAGIC.length + 2)
  ots.set(prova.prova, MAGIC.length + 2 + 32)
  return { ots, calendario: prova.calendario }
}

export async function exportarTrilhaPeriodo(de: string, ate: string, rotuloEscritorio = 'GMenezes Advogados Associados'): Promise<ExportacaoTrilha> {
  const [todos, verificacao] = await Promise.all([listarTrilha(), verificarTrilha()])
  const ini = `${de}T00:00:00`, fim = `${ate}T23:59:59.999`
  const eventos: EventoTrilha[] = todos.filter(e => e.em >= new Date(ini).toISOString() && e.em <= new Date(fim).toISOString())
  const geradoEm = new Date()
  const linhas: Parameters<typeof gerarPdfTexto>[1] = [
    { texto: rotuloEscritorio, tamanho: 16, negrito: true, cor: [0.08, 0.13, 0.24] },
    { texto: `Trilha de auditoria - exportação do período ${de.split('-').reverse().join('/')} a ${ate.split('-').reverse().join('/')}`, tamanho: 11, negrito: true },
    { texto: `Gerado em ${geradoEm.toLocaleString('pt-BR')} · ${eventos.length} registro(s) no período · ${todos.length} na cadeia inteira`, tamanho: 8, cor: [0.4, 0.4, 0.4] },
    { texto: verificacao.integra ? `Cadeia íntegra: ${verificacao.total} registro(s) verificado(s). Selo atual (hash do último registro): ${verificacao.selo}` : `ATENÇÃO: cadeia comprometida a partir do registro nº ${verificacao.quebraEm}.`, tamanho: 8, cor: verificacao.integra ? [0.1, 0.4, 0.2] : [0.7, 0.1, 0.1] },
    { texto: 'Cada registro traz o SHA-256 próprio e o do registro anterior; qualquer alteração quebra a sequência. O SHA-256 deste PDF é enviado ao OpenTimestamps (Bitcoin) e a prova vai no arquivo .ots que acompanha este documento.', tamanho: 8, cor: [0.4, 0.4, 0.4] },
    { texto: ' ', tamanho: 6 },
  ]
  linhas.splice(4, 1, ...quebrar(linhas[4].texto, 8).map(t => ({ texto: t, tamanho: 8, cor: [0.4, 0.4, 0.4] as [number, number, number] })))
  for (const e of eventos) {
    linhas.push({ texto: `nº ${e.seq} · ${dataHora(e.em)} · ${e.tipo} · entidade ${e.entidade || '-'}`, tamanho: 9, negrito: true })
    for (const t of quebrar(e.resumo, 8)) linhas.push({ texto: t, tamanho: 8, x: 52 })
    linhas.push({ texto: `hash ${e.hash}`, tamanho: 7, x: 52, cor: [0.35, 0.35, 0.35] })
    linhas.push({ texto: `anterior ${e.hashAnterior}`, tamanho: 7, x: 52, cor: [0.35, 0.35, 0.35] })
    linhas.push({ texto: ' ', tamanho: 4 })
  }
  if (!eventos.length) linhas.push({ texto: 'Nenhum registro no período.', tamanho: 9 })
  linhas.push({ texto: ' ', tamanho: 6 }, { texto: 'Desenvolvido pelo Instituto THEYE. Conferência: calcule o SHA-256 deste arquivo e verifique o .ots em opentimestamps.org.', tamanho: 7, cor: [0.4, 0.4, 0.4] })

  const pdf = gerarPdfTexto(`Trilha de auditoria ${de} a ${ate}`, linhas)
  const sha256 = hex(await crypto.subtle.digest('SHA-256', pdf))
  const prova = await provaOts(sha256)
  let ots: Uint8Array<ArrayBuffer> | null = null
  if (prova) {
    ots = new Uint8Array(new ArrayBuffer(MAGIC.length + 2 + 32 + prova.prova.length))
    ots.set(MAGIC, 0); ots[MAGIC.length] = 0x01; ots[MAGIC.length + 1] = 0x08
    ots.set(Uint8Array.from(sha256.match(/../g)!.map(h => parseInt(h, 16))), MAGIC.length + 2)
    ots.set(prova.prova, MAGIC.length + 2 + 32)
  }
  await registrarEvento({ tipo: 'trilha_ancorada', entidade: `exportacao-${de}-${ate}`, resumo: `Trilha exportada em PDF (${eventos.length} registro(s), ${de} a ${ate}); SHA-256 ${sha256}${prova ? `; selo OpenTimestamps via ${prova.calendario}` : '; selo não obtido'}` })
  return { pdf, sha256, ots, calendario: prova?.calendario ?? null, total: eventos.length, nomeBase: `trilha-${de}-a-${ate}` }
}
