// Águas, fase 2: retratos semanais de outorgas e barragens a partir do SNIRH (ArcGIS aberto da ANA).
//
// FONTES (abertas, sem login), sempre com estatística feita no próprio servidor da ANA, para não
// baixar cadastro com nome de pessoa:
//   outorgas  SRE/OutorgasDireitodeUso/FeatureServer/0  (~54 mil outorgas federais)
//             -> contagem e volume anual por UF e finalidade, só das vigentes (vencimento depois de hoje)
//   barragens IG/SNISB/FeatureServer/0  (cadastro do SNISB)
//             -> contagem por UF, categoria de risco e dano potencial associado
// NÃO guardamos nome de requerente nem de empreendedor (podem ser pessoas físicas).
//
// Cada rodada é um RETRATO do dia: ocorrido_em = dia do retrato, observado_em = hora da coleta.
// O grafo liga cada número à entidade 'estado' da UF (papel objeto).
// GUARDA: x-cron-secret. verify_jwt=false.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; dados publicos de agua)' }
const ARC = 'https://www.snirh.gov.br/arcgis/rest/services'

export const FONTES = {
  outorgas: { codigo: 'ana_outorgas', nome: 'ANA — Outorgas federais de direito de uso (SNIRH)', url: `${ARC}/SRE/OutorgasDireitodeUso/FeatureServer/0`, observacao: 'Retrato semanal das outorgas federais vigentes, somadas por UF e finalidade. Sem nome de requerente.' },
  barragens: { codigo: 'ana_snisb', nome: 'ANA — SNISB, Sistema Nacional de Informações sobre Segurança de Barragens', url: `${ARC}/IG/SNISB/FeatureServer/0`, observacao: 'Retrato semanal das barragens cadastradas, contadas por UF, categoria de risco e dano potencial. Sem nome de empreendedor.' },
} as const
const LICENCA = 'Dados abertos do governo federal (Lei 12.527/2011 e Decreto 8.777/2016): uso livre, inclusive comercial, com citação da fonte'

/** Monta a consulta de estatística do ArcGIS (tudo codificado, o servidor da ANA recusa colchete cru). */
export function urlEstatistica(camada: string, onde: string, agrupar: string[], stats: { tipo: 'count' | 'sum'; campo: string; nome: string }[]): string {
  const p = new URLSearchParams({
    where: onde, groupByFieldsForStatistics: agrupar.join(','),
    outStatistics: JSON.stringify(stats.map(s => ({ statisticType: s.tipo, onStatisticField: s.campo, outStatisticFieldName: s.nome }))),
    f: 'json',
  })
  return `${camada}/query?${p.toString()}`
}

export type Grupo = Record<string, string | number | null>
export function lerGrupos(corpo: unknown): Grupo[] {
  const c = corpo as { features?: { attributes: Record<string, unknown> }[]; error?: { message?: string } }
  if (c?.error) throw new Error(c.error.message ?? 'erro do ArcGIS')
  return (c?.features ?? []).map(f => Object.fromEntries(Object.entries(f.attributes).map(([k, v]) => [k.toLowerCase(), v as string | number | null])))
}

// --- Hash (mesma receita de src/lib/predicao/ontologia.ts) -------------------------------------
type Json = string | number | boolean | null | Json[] | { [k: string]: Json }
export function jsonCanonico(v: Json | undefined): string {
  if (v === undefined) return ''
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(jsonCanonico).join(',') + ']'
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + jsonCanonico((v as Record<string, Json>)[k])).join(',') + '}'
}
const comoTexto = (v: unknown): string => v === null || v === undefined ? '' : typeof v === 'string' ? v : typeof v === 'number' || typeof v === 'boolean' ? String(v) : jsonCanonico(v as Json)
export const canonizar = (c: Record<string, unknown>) => Object.keys(c).sort().map(k => `${k}=${comoTexto(c[k])}`).join('\n')
export async function hashConteudo(c: Record<string, unknown>): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonizar(c)))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}
const hEnt = (e: Record<string, unknown>) => ({ tipo: e.tipo, nome: e.nome, chave_natural: e.chave_natural, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, fonte: e.fonte })
const hEv = (v: Record<string, unknown>) => ({ tipo: v.tipo, subtipo: v.subtipo ?? null, titulo: v.titulo ?? null, ocorrido_em: v.ocorrido_em, lugar_id: null, latitude: null, longitude: null, valor: v.valor ?? null, unidade: v.unidade ?? null, bruto: v.bruto ?? {}, fonte: v.fonte })

