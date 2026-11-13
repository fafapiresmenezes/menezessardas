// Passo C3 do plano mestre THEYE: água. Série de reservatório da ANA entrando na ontologia de
// eventos do C1 (database/migrations/122_ontologia_eventos.sql), que já traz a fonte 'ana_snirh'
// cadastrada — este passo NÃO precisa de migração.
//
// POR QUE AQUI E NÃO NO CONTÊINER DE DESENVOLVIMENTO: o proxy de saída do contêiner recusa
// sar.ana.gov.br, snirh.gov.br e dadosabertos.ana.gov.br (connect_rejected). A Edge Function roda
// fora dele. Além disso é aqui que mora a service role, a única que escreve no esquema instituto,
// e essa chave nunca pode chegar ao navegador.
//
// QUAL FATIA: o SAR (Sistema de Acompanhamento de Reservatórios) da ANA, que publica medição
// DIÁRIA por reservatório: cota, volume útil, afluência e defluência. É o dado com valor para
// hidrovia, irrigação e energia, e é o que o critério de aceite pede — uma série plotável.
// Fora deste passo: HidroWeb/telemetria por estação (milhares de séries, outro volume e outro
// cadastro) e outorga.
//
// AS DUAS HORAS, DE PROPÓSITO (mesma regra do C2):
//   ocorrido_em  = o dia da medição no SAR.
//   observado_em = a hora em que ESTA função rodou, isto é, quando o número chegou até nós.
// O SAR publica com alguns dias de atraso e REVISA medição já publicada. O atraso
// observado_em - ocorrido_em é matéria-prima do nowcasting (C7) e não pode ser apagado.
//
// REVISÃO: quando a ANA corrige um número, o conteúdo muda, logo o hash muda, logo entra uma
// linha nova em vez de sobrescrever a antiga. A série fica com as duas versões e a leitura usa a
// mais recentemente observada. Isso é de propósito: dado público revisado é informação, não erro.
//
// IDEMPOTENTE: cada linha carrega o hash do próprio conteúdo, pela mesma receita de
// src/lib/predicao/ontologia.ts. Procuramos o que já existe e inserimos só o que falta, com
// "on conflict do nothing". Rodar duas vezes o mesmo período insere zero.
//
// MODOS:
//   conferir  (aberto, diagnóstico) — só bate na ANA e descreve o que voltou. Não grava nada.
//   coletar   (precisa do segredo)  — grava reservatórios e medições.
//   serie     (aberto, só leitura)  — devolve a série de um reservatório para o gráfico da tela.
//
// GUARDA: cabeçalho x-cron-secret conferido contra configuracoes (chave 'cron_segredo'), igual a
// gdelt-coleta. O modo "serie" é leitura de dado público e não exige segredo.
//
// Deploy: supabase functions deploy ana-agua
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; dados publicos de agua)' }
export const FONTE = 'ana_snirh'
const BASE = 'https://sar.ana.gov.br/ServiceANA.asmx'

/** A ANA em instituto.fontes. Dado aberto do governo federal, uso comercial permitido com citação. */
export const FONTE_ANA = {
  codigo: FONTE,
  nome: 'ANA / SAR — Sistema de Acompanhamento de Reservatórios',
  url: 'https://sar.ana.gov.br',
  licenca: 'Dados abertos do governo federal (Lei 12.527/2011 e Decreto 8.777/2016): uso livre, inclusive comercial, com citação da fonte',
  uso_comercial: true,
  observacao: 'Medição diária por reservatório (cota, volume útil, afluência, defluência). A ANA revisa número já publicado: guardamos as duas versões, com observado_em diferente, em vez de sobrescrever. Não ingerimos telemetria por estação nem outorga neste passo.',
}

// --- Leitura do XML do SAR --------------------------------------------------------------------
// O serviço é um .asmx e devolve DataSet: <NewDataSet><Table>...campos...</Table>...</NewDataSet>.
// Deno não tem DOMParser, e um parser genérico seria peso morto: o formato é raso e fechado.

