// Águas, fase 2: chuva, nível e vazão dos rios, pela telemetria aberta da ANA (19/11/2026).
//
// FONTE: http://telemetriaws1.ana.gov.br/ServiceANA.asmx (aberta, sem login). O HidroWeb novo
// (www.ana.gov.br/hidrowebservice) pede login de pessoa física, então não é usado aqui.
//   ListaEstacoesTelemetricas  -> cadastro (~5.500 estações, com bacia, rio, município e coordenada)
//   DadosHidrometeorologicos   -> leituras de 15 em 15 minutos: Chuva (mm), Nivel (cm), Vazao (m3/s)
//
// O QUE GRAVA: um resumo por estação e por DIA FECHADO (o dia de hoje fica de fora, porque ainda
// está mudando): chuva somada, nível médio, vazão média, com quantas leituras entraram.
//   ocorrido_em  = o dia da leitura (fuso de Brasília)
//   observado_em = a hora em que esta função rodou
// A ANA corrige leitura antiga: o resumo muda, o hash muda, entra uma linha nova (a antiga fica).
//
// GRAFO: estação = lugar 'ponto' (com coordenada); bacia = entidade 'bacia'; rio = entidade
// 'corpo_dagua'; aresta rio -pertence_a-> bacia; cada evento ligado ao rio (objeto) e à bacia
// (envolvido). Nada de previsão: só medição.
//
// RODÍZIO: são milhares de estações; cada rodada pega `limite` delas, escolhidas pelo dia do ano,
// de modo que em alguns dias todas passam. `so` força estações específicas.
//
// GUARDA: x-cron-secret igual a ana-agua. verify_jwt=false (o agendador não manda JWT).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; dados publicos de agua)' }
const BASE = 'http://telemetriaws1.ana.gov.br/ServiceANA.asmx'
export const FONTE = 'ana_telemetria'
export const FONTE_TEL = {
  codigo: FONTE,
  nome: 'ANA — Telemetria hidrometeorológica (rede hidrometeorológica nacional)',
  url: 'http://telemetriaws1.ana.gov.br/ServiceANA.asmx',
  licenca: 'Dados abertos do governo federal (Lei 12.527/2011 e Decreto 8.777/2016): uso livre, inclusive comercial, com citação da fonte',
  uso_comercial: true,
  observacao: 'Leituras de 15 em 15 minutos de chuva, nível e vazão. Guardamos um resumo por dia fechado e por estação; leitura revisada pela ANA entra como linha nova.',
}

// --- Leitura do XML -----------------------------------------------------------------------------
const texto = (s: string) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim()