/** Os grupos viram eventos prontos para gravar (sem id), um por linha da estatística. */
export async function eventosDe(tipo: 'outorgas' | 'barragens', grupos: Grupo[], dia: string, agora: string) {
  const fonte = FONTES[tipo].codigo
  const fora: { linha: Record<string, unknown>; uf: string | null }[] = []
  for (const g of grupos) {
    const uf = typeof g.uf === 'string' && /^[A-Z]{2}$/.test(g.uf) ? g.uf : typeof g.ing_sg_ufmunicipio === 'string' && /^[A-Z]{2}$/.test(g.ing_sg_ufmunicipio) ? g.ing_sg_ufmunicipio : null
    const v = tipo === 'outorgas'
      ? { tipo: 'retrato_outorgas', subtipo: String(g.finalidade_principal ?? 'sem finalidade').slice(0, 80), titulo: `Outorgas federais vigentes${uf ? ` em ${uf}` : ''}: ${g.finalidade_principal ?? 'sem finalidade'}`, valor: Number(g.n ?? 0), unidade: 'outorgas', bruto: { uf, finalidade: g.finalidade_principal ?? null, volume_anual_m3: g.vol ?? null } }
      : { tipo: 'retrato_barragens', subtipo: `risco ${g.categoria_risco ?? 'não classificado'} · dano ${g.dano_potencial ?? 'não classificado'}`.slice(0, 80), titulo: `Barragens cadastradas${uf ? ` em ${uf}` : ''}: risco ${g.categoria_risco ?? 'não classificado'}, dano ${g.dano_potencial ?? 'não classificado'}`, valor: Number(g.n ?? 0), unidade: 'barragens', bruto: { uf, categoria_risco: g.categoria_risco ?? null, dano_potencial: g.dano_potencial ?? null } }
    const base = { ...v, ocorrido_em: `${dia}T00:00:00-03:00`, observado_em: agora, fonte }
    fora.push({ linha: { ...base, conteudo_hash: await hashConteudo(hEv(base)) }, uf })
  }
  return fora
}

// --- Banco --------------------------------------------------------------------------------------
export interface Banco { q<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>; fechar(): Promise<void> }
export async function bancoPostgres(): Promise<Banco> {
  const { Client } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
  const c = new Client(Deno.env.get('SUPABASE_DB_URL')!)
  await c.connect()
  return { q: async <T,>(sql: string, p: unknown[] = []) => (await c.queryObject<T>({ text: sql, args: p })).rows, fechar: () => c.end() }
}
const JSONB = new Set(['identificadores', 'atributos', 'bruto'])
function valores(cols: string[], ls: Record<string, unknown>[]) {
  const params: unknown[] = []
  const sql = ls.map(l => '(' + cols.map(c => { const v = l[c] ?? null; params.push(JSONB.has(c) && v !== null ? JSON.stringify(v) : v); return `$${params.length}${JSONB.has(c) ? '::jsonb' : ''}` }).join(',') + ')').join(',')
  return { sql, params }
}