const DESESCAPAR: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" }
export const texto = (s: string): string =>
  s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&(amp|lt|gt|quot|apos|#39);/g, (_, e) => DESESCAPAR[e])
    .trim()

/** Cada <Table> vira um objeto { campo: texto }. Nomes de campo ficam em minúscula. */
export function tabelas(xml: string): Record<string, string>[] {
  const fora: Record<string, string>[] = []
  for (const bloco of xml.matchAll(/<Table[^>]*>([\s\S]*?)<\/Table>/g)) {
    const linha: Record<string, string> = {}
    for (const campo of bloco[1].matchAll(/<([A-Za-z_][\w.-]*)(?:\s[^>]*)?>([\s\S]*?)<\/\1>/g)) {
      linha[campo[1].toLowerCase()] = texto(campo[2])
    }
    if (Object.keys(linha).length) fora.push(linha)
  }
  return fora
}

/** Número brasileiro ou americano ("1.234,56" ou "1234.56") em number; vazio vira null. */
export function numero(v: string | undefined): number | null {
  if (v === undefined) return null
  const s = v.trim()
  if (!s) return null
  const limpo = s.includes(',') ? s.replace(/\./g, '').replace(',', '.') : s
  const n = Number(limpo)
  return Number.isFinite(n) ? n : null
}

/** "2026-11-13T00:00:00-03:00" a partir do que o SAR escreve na data da medição. */
export function dia(v: string | undefined): string | null {
  if (!v) return null
  const iso = v.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}T00:00:00-03:00`
  const br = v.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
  if (br) return `${br[3]}-${br[2]}-${br[1]}T00:00:00-03:00`
  return null
}

export const ddmmaaaa = (d: string): string => {
  const [a, m, g] = d.slice(0, 10).split('-')
  return `${g}/${m}/${a}`
}

export interface Reservatorio {
  codigo: string
  nome: string
  sistema: string | null
  uf: string | null
  latitude: number | null
  longitude: number | null
  bruto: Record<string, string>
}

const PRIMEIRO = <T,>(l: Record<string, string>, nomes: string[], f: (v: string) => T): T | null => {
  for (const n of nomes) if (l[n] !== undefined && l[n] !== '') return f(l[n])
  return null
}

/** O cadastro de reservatórios do SIN, como o SAR devolve. */
export function lerReservatorios(xml: string): Reservatorio[] {
  return tabelas(xml).map(l => {
    const codigo = PRIMEIRO(l, ['codigoreservatorio', 'codigo', 'cod_reservatorio'], String)
    const nome = PRIMEIRO(l, ['reservatorio', 'nome', 'nomereservatorio', 'nome_reservatorio'], String)
    if (!codigo || !nome) return null
    return {
      codigo,
      nome,
      sistema: PRIMEIRO(l, ['sistema', 'subsistema', 'bacia'], String),
      uf: PRIMEIRO(l, ['uf', 'estado', 'sigla_uf'], v => v.slice(0, 2).toUpperCase()),
      latitude: PRIMEIRO(l, ['latitude', 'lat'], v => numero(v) ?? NaN),
      longitude: PRIMEIRO(l, ['longitude', 'lon', 'lng'], v => numero(v) ?? NaN),
      bruto: l,
    }
  }).filter((r): r is Reservatorio => !!r)
    .map(r => ({
      ...r,
      latitude: Number.isFinite(r.latitude as number) ? r.latitude : null,
      longitude: Number.isFinite(r.longitude as number) ? r.longitude : null,
    }))
}

/** As quatro grandezas que o SAR publica por dia, cada uma com a sua unidade. */
export const GRANDEZAS = [
  { campos: ['cota', 'cotamedia', 'cota_media'], subtipo: 'cota', unidade: 'm', oque: 'Altura da água no reservatório, em metros acima do nível do mar.' },
  { campos: ['volumeutil', 'volume_util', 'volumeutilpercentual', 'volume'], subtipo: 'volume_util', unidade: '%', oque: 'Quanto do volume que se pode usar ainda está lá, em por cento.' },
  { campos: ['afluencia', 'vazaoafluente', 'afluenciamedia'], subtipo: 'afluencia', unidade: 'm3/s', oque: 'Água que está entrando no reservatório, em metros cúbicos por segundo.' },
  { campos: ['defluencia', 'vazaodefluente', 'defluenciamedia'], subtipo: 'defluencia', unidade: 'm3/s', oque: 'Água que está saindo do reservatório, em metros cúbicos por segundo.' },
] as const

export interface Medicao { ocorrido_em: string; subtipo: string; valor: number; unidade: string; bruto: Record<string, string> }

/** Uma linha diária do SAR vira até quatro medições, uma por grandeza presente. */
export function lerMedicoes(xml: string): Medicao[] {
  const fora: Medicao[] = []
  for (const l of tabelas(xml)) {
    const quando = dia(PRIMEIRO(l, ['datamedicao', 'data', 'data_medicao', 'datahora'], String) ?? undefined)
    if (!quando) continue
    for (const g of GRANDEZAS) {
      const v = PRIMEIRO(l, [...g.campos], numero)
      if (v === null) continue
      fora.push({ ocorrido_em: quando, subtipo: g.subtipo, valor: v, unidade: g.unidade, bruto: l })
    }
  }
  return fora
}

// --- Rede -------------------------------------------------------------------------------------
// O .asmx aceita GET com os parâmetros na query. Se a ANA responder erro de método, cai para
// SOAP 1.1 no mesmo endereço. As duas tentativas ficam registradas na resposta, para a falha
// nunca passar por "sem dados".

async function pegar(url: string): Promise<{ xml: string; via: string } | { erro: string }> {
  try {
    const r = await fetch(url, { headers: UA })
    const t = await r.text()
    if (!r.ok) return { erro: `GET ${r.status} ${t.slice(0, 200)}` }
    return { xml: t, via: 'GET' }
  } catch (e) { return { erro: `GET falhou: ${(e as Error).message}` } }
}

async function soap(op: string, params: Record<string, string>): Promise<{ xml: string; via: string } | { erro: string }> {
  const corpo = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body><${op} xmlns="http://tempuri.org/">${
    Object.entries(params).map(([k, v]) => `<${k}>${v}</${k}>`).join('')
  }</${op}></soap:Body>
</soap:Envelope>`
  try {
    const r = await fetch(BASE, {
      method: 'POST',
      headers: { ...UA, 'Content-Type': 'text/xml; charset=utf-8', SOAPAction: `http://tempuri.org/${op}` },
      body: corpo,
    })
    const t = await r.text()
    if (!r.ok) return { erro: `SOAP ${r.status} ${t.slice(0, 200)}` }
    return { xml: t, via: 'SOAP' }
  } catch (e) { return { erro: `SOAP falhou: ${(e as Error).message}` } }
}

