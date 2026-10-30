// Selo blockchain dos documentos: calcula o SHA-256 de cada arquivo guardado, junta os novos num
// manifesto e ancora o hash do manifesto no Bitcoin pelo OpenTimestamps (gratuito).
// Modos: { selar: true } (cron diário ou botão do admin), { auditar: { tabela, id } } (confere na hora)
// e { verificar: seloId } (Passo 25: consulta os calendários e devolve bloco e data no Bitcoin).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const CALENDARIOS = ['https://alice.btc.calendar.opentimestamps.org', 'https://bob.btc.calendar.opentimestamps.org', 'https://finney.calendar.eternitywall.com']
const MAGIA = new Uint8Array([0x00, 0x4f, 0x70, 0x65, 0x6e, 0x54, 0x69, 0x6d, 0x65, 0x73, 0x74, 0x61, 0x6d, 0x70, 0x73, 0x00, 0x00, 0x50, 0x72, 0x6f, 0x6f, 0x66, 0x00, 0xbf, 0x89, 0xe2, 0xe8, 0x84, 0xe8, 0x92, 0x94])
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
const sha = async (d: ArrayBuffer | Uint8Array) => new Uint8Array(await crypto.subtle.digest('SHA-256', d))
const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u))

// Quem chama: usuário logado (o banco aplica as regras de acesso) ou o cron com o segredo.
async function quem(req: Request): Promise<{ usuario: string | null; cron: boolean; token: string }> {
  const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
  let usuario: string | null = null
  try {
    const p = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (p?.role === 'authenticated') usuario = String(p.sub)
  } catch { /* sem usuário */ }
  const enviado = req.headers.get('x-cron-secret')
  let cron = false
  if (enviado) {
    const { data } = await sb().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
    cron = !!data?.valor && data.valor === enviado
  }
  return { usuario, cron, token }
}

async function hashDoArquivo(caminho: string): Promise<string | null> {
  const { data } = await sb().storage.from('documentos').download(caminho)
  return data ? hex(await sha(await data.arrayBuffer())) : null
}

async function selar() {
  const s = sb()
  // 1) Calcula o hash dos arquivos que ainda não têm (até 60 por vez).
  for (const [tabela, coluna] of [['documentos', 'caminho_storage'], ['contratos', 'caminho_arquivo']] as const) {
    const { data } = await s.from(tabela).select(`id,${coluna}`).is('sha256', null).not(coluna, 'is', null).neq(coluna, '').limit(60)
    for (const r of (data ?? []) as Record<string, string>[]) {
      const h = await hashDoArquivo(r[coluna])
      if (h) await s.from(tabela).update({ sha256: h }).eq('id', r.id)
    }
  }
  // 2) Junta os hashes ainda sem selo num manifesto.
  const linhas: string[] = []
  const ids: Record<string, string[]> = { documentos: [], contratos: [] }
  for (const tabela of ['documentos', 'contratos'] as const) {
    const { data } = await s.from(tabela).select('id,sha256').not('sha256', 'is', null).is('selo_id', null).limit(500)
    for (const r of data ?? []) { linhas.push(`${r.sha256}  ${tabela}/${r.id}`); ids[tabela].push(r.id) }
  }
  if (!linhas.length) return { selados: 0, mensagem: 'Nada novo para selar.' }
  linhas.sort()
  const manifesto = linhas.join('\n') + '\n'
  const raiz = await sha(new TextEncoder().encode(manifesto))
  // 3) Envia ao OpenTimestamps e monta o arquivo .ots (cada calendário é um ramo da prova).
  const respostas: Uint8Array[] = []
  const usados: string[] = []
  for (const c of CALENDARIOS) {
    const r = await fetch(`${c}/digest`, { method: 'POST', body: raiz, headers: { Accept: 'application/vnd.opentimestamps.v1' }, signal: AbortSignal.timeout(15000) }).catch(() => null)
    if (r?.ok) { respostas.push(new Uint8Array(await r.arrayBuffer())); usados.push(c) }
  }
  if (!respostas.length) return { selados: 0, erro: 'Os calendários do OpenTimestamps não responderam; tento de novo no próximo ciclo.' }
  const partes: Uint8Array[] = [MAGIA, new Uint8Array([0x01, 0x08]), raiz]
  respostas.forEach((r, i) => { if (i < respostas.length - 1) partes.push(new Uint8Array([0xff])); partes.push(r) })
  const ots = new Uint8Array(partes.reduce((n, p) => n + p.length, 0))
  let pos = 0; for (const p of partes) { ots.set(p, pos); pos += p.length }
  const { data: selo, error } = await s.from('selos_blockchain').insert({ raiz_merkle: hex(raiz), folhas: linhas, prova_ots: b64(ots), calendarios: usados }).select('id').single()
  if (error) return { selados: 0, erro: error.message }
  for (const tabela of ['documentos', 'contratos'] as const) if (ids[tabela].length) await s.from(tabela).update({ selo_id: selo.id }).in('id', ids[tabela])
  return { selados: linhas.length, selo: selo.id, raiz: hex(raiz), calendarios: usados }
}