async function gravar(db: Banco, tipo: 'outorgas' | 'barragens', evs: { linha: Record<string, unknown>; uf: string | null }[]) {
  const f = FONTES[tipo]
  await db.q(`insert into instituto.fontes (codigo, nome, url, licenca, uso_comercial, observacao) values ($1,$2,$3,$4,true,$5)
    on conflict (codigo) do update set nome = excluded.nome, url = excluded.url, licenca = excluded.licenca, observacao = excluded.observacao`, [f.codigo, f.nome, f.url, LICENCA, f.observacao])
  const ufs = [...new Set(evs.map(e => e.uf).filter((u): u is string => !!u))]
  const ents = await Promise.all(ufs.map(async uf => { const e = { tipo: 'estado', nome: uf, chave_natural: `uf-${uf}`, identificadores: { uf }, atributos: {}, fonte: f.codigo }; return { ...e, conteudo_hash: await hashConteudo(hEnt(e)) } }))
  if (ents.length) { const v = valores(['tipo', 'nome', 'chave_natural', 'identificadores', 'atributos', 'fonte', 'conteudo_hash'], ents); await db.q(`insert into instituto.entidades (tipo, nome, chave_natural, identificadores, atributos, fonte, conteudo_hash) values ${v.sql} on conflict (tipo, chave_natural) do nothing`, v.params) }
  const idUf = new Map((await db.q<{ id: string; chave_natural: string }>(`select id::text, chave_natural from instituto.entidades where tipo = 'estado' and chave_natural = any($1::text[])`, [ufs.map(u => `uf-${u}`)])).map(r => [r.chave_natural, r.id]))
  const cols = ['tipo', 'subtipo', 'titulo', 'ocorrido_em', 'observado_em', 'valor', 'unidade', 'bruto', 'fonte', 'conteudo_hash']
  let novos = 0
  const vinc: Record<string, unknown>[] = []
  for (let i = 0; i < evs.length; i += 300) {
    const parte = evs.slice(i, i + 300)
    const v = valores(cols, parte.map(e => e.linha))
    const r = await db.q<{ id: string; conteudo_hash: string }>(`insert into instituto.eventos (${cols.join(',')}) values ${v.sql} on conflict (fonte, conteudo_hash) do nothing returning id::text, conteudo_hash`, v.params)
    novos += r.length
    const ufDe = new Map(parte.map(e => [String(e.linha.conteudo_hash), e.uf]))
    for (const x of r) { const uf = ufDe.get(x.conteudo_hash); const ent = uf ? idUf.get(`uf-${uf}`) : null; if (ent) vinc.push({ evento_id: x.id, entidade_id: ent, papel: 'objeto' }) }
  }
  if (vinc.length) { const v = valores(['evento_id', 'entidade_id', 'papel'], vinc); await db.q(`insert into instituto.evento_entidades (evento_id, entidade_id, papel) values ${v.sql} on conflict do nothing`, v.params) }
  return novos
}

// --- Coleta -------------------------------------------------------------------------------------
async function pegarJson(url: string): Promise<unknown> {
  const r = await fetch(url, { headers: UA })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export async function coletar(db: Banco, agora: string) {
  const dia = new Date(new Date(agora).getTime() - 3 * 3600000).toISOString().slice(0, 10)
  const fora: Record<string, unknown> = { em: agora, dia }
  const tarefas = {
    outorgas: urlEstatistica(FONTES.outorgas.url, `DATA_DE_VENCIMENTO > DATE '${dia}'`, ['UF', 'FINALIDADE_PRINCIPAL'], [{ tipo: 'count', campo: 'INT_CD', nome: 'n' }, { tipo: 'sum', campo: 'VOLUME_ANUAL_M3', nome: 'vol' }]),
    barragens: urlEstatistica(FONTES.barragens.url, '1=1', ['ING_SG_UFMUNICIPIO', 'CATEGORIA_RISCO', 'DANO_POTENCIAL'], [{ tipo: 'count', campo: 'OBJECTID', nome: 'n' }]),
  } as const
  for (const [tipo, url] of Object.entries(tarefas) as ['outorgas' | 'barragens', string][]) {
    try {
      const grupos = lerGrupos(await pegarJson(url))
      const evs = await eventosDe(tipo, grupos, dia, agora)
      fora[tipo] = { grupos: grupos.length, total: grupos.reduce((s, g) => s + Number(g.n ?? 0), 0), eventos_novos: await gravar(db, tipo, evs) }
    } catch (e) { fora[tipo] = { erro: (e as Error).message } }
  }
  return fora
}

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
  if (!await segredoOk(req)) return json({ erro: 'Sem o segredo do agendador.' }, 401)
  const db = await abrirBanco()
  try { return json(await coletar(db, new Date().toISOString())) } finally { await db.fechar() }
}

if (!Deno.env.get('VITEST')) Deno.serve((req) => atender(req))