/** Tenta GET e, se não vier <Table>, SOAP. Devolve o XML e por onde veio. */
export async function chamar(op: string, params: Record<string, string> = {}): Promise<{ xml: string; via: string } | { erro: string }> {
  const query = new URLSearchParams(params).toString()
  const g = await pegar(`${BASE}/${op}${query ? `?${query}` : ''}`)
  if ('xml' in g && /<Table[\s>]/.test(g.xml)) return g
  const s = await soap(op, params)
  if ('xml' in s) return s
  return { erro: `${'erro' in g ? g.erro : 'GET sem <Table>'} | ${s.erro}` }
}

// --- Banco ------------------------------------------------------------------------------------
export interface Banco {
  registrarFonte(l: typeof FONTE_ANA): Promise<void>
  entidadesPorChave(chaves: string[]): Promise<{ id: string; chave_natural: string }[]>
  inserirEntidades(l: Record<string, unknown>[]): Promise<{ id: string; chave_natural: string }[]>
  porHash(tabela: 'lugares' | 'eventos', hashes: string[]): Promise<{ id: string; conteudo_hash: string }[]>
  inserirLugares(l: Record<string, unknown>[]): Promise<{ id: string; conteudo_hash: string }[]>
  inserirEventos(l: Record<string, unknown>[]): Promise<{ id: string; conteudo_hash: string }[]>
  inserirVinculos(l: { evento_id: string; entidade_id: string; papel: string }[]): Promise<number>
  serie(codigo: string, subtipo: string, de: string, ate: string): Promise<{ ocorrido_em: string; observado_em: string; valor: number; unidade: string }[]>
  reservatorios(): Promise<{ chave_natural: string; nome: string; atributos: Record<string, unknown> }[]>
  fechar(): Promise<void>
}