export function blocos(xml: string, tag: string): Record<string, string>[] {
  const fora: Record<string, string>[] = []
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)</${tag}>`, 'g')
  for (const b of xml.matchAll(re)) {
    const l: Record<string, string> = {}
    for (const c of b[1].matchAll(/<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) l[c[1]] = texto(c[2])
    fora.push(l)
  }
  return fora
}

const num = (v: string | undefined): number | null => {
  if (v === undefined || v.trim() === '') return null
  const n = Number(v.trim().replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

export interface Estacao {
  codigo: string; nome: string; bacia: string | null; subBacia: string | null; rio: string | null
  municipio: string | null; uf: string | null; latitude: number | null; longitude: number | null
}

export function lerEstacoes(xml: string): Estacao[] {
  return blocos(xml, 'Table').filter(l => l.CodEstacao && l.NomeEstacao && (l.StatusEstacao ?? 'Ativo') === 'Ativo').map(l => {
    const mu = (l['Municipio-UF'] ?? '').match(/^(.*)-([A-Z]{2})$/)
    const lat = num(l.Latitude), lon = num(l.Longitude)
    return {
      codigo: l.CodEstacao, nome: l.NomeEstacao, bacia: l.Bacia || null, subBacia: l.SubBacia || null,
      rio: l.NomeRio || null, municipio: mu ? mu[1].trim() : null, uf: mu ? mu[2] : null,
      latitude: lat !== null && Math.abs(lat) <= 90 ? lat : null,
      longitude: lon !== null && Math.abs(lon) <= 180 ? lon : null,
    }
  })
}

export interface Dia { dia: string; chuva_mm: number | null; nivel_cm: number | null; vazao_m3s: number | null; leituras: number }

/** Leituras de 15 min viram um resumo por dia. `hoje` (aaaa-mm-dd) fica de fora: o dia não fechou. */
export function resumirDias(xml: string, hoje: string): Dia[] {
  const porDia = new Map<string, { chuva: number[]; nivel: number[]; vazao: number[]; n: number }>()
  for (const l of blocos(xml, 'DadosHidrometereologicos')) {
    const d = (l.DataHora ?? '').slice(0, 10)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d) || d >= hoje) continue
    const a = porDia.get(d) ?? { chuva: [], nivel: [], vazao: [], n: 0 }
    const c = num(l.Chuva), n = num(l.Nivel), v = num(l.Vazao)
    if (c !== null) a.chuva.push(c)
    if (n !== null) a.nivel.push(n)
    if (v !== null) a.vazao.push(v)
    a.n++
    porDia.set(d, a)
  }
  const media = (x: number[]) => x.length ? Math.round((x.reduce((s, y) => s + y, 0) / x.length) * 100) / 100 : null
  const soma = (x: number[]) => x.length ? Math.round(x.reduce((s, y) => s + y, 0) * 100) / 100 : null
  return [...porDia.entries()].sort().map(([dia, a]) => ({ dia, chuva_mm: soma(a.chuva), nivel_cm: media(a.nivel), vazao_m3s: media(a.vazao), leituras: a.n }))
}

/** Quais estações entram hoje: rodízio pelo dia do ano. */
export function escolher(estacoes: Estacao[], limite: number, diaDoAno: number): Estacao[] {
  const ord = [...estacoes].sort((a, b) => a.codigo < b.codigo ? -1 : 1)
  if (ord.length <= limite) return ord
  // Salto em vez de bloco: o código da ANA segue a bacia, então um bloco seguido cai todo numa
  // região (19/11 saíram 51 estações só de SP e MS). Pegando uma a cada `voltas`, cada dia cobre o país.
  const voltas = Math.ceil(ord.length / limite)
  const passo = diaDoAno % voltas
  return ord.filter((_, i) => i % voltas === passo).slice(0, limite)
}

// --- Hash (mesma receita de src/lib/predicao/ontologia.ts e de ana-agua) ------------------------
type Json = string | number | boolean | null | Json[] | { [k: string]: Json }
export function jsonCanonico(v: Json | undefined): string {
  if (v === undefined) return ''
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(jsonCanonico).join(',') + ']'
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + jsonCanonico((v as Record<string, Json>)[k])).join(',') + '}'
}
const comoTexto = (v: unknown): string =>
  v === null || v === undefined ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : jsonCanonico(v as Json)
export const canonizar = (c: Record<string, unknown>) => Object.keys(c).sort().map(k => `${k}=${comoTexto(c[k])}`).join('\n')
export async function hashConteudo(c: Record<string, unknown>): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonizar(c)))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
export const camposHash = {
  entidade: (e: Record<string, unknown>) => ({ tipo: e.tipo, nome: e.nome, chave_natural: e.chave_natural, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, fonte: e.fonte }),
  lugar: (l: Record<string, unknown>) => ({ tipo: l.tipo, nome: l.nome, uf: l.uf ?? null, codigo_ibge: l.codigo_ibge ?? null, latitude: l.latitude ?? null, longitude: l.longitude ?? null, geometria: l.geometria ?? null, identificadores: l.identificadores ?? {}, fonte: l.fonte }),
  evento: (v: Record<string, unknown>) => ({ tipo: v.tipo, subtipo: v.subtipo ?? null, titulo: v.titulo ?? null, ocorrido_em: v.ocorrido_em, lugar_id: v.lugar_id ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null, valor: v.valor ?? null, unidade: v.unidade ?? null, bruto: v.bruto ?? {}, fonte: v.fonte }),
  aresta: (a: Record<string, unknown>) => ({ tipo: a.tipo, origem_id: a.origem_id, destino_id: a.destino_id, fonte: a.fonte }),
}

// --- Banco --------------------------------------------------------------------------------------
type Linha = Record<string, unknown>
export interface Banco {
  q<T = Linha>(sql: string, params?: unknown[]): Promise<T[]>
  fechar(): Promise<void>
}

export async function bancoPostgres(): Promise<Banco> {
  const { Client } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
  const c = new Client(Deno.env.get('SUPABASE_DB_URL')!)
  await c.connect()
  return {
    q: async <T,>(sql: string, params: unknown[] = []) => (await c.queryObject<T>({ text: sql, args: params })).rows,
    fechar: () => c.end(),
  }
}

const JSONB = new Set(['identificadores', 'atributos', 'bruto'])
function valores(cols: string[], linhas: Linha[]) {
  const params: unknown[] = []
  const sql = linhas.map(l => '(' + cols.map(c => {
    const v = l[c] ?? null
    params.push(JSONB.has(c) && v !== null ? JSON.stringify(v) : v)
    return `$${params.length}${JSONB.has(c) ? '::jsonb' : ''}`
  }).join(',') + ')').join(',')
  return { sql, params }
}

/** Grava entidades (por chave natural) e devolve chave -> id, inclusive das que já existiam. */
async function entidades(db: Banco, ls: Linha[]): Promise<Map<string, string>> {
  const mapa = new Map<string, string>()
  if (!ls.length) return mapa
  const unicas = [...new Map(ls.map(l => [String(l.chave_natural), l])).values()]
  const cols = ['tipo', 'nome', 'chave_natural', 'identificadores', 'atributos', 'fonte', 'conteudo_hash']
  for (let i = 0; i < unicas.length; i += 200) {
    const v = valores(cols, unicas.slice(i, i + 200))
    await db.q(`insert into instituto.entidades (${cols.join(',')}) values ${v.sql} on conflict (tipo, chave_natural) do nothing`, v.params)
  }
  for (const r of await db.q<{ id: string; chave_natural: string }>(
    `select id::text, chave_natural from instituto.entidades where chave_natural = any($1::text[])`, [unicas.map(l => String(l.chave_natural))])) mapa.set(r.chave_natural, r.id)
  return mapa
}

async function porHash(db: Banco, tabela: string, hashes: string[]): Promise<Map<string, string>> {
  if (!hashes.length) return new Map()
  const r = await db.q<{ id: string; conteudo_hash: string }>(`select id::text, conteudo_hash from instituto.${tabela} where fonte = $1 and conteudo_hash = any($2::text[])`, [FONTE, hashes])
  return new Map(r.map(x => [x.conteudo_hash, x.id]))
}

// --- Rede ---------------------------------------------------------------------------------------
async function pegar(url: string): Promise<{ xml: string } | { erro: string }> {
  try {
    const r = await fetch(url, { headers: UA })
    const t = await r.text()
    return r.ok ? { xml: t } : { erro: `${r.status}` }
  } catch (e) { return { erro: (e as Error).message } }
}
const ddmmaaaa = (d: string) => `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}`

// --- Coleta -------------------------------------------------------------------------------------
export interface Resumo { em: string; de: string; ate: string; estacoes_no_cadastro: number; estacoes_lidas: number; estacoes_com_dado: number; dias: number; eventos_novos: number; eventos_repetidos: number; falhas: string[]; ms: number }

const GRANDEZAS = [
  { campo: 'chuva_mm', subtipo: 'chuva', unidade: 'mm', nome: 'chuva do dia' },
  { campo: 'nivel_cm', subtipo: 'nivel', unidade: 'cm', nome: 'nível médio do dia' },
  { campo: 'vazao_m3s', subtipo: 'vazao', unidade: 'm3/s', nome: 'vazão média do dia' },
] as const

export async function coletar(db: Banco, o: { agora: string; dias: number; limite: number; so?: string[] }): Promise<Resumo> {
  const t0 = Date.now()
  const falhas: string[] = []
  // "hoje" em Brasília: o dia ainda aberto, que fica de fora do resumo.
  const hoje = new Date(new Date(o.agora).getTime() - 3 * 3600000).toISOString().slice(0, 10)
  const de = new Date(new Date(hoje).getTime() - o.dias * 86400000).toISOString().slice(0, 10)
  const vazio = (f: string): Resumo => ({ em: o.agora, de, ate: hoje, estacoes_no_cadastro: 0, estacoes_lidas: 0, estacoes_com_dado: 0, dias: 0, eventos_novos: 0, eventos_repetidos: 0, falhas: [f], ms: Date.now() - t0 })

  const cad = await pegar(`${BASE}/ListaEstacoesTelemetricas?statusEstacoes=0&origem=`)
  if ('erro' in cad) return vazio(`cadastro: ${cad.erro}`)
  const todas = lerEstacoes(cad.xml)
  if (!todas.length) return vazio('cadastro veio vazio')
  const diaDoAno = Math.floor((new Date(hoje).getTime() - new Date(hoje.slice(0, 4) + '-01-01').getTime()) / 86400000)
  const lote = o.so?.length ? todas.filter(e => o.so!.includes(e.codigo)) : escolher(todas, o.limite, diaDoAno)

  await db.q(`insert into instituto.fontes (codigo, nome, url, licenca, uso_comercial, observacao) values ($1,$2,$3,$4,$5,$6)
    on conflict (codigo) do update set nome = excluded.nome, url = excluded.url, licenca = excluded.licenca, uso_comercial = excluded.uso_comercial, observacao = excluded.observacao`,
    [FONTE_TEL.codigo, FONTE_TEL.nome, FONTE_TEL.url, FONTE_TEL.licenca, FONTE_TEL.uso_comercial, FONTE_TEL.observacao])

  // Leituras, de 6 em 6 estações ao mesmo tempo.
  const leituras = new Map<string, Dia[]>()
  for (let i = 0; i < lote.length; i += 6) {
    await Promise.all(lote.slice(i, i + 6).map(async e => {
      const r = await pegar(`${BASE}/DadosHidrometeorologicos?codEstacao=${e.codigo}&dataInicio=${ddmmaaaa(de)}&dataFim=${ddmmaaaa(hoje)}`)
      if ('erro' in r) { falhas.push(`${e.codigo}: ${r.erro}`); return }
      const d = resumirDias(r.xml, hoje)
      if (d.length) leituras.set(e.codigo, d)
    }))
  }
  const comDado = lote.filter(e => leituras.has(e.codigo))

  // Bacias e rios (entidades) e a aresta rio -> bacia.
  const nomeBacia = (e: Estacao) => `Bacia ${e.bacia} (código ANA)`
  const ents: Linha[] = []
  for (const e of comDado) {
    if (e.bacia) {
      const b = { tipo: 'bacia', nome: nomeBacia(e), chave_natural: `ana-bacia-${e.bacia}`, identificadores: { ana_bacia: e.bacia }, atributos: {}, fonte: FONTE }
      ents.push({ ...b, conteudo_hash: await hashConteudo(camposHash.entidade(b)) })
    }
    if (e.rio) {
      const r = { tipo: 'corpo_dagua', nome: e.rio, chave_natural: `ana-rio-${e.bacia ?? 'x'}-${e.rio.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 120), identificadores: { ana_bacia: e.bacia }, atributos: { tipo: 'rio' }, fonte: FONTE }
      ents.push({ ...r, conteudo_hash: await hashConteudo(camposHash.entidade(r)) })
    }
  }
  const idEnt = await entidades(db, ents)
  const chaveRio = (e: Estacao) => e.rio ? `ana-rio-${e.bacia ?? 'x'}-${e.rio.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`.slice(0, 120) : null

  const arestas: Linha[] = []
  for (const e of comDado) {
    const rio = chaveRio(e), bac = e.bacia ? `ana-bacia-${e.bacia}` : null
    if (rio && bac && idEnt.get(rio) && idEnt.get(bac)) {
      const a = { tipo: 'pertence_a', origem_id: idEnt.get(rio), destino_id: idEnt.get(bac), fonte: FONTE }
      arestas.push({ ...a, atributos: {}, conteudo_hash: await hashConteudo(camposHash.aresta(a)) })
    }
  }
  const arUnicas = [...new Map(arestas.map(a => [String(a.conteudo_hash), a])).values()]
  const arJa = await porHash(db, 'arestas', arUnicas.map(a => String(a.conteudo_hash)))
  const arNovas = arUnicas.filter(a => !arJa.has(String(a.conteudo_hash)))
  if (arNovas.length) {
    const v = valores(['tipo', 'origem_id', 'destino_id', 'atributos', 'fonte', 'conteudo_hash'], arNovas)
    await db.q(`insert into instituto.arestas (tipo, origem_id, destino_id, atributos, fonte, conteudo_hash) values ${v.sql} on conflict do nothing`, v.params)
  }

  // Estações como lugares (ponto).
  const lugares = await Promise.all(comDado.filter(e => e.latitude !== null && e.longitude !== null).map(async e => {
    const l = { tipo: 'ponto', nome: e.nome, uf: e.uf, latitude: e.latitude, longitude: e.longitude, identificadores: { ana_estacao: e.codigo }, fonte: FONTE }
    return { codigo: e.codigo, linha: { ...l, conteudo_hash: await hashConteudo(camposHash.lugar(l)) } as Linha }
  }))
  const lugJa = await porHash(db, 'lugares', lugares.map(l => String(l.linha.conteudo_hash)))
  const lugNovos = lugares.filter(l => !lugJa.has(String(l.linha.conteudo_hash)))
  if (lugNovos.length) {
    const cols = ['tipo', 'nome', 'uf', 'latitude', 'longitude', 'identificadores', 'fonte', 'conteudo_hash']
    const v = valores(cols, lugNovos.map(l => l.linha))
    for (const r of await db.q<{ id: string; conteudo_hash: string }>(`insert into instituto.lugares (${cols.join(',')}) values ${v.sql} on conflict do nothing returning id::text, conteudo_hash`, v.params)) lugJa.set(r.conteudo_hash, r.id)
  }
  const lugarDe = new Map(lugares.map(l => [l.codigo, lugJa.get(String(l.linha.conteudo_hash)) ?? null]))

  // Eventos: um por estação, dia e grandeza.
  const eventos: { linha: Linha; rio: string | null; bacia: string | null }[] = []
  for (const e of comDado) {
    for (const d of leituras.get(e.codigo)!) {
      for (const g of GRANDEZAS) {
        const valor = d[g.campo]
        if (valor === null) continue
        const v = {
          tipo: 'medicao_estacao', subtipo: g.subtipo, titulo: `${e.nome}${e.rio ? ` (${e.rio})` : ''}: ${g.nome}`,
          ocorrido_em: `${d.dia}T00:00:00-03:00`, observado_em: o.agora, lugar_id: lugarDe.get(e.codigo) ?? null,
          valor, unidade: g.unidade, bruto: { estacao: e.codigo, leituras: d.leituras, municipio: e.municipio, uf: e.uf, bacia: e.bacia, sub_bacia: e.subBacia }, fonte: FONTE,
        }
        eventos.push({ linha: { ...v, conteudo_hash: await hashConteudo(camposHash.evento(v)) }, rio: chaveRio(e), bacia: e.bacia ? `ana-bacia-${e.bacia}` : null })
      }
    }
  }
  const evUnicos = [...new Map(eventos.map(x => [String(x.linha.conteudo_hash), x])).values()]
  const evJa = await porHash(db, 'eventos', evUnicos.map(x => String(x.linha.conteudo_hash)))
  const evNovos = evUnicos.filter(x => !evJa.has(String(x.linha.conteudo_hash)))
  const cols = ['tipo', 'subtipo', 'titulo', 'ocorrido_em', 'observado_em', 'lugar_id', 'valor', 'unidade', 'bruto', 'fonte', 'conteudo_hash']
  const idEv = new Map<string, string>()
  for (let i = 0; i < evNovos.length; i += 300) {
    const v = valores(cols, evNovos.slice(i, i + 300).map(x => x.linha))
    for (const r of await db.q<{ id: string; conteudo_hash: string }>(`insert into instituto.eventos (${cols.join(',')}) values ${v.sql} on conflict (fonte, conteudo_hash) do nothing returning id::text, conteudo_hash`, v.params)) idEv.set(r.conteudo_hash, r.id)
  }
  const vinc: Linha[] = []
  for (const x of evNovos) {
    const ev = idEv.get(String(x.linha.conteudo_hash))
    if (!ev) continue
    if (x.rio && idEnt.get(x.rio)) vinc.push({ evento_id: ev, entidade_id: idEnt.get(x.rio), papel: 'objeto' })
    if (x.bacia && idEnt.get(x.bacia)) vinc.push({ evento_id: ev, entidade_id: idEnt.get(x.bacia), papel: 'envolvido' })
  }
  for (let i = 0; i < vinc.length; i += 500) {
    const v = valores(['evento_id', 'entidade_id', 'papel'], vinc.slice(i, i + 500))
    await db.q(`insert into instituto.evento_entidades (evento_id, entidade_id, papel) values ${v.sql} on conflict do nothing`, v.params)
  }

  return {
    em: o.agora, de, ate: hoje, estacoes_no_cadastro: todas.length, estacoes_lidas: lote.length, estacoes_com_dado: comDado.length,
    dias: [...leituras.values()].reduce((s, d) => s + d.length, 0), eventos_novos: idEv.size, eventos_repetidos: evJa.size, falhas: falhas.slice(0, 20), ms: Date.now() - t0,
  }
}