// ---- Passo 25: leitura do arquivo .ots e consulta de confirmação no Bitcoin ----
const TAG_PENDENTE = '83dfe30d2ef90c8e', TAG_BITCOIN = '0588960d73d71901'
type Atest = { tipo: 'pendente' | 'bitcoin' | 'outra'; uri?: string; altura?: number; msg: Uint8Array }
class Leitor {
  pos = 0
  constructor(public b: Uint8Array) {}
  byte() { if (this.pos >= this.b.length) throw new Error('fim do arquivo'); return this.b[this.pos++] }
  varint() { let v = 0, shift = 0; for (;;) { const x = this.byte(); v += (x & 0x7f) * 2 ** shift; if (!(x & 0x80)) return v; shift += 7 } }
  bytes(n: number) { const r = this.b.slice(this.pos, this.pos + n); this.pos += n; return r }
  varbytes() { return this.bytes(this.varint()) }
  fim() { return this.pos >= this.b.length }
}
async function aplicarOp(op: number, msg: Uint8Array, l: Leitor): Promise<Uint8Array> {
  const cat = (a: Uint8Array, b: Uint8Array) => { const r = new Uint8Array(a.length + b.length); r.set(a); r.set(b, a.length); return r }
  switch (op) {
    case 0xf0: return cat(msg, l.varbytes())
    case 0xf1: return cat(l.varbytes(), msg)
    case 0xf2: return msg.slice().reverse()
    case 0xf3: return new TextEncoder().encode(hex(msg))
    case 0x08: return sha(msg)
    case 0x02: return new Uint8Array(await crypto.subtle.digest('SHA-1', msg))
    default: throw new Error(`operação ${op.toString(16)} não suportada`)
  }
}
// Percorre a árvore do carimbo a partir de msg e junta as atestações encontradas.
async function lerCarimbo(l: Leitor, msg: Uint8Array, saida: Atest[], prof = 0): Promise<void> {
  if (prof > 64) throw new Error('arquivo muito profundo')
  for (;;) {
    const t = l.byte()
    if (t === 0xff) { const p = l.pos; await lerCarimbo(l, msg, saida, prof + 1); if (l.pos === p) throw new Error('laço'); continue }
    if (t === 0x00) {
      const tag = hex(l.bytes(8)); const carga = new Leitor(l.varbytes())
      if (tag === TAG_PENDENTE) saida.push({ tipo: 'pendente', uri: new TextDecoder().decode(carga.varbytes()), msg })
      else if (tag === TAG_BITCOIN) saida.push({ tipo: 'bitcoin', altura: carga.varint(), msg })
      else saida.push({ tipo: 'outra', msg })
      return
    }
    msg = await aplicarOp(t, msg, l)
  }
}
async function lerOts(ots: Uint8Array): Promise<{ digest: string; atestacoes: Atest[] }> {
  const l = new Leitor(ots)
  for (let i = 0; i < MAGIA.length; i++) if (l.byte() !== MAGIA[i]) throw new Error('não é um arquivo .ots')
  l.varint() // versão
  if (l.byte() !== 0x08) throw new Error('digest inicial não é SHA-256')
  const digest = l.bytes(32)
  const atestacoes: Atest[] = []
  await lerCarimbo(l, digest, atestacoes)
  return { digest: hex(digest), atestacoes }
}
async function dataDoBloco(altura: number): Promise<{ hash: string; data: string } | null> {
  for (const base of ['https://blockstream.info/api', 'https://mempool.space/api']) {
    try {
      const h = await (await fetch(`${base}/block-height/${altura}`, { signal: AbortSignal.timeout(12000) })).text()
      if (!/^[0-9a-f]{64}$/.test(h)) continue
      const b = await (await fetch(`${base}/block/${h}`, { signal: AbortSignal.timeout(12000) })).json()
      if (b?.timestamp) return { hash: h, data: new Date(b.timestamp * 1000).toISOString() }
    } catch { /* tenta o próximo */ }
  }
  return null
}
async function verificarSelo(seloId: number) {
  const s = sb()
  const { data: selo } = await s.from('selos_blockchain').select('id,criado_em,raiz_merkle,prova_ots,calendarios,situacao,altura_bitcoin,bloco_hash,data_bloco').eq('id', seloId).maybeSingle()
  if (!selo) return { erro: 'Selo não encontrado.' }
  const ots = Uint8Array.from(atob(selo.prova_ots), c => c.charCodeAt(0))
  const { digest, atestacoes } = await lerOts(ots)
  if (digest !== selo.raiz_merkle) return { erro: 'O arquivo .ots não corresponde ao manifesto registrado.' }
  const consultas: { calendario: string; situacao: string }[] = []
  let bitcoin: { altura: number; calendario: string } | null = atestacoes.find(a => a.tipo === 'bitcoin') ? { altura: atestacoes.find(a => a.tipo === 'bitcoin')!.altura!, calendario: 'arquivo' } : null
  for (const a of atestacoes.filter(x => x.tipo === 'pendente')) {
    if (bitcoin) break
    try {
      const r = await fetch(`${a.uri}/timestamp/${hex(a.msg)}`, { headers: { Accept: 'application/vnd.opentimestamps.v1' }, signal: AbortSignal.timeout(15000) })
      if (!r.ok) { consultas.push({ calendario: a.uri!, situacao: r.status === 404 ? 'ainda pendente' : `HTTP ${r.status}` }); continue }
      const cont: Atest[] = []
      await lerCarimbo(new Leitor(new Uint8Array(await r.arrayBuffer())), a.msg, cont)
      const b = cont.find(x => x.tipo === 'bitcoin')
      consultas.push({ calendario: a.uri!, situacao: b ? `confirmado no bloco ${b.altura}` : 'ainda pendente' })
      if (b) bitcoin = { altura: b.altura!, calendario: a.uri! }
    } catch (e) { consultas.push({ calendario: a.uri!, situacao: String(e).slice(0, 80) }) }
  }
  if (!bitcoin) return { confirmado: false, selo_id: selo.id, criado_em: selo.criado_em, raiz: selo.raiz_merkle, consultas, mensagem: 'Ainda não incluído em um bloco do Bitcoin. Normalmente leva de 1 a 24 horas após o selo.' }
  const bloco = await dataDoBloco(bitcoin.altura)
  await s.from('selos_blockchain').update({ situacao: 'confirmado', altura_bitcoin: bitcoin.altura, bloco_hash: bloco?.hash ?? null, data_bloco: bloco?.data ?? null, confirmado_em: new Date().toISOString() }).eq('id', selo.id)
  return { confirmado: true, selo_id: selo.id, criado_em: selo.criado_em, raiz: selo.raiz_merkle, altura: bitcoin.altura, calendario: bitcoin.calendario, bloco_hash: bloco?.hash ?? null, data_bloco: bloco?.data ?? null, consultas }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { usuario, cron, token } = await quem(req)
  if (!usuario && !cron) return json({ erro: 'Entre na plataforma.' }, 401)
  const corpo = await req.json().catch(() => ({}))

  if (corpo.selar) return json(await selar())
  if (corpo.verificar && usuario) { try { return json(await verificarSelo(Number(corpo.verificar))) } catch (e) { return json({ erro: `Não foi possível ler a prova: ${String(e).slice(0, 120)}` }, 500) } }

  if (corpo.auditar && usuario) {
    const { tabela, id } = corpo.auditar as { tabela: string; id: string }
    if (!['documentos', 'contratos'].includes(tabela)) return json({ erro: 'Tabela inválida.' }, 400)
    // Lê com a sessão do usuário: se ele não tem acesso ao imóvel, não vê o registro.
    const doUsuario = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: `Bearer ${token}` } } })
    const coluna = tabela === 'documentos' ? 'caminho_storage' : 'caminho_arquivo'
    const { data: r } = await doUsuario.from(tabela).select(`id,${coluna},sha256,selo_id`).eq('id', id).maybeSingle()
    if (!r) return json({ erro: 'Registro não encontrado ou sem acesso.' }, 404)
    const reg = r as Record<string, string | number | null>
    if (!reg[coluna]) return json({ erro: 'Este registro não tem arquivo.' }, 400)
    const atual = await hashDoArquivo(String(reg[coluna]))
    let selo = null
    if (reg.selo_id) {
      const { data } = await sb().from('selos_blockchain').select('id,criado_em,raiz_merkle,calendarios,situacao,prova_ots,folhas').eq('id', reg.selo_id).single()
      if (data) selo = { ...data, manifesto: (data.folhas as string[]).join('\n') + '\n', folhas: undefined }
    }
    return json({
      integro: !!atual && atual === reg.sha256,
      hashRegistrado: reg.sha256,
      hashAtual: atual,
      selo,
    })
  }
  return json({ erro: 'Pedido inválido.' }, 400)
})