const COLS = {
  entidades: ['tipo', 'nome', 'chave_natural', 'identificadores', 'atributos', 'fonte', 'conteudo_hash'],
  lugares: ['tipo', 'nome', 'uf', 'latitude', 'longitude', 'identificadores', 'fonte', 'conteudo_hash'],
  eventos: ['tipo', 'subtipo', 'titulo', 'ocorrido_em', 'observado_em', 'lugar_id', 'valor', 'unidade', 'bruto', 'fonte', 'conteudo_hash'],
} as const
const JSONB = new Set(['identificadores', 'atributos', 'bruto'])

export function valoresSql(cols: readonly string[], linhas: Record<string, unknown>[]): { sql: string; params: unknown[] } {
  const params: unknown[] = []
  const grupos = linhas.map(l => '(' + cols.map(c => {
    const v = l[c] ?? null
    params.push(JSONB.has(c) && v !== null ? JSON.stringify(v) : v)
    return `$${params.length}${JSONB.has(c) ? '::jsonb' : ''}`
  }).join(',') + ')')
  return { sql: grupos.join(','), params }
}

export async function bancoPostgres(): Promise<Banco> {
  const { Client } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
  const c = new Client(Deno.env.get('SUPABASE_DB_URL')!)
  await c.connect()
  const linhas = async <T,>(sql: string, params: unknown[] = []): Promise<T[]> =>
    (await c.queryObject<T>({ text: sql, args: params })).rows
  return {
    async registrarFonte(l) {
      await linhas(`insert into instituto.fontes (codigo, nome, url, licenca, uso_comercial, observacao)
        values ($1,$2,$3,$4,$5,$6)
        on conflict (codigo) do update set nome = excluded.nome, url = excluded.url,
          licenca = excluded.licenca, uso_comercial = excluded.uso_comercial, observacao = excluded.observacao`,
        [l.codigo, l.nome, l.url, l.licenca, l.uso_comercial, l.observacao])
    },
    entidadesPorChave: (chaves) => linhas(`select id::text, chave_natural from instituto.entidades where chave_natural = any($1::text[])`, [chaves]),
    async inserirEntidades(ls) {
      const v = valoresSql(COLS.entidades, ls)
      return linhas(`insert into instituto.entidades (${COLS.entidades.join(',')}) values ${v.sql}
        on conflict (tipo, chave_natural) do nothing returning id::text, chave_natural`, v.params)
    },
    porHash: (tabela, hashes) => linhas(`select id::text, conteudo_hash from instituto.${tabela} where fonte = $1 and conteudo_hash = any($2::text[])`, [FONTE, hashes]),
    async inserirLugares(ls) {
      const v = valoresSql(COLS.lugares, ls)
      return linhas(`insert into instituto.lugares (${COLS.lugares.join(',')}) values ${v.sql}
        on conflict do nothing returning id::text, conteudo_hash`, v.params)
    },
    async inserirEventos(ls) {
      const v = valoresSql(COLS.eventos, ls)
      return linhas(`insert into instituto.eventos (${COLS.eventos.join(',')}) values ${v.sql}
        on conflict (fonte, conteudo_hash) do nothing returning id::text, conteudo_hash`, v.params)
    },
    async inserirVinculos(ls) {
      const v = valoresSql(['evento_id', 'entidade_id', 'papel'], ls as unknown as Record<string, unknown>[])
      const r = await linhas(`insert into instituto.evento_entidades (evento_id, entidade_id, papel) values ${v.sql}
        on conflict do nothing returning papel`, v.params)
      return r.length
    },
    serie: (codigo, subtipo, de, ate) => linhas(
      `select e.ocorrido_em::text, e.observado_em::text, e.valor, e.unidade
         from instituto.eventos e
         join instituto.evento_entidades ve on ve.evento_id = e.id
         join instituto.entidades n on n.id = ve.entidade_id
        where e.fonte = $1 and e.subtipo = $2 and n.chave_natural = $3
          and e.ocorrido_em >= $4::timestamptz and e.ocorrido_em <= $5::timestamptz
        order by e.ocorrido_em, e.observado_em`, [FONTE, subtipo, codigo, de, ate]),
    reservatorios: () => linhas(
      `select chave_natural, nome, atributos from instituto.entidades
        where fonte = $1 and tipo = 'corpo_dagua' order by nome`, [FONTE]),
    fechar: () => c.end(),
  }
}