// --- Porta --------------------------------------------------------------------------------------
async function segredoOk(req: Request): Promise<boolean> {
  const dado = req.headers.get('x-cron-secret')
  if (!dado) return false
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await s.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  const esperado = (data as { valor?: string } | null)?.valor
  return !!esperado && dado === esperado
}

export async function atender(req: Request, abrirBanco: () => Promise<Banco> = bancoPostgres): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let corpo: Record<string, unknown> = {}
  try { corpo = await req.json() } catch { corpo = {} }
  if (!await segredoOk(req)) return json({ erro: 'Sem o segredo do agendador.' }, 401)
  if (String(corpo.modo ?? 'coletar') !== 'coletar') return json({ erro: 'Use modo coletar.' }, 400)
  const db = await abrirBanco()
  try {
    return json(await coletar(db, {
      agora: new Date().toISOString(),
      dias: Math.min(Number(corpo.dias ?? 3), 30),
      limite: Math.min(Number(corpo.limite ?? 60), 300),
      so: Array.isArray(corpo.so) ? corpo.so.map(String) : undefined,
    }))
  } finally { await db.fechar() }
}

// Deno.serve passa (req, info): só o req, para o info não virar o "abrirBanco".
if (!Deno.env.get('VITEST')) Deno.serve((req) => atender(req))