// --- Hash (a mesma receita de src/lib/predicao/ontologia.ts) -----------------------------------
export const camposHash = {
  entidade: (e: { tipo: string; nome: string; chave_natural: string; identificadores: unknown; atributos: unknown; fonte: string }) =>
    ({ tipo: e.tipo, nome: e.nome, chave_natural: e.chave_natural, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, fonte: e.fonte }),
  lugar: (l: Record<string, unknown>) =>
    ({ tipo: l.tipo, nome: l.nome, uf: l.uf ?? null, codigo_ibge: l.codigo_ibge ?? null, latitude: l.latitude ?? null, longitude: l.longitude ?? null, geometria: l.geometria ?? null, identificadores: l.identificadores ?? {}, fonte: l.fonte }),
  evento: (v: Record<string, unknown>) =>
    ({ tipo: v.tipo, subtipo: v.subtipo ?? null, titulo: v.titulo ?? null, ocorrido_em: v.ocorrido_em, lugar_id: v.lugar_id ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null, valor: v.valor ?? null, unidade: v.unidade ?? null, bruto: v.bruto ?? {}, fonte: v.fonte }),
}

type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

/** Forma canônica de objeto, igual a instituto.json_canonico e a src/lib/predicao/ontologia.ts. */
export function jsonCanonico(v: Json | undefined): string {
  if (v === undefined) return ''
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(jsonCanonico).join(',') + ']'
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + jsonCanonico((v as Record<string, Json>)[k])).join(',') + '}'
}

const comoTexto = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  return jsonCanonico(v as Json)
}

/** "chave=valor" por linha, ordenado pela chave. A mesma receita do navegador e do banco. */
export function canonizar(campos: Record<string, unknown>): string {
  return Object.keys(campos).sort().map(k => `${k}=${comoTexto(campos[k])}`).join('\n')
}

export async function hashConteudo(campos: Record<string, unknown>): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonizar(campos)))
  return [...new Uint8Array(d)].map(b => b.toString(16).padStart(2, '0')).join('')
}

// --- Coleta -----------------------------------------------------------------------------------
export interface Resumo {
  em: string; de: string; ate: string
  reservatorios_lidos: number; reservatorios_novos: number
  medicoes_lidas: number; medicoes_novas: number; medicoes_repetidas: number
  lugares_novos: number; vinculos_novos: number
  via: string[]; ms: number; falhas: string[]
}

export const chaveReservatorio = (codigo: string) => `ana-sar-${codigo}`

export async function coletar(db: Banco, o: { de: string; ate: string; agora: string; limiteReservatorios: number; so?: string[] }): Promise<Resumo> {
  const t0 = Date.now()
  const falhas: string[] = []
  const via: string[] = []

  const lista = await chamar('ReservatoriosSIN')
  if ('erro' in lista) {
    return { em: o.agora, de: o.de, ate: o.ate, reservatorios_lidos: 0, reservatorios_novos: 0, medicoes_lidas: 0, medicoes_novas: 0, medicoes_repetidas: 0, lugares_novos: 0, vinculos_novos: 0, via, ms: Date.now() - t0, falhas: [`ReservatoriosSIN: ${lista.erro}`] }
  }
  via.push(`ReservatoriosSIN:${lista.via}`)
  let reservatorios = lerReservatorios(lista.xml)
  if (o.so?.length) reservatorios = reservatorios.filter(r => o.so!.includes(r.codigo))
  reservatorios = reservatorios.slice(0, o.limiteReservatorios)

  await db.registrarFonte(FONTE_ANA)

  // 1) Reservatórios como entidades (corpo_dagua) e, quando têm coordenada, como lugares.
  const entidades = await Promise.all(reservatorios.map(async r => {
    const base = {
      tipo: 'corpo_dagua', nome: r.nome, chave_natural: chaveReservatorio(r.codigo),
      identificadores: { ana_sar: r.codigo },
      atributos: { sistema: r.sistema, uf: r.uf, latitude: r.latitude, longitude: r.longitude },
      fonte: FONTE,
    }
    return { ...base, conteudo_hash: await hashConteudo(camposHash.entidade(base)) }
  }))
  const jaTem = new Map((await db.entidadesPorChave(entidades.map(e => String(e.chave_natural)))).map(e => [e.chave_natural, e.id]))
  const faltam = entidades.filter(e => !jaTem.has(String(e.chave_natural)))
  for (const n of faltam.length ? await db.inserirEntidades(faltam) : []) jaTem.set(n.chave_natural, n.id)
  // Quem perdeu a corrida do on-conflict volta a ser procurado, para nunca ficar sem id.
  if (faltam.some(e => !jaTem.has(String(e.chave_natural)))) {
    for (const e of await db.entidadesPorChave(faltam.map(e => String(e.chave_natural)))) jaTem.set(e.chave_natural, e.id)
  }

  const comPonto = reservatorios.filter(r => r.latitude !== null && r.longitude !== null)
  const lugares = await Promise.all(comPonto.map(async r => {
    const base = { tipo: 'ponto', nome: r.nome, uf: r.uf, latitude: r.latitude, longitude: r.longitude, identificadores: { ana_sar: r.codigo }, fonte: FONTE }
    return { ...base, conteudo_hash: await hashConteudo(camposHash.lugar(base)) }
  }))
  const lugarPorCodigo = new Map<string, string>()
  let lugaresNovos = 0
  if (lugares.length) {
    const hashes = lugares.map(l => String(l.conteudo_hash))
    const existentes = new Map((await db.porHash('lugares', hashes)).map(l => [l.conteudo_hash, l.id]))
    const novos = lugares.filter(l => !existentes.has(String(l.conteudo_hash)))
    for (const n of novos.length ? await db.inserirLugares(novos) : []) { existentes.set(n.conteudo_hash, n.id); lugaresNovos++ }
    lugares.forEach((l, i) => { const id = existentes.get(String(l.conteudo_hash)); if (id) lugarPorCodigo.set(comPonto[i].codigo, id) })
  }

  // 2) Medições do período, por reservatório.
  let lidas = 0, novas = 0, repetidas = 0, vinculos = 0
  for (const r of reservatorios) {
    const med = await chamar('DadosHistoricos', {
      CodigoReservatorio: r.codigo, DataInicial: ddmmaaaa(o.de), DataFinal: ddmmaaaa(o.ate),
    })
    if ('erro' in med) { falhas.push(`DadosHistoricos ${r.codigo}: ${med.erro}`); continue }
    if (!via.includes(`DadosHistoricos:${med.via}`)) via.push(`DadosHistoricos:${med.via}`)
    const medicoes = lerMedicoes(med.xml)
    lidas += medicoes.length
    if (!medicoes.length) continue

    const linhas = await Promise.all(medicoes.map(async m => {
      const base = {
        tipo: 'medicao_reservatorio', subtipo: m.subtipo, titulo: `${r.nome}: ${m.subtipo.replace('_', ' ')}`,
        ocorrido_em: m.ocorrido_em, observado_em: o.agora,
        lugar_id: lugarPorCodigo.get(r.codigo) ?? null,
        valor: m.valor, unidade: m.unidade, bruto: m.bruto, fonte: FONTE,
      }
      return { ...base, conteudo_hash: await hashConteudo(camposHash.evento(base)) }
    }))
    const unicas = [...new Map(linhas.map(l => [String(l.conteudo_hash), l])).values()]
    const existentes = new Map((await db.porHash('eventos', unicas.map(l => String(l.conteudo_hash)))).map(e => [e.conteudo_hash, e.id]))
    repetidas += existentes.size
    const faltando = unicas.filter(l => !existentes.has(String(l.conteudo_hash)))
    const inseridas = faltando.length ? await db.inserirEventos(faltando) : []
    novas += inseridas.length

    const entidadeId = jaTem.get(chaveReservatorio(r.codigo))
    if (entidadeId && inseridas.length) {
      vinculos += await db.inserirVinculos(inseridas.map(e => ({ evento_id: e.id, entidade_id: entidadeId, papel: 'objeto' })))
    }
  }

  return {
    em: o.agora, de: o.de, ate: o.ate,
    reservatorios_lidos: reservatorios.length, reservatorios_novos: faltam.length,
    medicoes_lidas: lidas, medicoes_novas: novas, medicoes_repetidas: repetidas,
    lugares_novos: lugaresNovos, vinculos_novos: vinculos, via, ms: Date.now() - t0, falhas,
  }
}

/**
 * A série para o gráfico: um ponto por dia, com a medição mais recentemente observada daquele dia,
 * e quantas vezes a ANA já revisou aquele dia. O atraso é em horas.
 */
export function serieDoDia(linhas: { ocorrido_em: string; observado_em: string; valor: number; unidade: string }[]) {
  const porDia = new Map<string, { dia: string; valor: number; unidade: string; observado_em: string; revisoes: number; atraso_horas: number }>()
  for (const l of linhas) {
    const d = l.ocorrido_em.slice(0, 10)
    const atual = porDia.get(d)
    const atraso = Math.round((new Date(l.observado_em).getTime() - new Date(l.ocorrido_em).getTime()) / 3600000)
    if (!atual) porDia.set(d, { dia: d, valor: l.valor, unidade: l.unidade, observado_em: l.observado_em, revisoes: 0, atraso_horas: atraso })
    else if (new Date(l.observado_em) >= new Date(atual.observado_em)) {
      porDia.set(d, { ...atual, valor: l.valor, unidade: l.unidade, observado_em: l.observado_em, revisoes: atual.revisoes + 1, atraso_horas: atraso })
    } else porDia.set(d, { ...atual, revisoes: atual.revisoes + 1 })
  }
  return [...porDia.values()].sort((a, b) => a.dia < b.dia ? -1 : 1)
}

// --- Guarda e porta ---------------------------------------------------------------------------
function servico() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

export async function segredoOk(req: Request): Promise<boolean> {
  const dado = req.headers.get('x-cron-secret')
  if (!dado) return false
  // configuracoes é chave/valor (chave, valor), igual a gdelt-coleta e aos robôs do CNJ.
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  const esperado = (data as { valor?: string } | null)?.valor
  return !!esperado && dado === esperado
}

/** As únicas operações do SAR que esta função chama, e os únicos parâmetros que repassa. */
export const OPS_PUBLICAS = ['ReservatoriosSIN', 'ReservatoriosNordeste', 'DadosHistoricos']
export const PARAMS_PUBLICOS = ['CodigoReservatorio', 'DataInicial', 'DataFinal']

const hoje = () => new Date().toISOString().slice(0, 10)
const diasAtras = (n: number) => new Date(Date.now() - n * 86400000).toISOString().slice(0, 10)

export async function atender(req: Request, abrirBanco: () => Promise<Banco> = bancoPostgres): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let corpo: Record<string, unknown> = {}
  try { corpo = await req.json() } catch { corpo = {} }
  const modo = String(corpo.modo ?? 'serie')

  if (modo === 'serie') {
    const codigo = String(corpo.codigo ?? '')
    const subtipo = String(corpo.subtipo ?? 'volume_util')
    const de = String(corpo.de ?? diasAtras(90))
    const ate = String(corpo.ate ?? hoje())
    const db = await abrirBanco()
    try {
      if (!codigo) return json({ reservatorios: await db.reservatorios(), fonte: FONTE_ANA })
      const linhas = await db.serie(codigo, subtipo, `${de}T00:00:00-03:00`, `${ate}T23:59:59-03:00`)
      const serie = serieDoDia(linhas)
      return json({
        codigo, subtipo, de, ate, pontos: serie.length, serie,
        unidade: serie[0]?.unidade ?? null,
        grandeza: GRANDEZAS.find(g => g.subtipo === subtipo)?.oque ?? null,
        fonte: FONTE_ANA,
      })
    } finally { await db.fechar() }
  }

  // "conferir" é diagnóstico: não escreve no banco, não lê segredo nenhum e só alcança as três
  // operações públicas do SAR listadas abaixo, com os parâmetros que elas aceitam. Fica aberto de
  // propósito, para a tela poder dizer "a ANA não respondeu" em vez de "sem dados", e porque não
  // há trabalho nem gravação para disparar. Qualquer outra operação é recusada aqui mesmo.
  if (modo === 'conferir') {
    const op = String(corpo.op ?? 'ReservatoriosSIN')
    if (!OPS_PUBLICAS.includes(op)) return json({ erro: `Operação não liberada: ${op}.` }, 400)
    const pedidos = (corpo.params ?? {}) as Record<string, unknown>
    const params: Record<string, string> = {}
    for (const k of PARAMS_PUBLICOS) if (pedidos[k] !== undefined) params[k] = String(pedidos[k]).slice(0, 40)
    const r = await chamar(op, params)
    if ('erro' in r) return json({ op, erro: r.erro }, 502)
    return json({
      op, via: r.via, tamanho: r.xml.length, tabelas: tabelas(r.xml).length,
      primeira: tabelas(r.xml)[0] ?? null, amostra: r.xml.slice(0, 1500),
    })
  }

  if (!await segredoOk(req)) return json({ erro: 'Sem o segredo do agendador.' }, 401)

  if (modo === 'coletar') {
    const db = await abrirBanco()
    try {
      return json(await coletar(db, {
        de: String(corpo.de ?? diasAtras(30)), ate: String(corpo.ate ?? hoje()),
        agora: new Date().toISOString(),
        limiteReservatorios: Number(corpo.limiteReservatorios ?? 3),
        so: Array.isArray(corpo.so) ? corpo.so.map(String) : undefined,
      }))
    } finally { await db.fechar() }
  }

  return json({ erro: `Modo desconhecido: ${modo}. Use conferir, coletar ou serie.` }, 400)
}

if (!Deno.env.get('VITEST')) Deno.serve(atender)
