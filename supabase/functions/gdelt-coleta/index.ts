// Passo C2 do plano mestre THEYE: ingestão do GDELT na ontologia de eventos criada em C1
// (database/migrations/122_ontologia_eventos.sql).
//
// POR QUE AQUI E NÃO NO CONTÊINER DE DESENVOLVIMENTO: o proxy de saída do contêinor devolve 403
// para data.gdeltproject.org. A Edge Function roda fora dele e alcança a internet aberta. Além
// disso é aqui que mora a service role, que é a única que escreve no esquema instituto — e essa
// chave nunca pode chegar ao navegador.
//
// QUAL FATIA (decisão do C15, /mnt/project-files/predicao/C15-gdelt-inventario.md):
//   - Events 2.0 + Mentions, recorte Brasil. Sem GKG neste passo, sem GCAM nunca, sem VGKG, sem TV.
//   - NÃO ingerimos GoldsteinScale (é constante por código CAMEO, não mede intensidade),
//     AvgTone (campo "legacy", é do documento inteiro) nem NumMentions/NumSources/NumArticles
//     (contam só a primeira atualização de 15 min). A Mentions dá a contagem verdadeira.
//   - NÃO ingerimos Actor*EthnicCode nem Religion*Code: decisão de política, não só técnica.
//
// POR QUE OS ARQUIVOS DE 15 MINUTOS E NÃO UM DIÁRIO: o GDELT 2.0 não publica arquivo diário. O
// que existe é a atualização de 15 minutos (:00, :15, :30, :45) e o masterfilelist.txt, que é a
// lista desses mesmos arquivos. São pequenos (poucos MB comprimidos), são indexados por DATEADDED
// — o único campo correto para janela incremental, como o codebook manda — e permitem rodar esta
// função no pg_cron a cada 15 minutos sem nunca carregar um volume imprevisível.
//
// AS DUAS HORAS, DE PROPÓSITO (sem isto o nowcasting do C7 morre em silêncio):
//   ocorrido_em  = a data do próprio evento no GDELT (SQLDATE; na Mentions, MentionTimeDate).
//   observado_em = a hora em que ESTA função rodou, isto é, quando a informação chegou até nós.
// O atraso observado_em - ocorrido_em é a matéria-prima do nowcasting. Trocar as duas faria o
// modelo parecer melhor do que é.
//
// IDEMPOTENTE: toda linha carrega o hash do próprio conteúdo, pela mesma receita de
// src/lib/predicao/ontologia.ts e de instituto.ontologia_hash no banco. Antes de inserir,
// procuramos o que já existe e inserimos só o que falta, e a inserção ainda vai com
// "on conflict do nothing". Rodar duas vezes a mesma janela insere zero.
//
// COMO ESCREVE: em SQL, por conexão direta (SUPABASE_DB_URL). A API REST deste projeto expõe só
// os esquemas public e graphql_public, então o supabase-js não alcança instituto (PGRST106).
// A explicação inteira está na seção "Gravação idempotente", mais abaixo.
//
// LIMITE: aceita janela (quantos arquivos de 15 min) e limite (teto de eventos). O padrão é
// pequeno: uma janela, 300 eventos.
//
// GUARDA: igual a coletor-instituto e gdelt-juridico — cabeçalho x-cron-secret conferido contra
// configuracoes.cron_segredo. Sem o segredo, 401. Ninguém dispara trabalho anonimamente.
//
// Deploy: supabase functions deploy gdelt-coleta
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

/** Cliente da service role no esquema public (configuracoes). */
function servico() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; ingestao de eventos publicos)' }
export const FONTE = 'gdelt'
const BASE = 'http://data.gdeltproject.org/gdeltv2'

// --- Hash de conteúdo: a MESMA receita de src/lib/predicao/ontologia.ts ----------------------
// (canonizar + sha256 hex). O teste em ./index.test.ts confere campo a campo contra aquele
// módulo, para as duas pontas nunca divergirem sem alguém perceber.

export type Json = string | number | boolean | null | Json[] | { [k: string]: Json }

export function jsonCanonico(v: Json | undefined): string {
  if (v === undefined) return ''
  if (v === null || typeof v !== 'object') return JSON.stringify(v)
  if (Array.isArray(v)) return '[' + v.map(jsonCanonico).join(',') + ']'
  return '{' + Object.keys(v).sort().map(k => JSON.stringify(k) + ':' + jsonCanonico((v as Record<string, Json>)[k])).join(',') + '}'
}

const texto = (v: unknown): string => {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  if (typeof v === 'number' || typeof v === 'boolean') return String(v)
  if (v instanceof Date) return v.toISOString()
  return jsonCanonico(v as Json)
}

export function canonizar(campos: Record<string, unknown>): string {
  return Object.keys(campos).sort().map(k => `${k}=${texto(campos[k])}`).join('\n')
}

export async function hashConteudo(campos: Record<string, unknown>): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(canonizar(campos)))
  return Array.from(new Uint8Array(d)).map(b => b.toString(16).padStart(2, '0')).join('')
}

/** Campos que entram no hash de cada tabela. Igual a camposHash de src/lib/predicao/ontologia.ts. */
export const camposHash = {
  entidade: (e: Entidade) => ({ tipo: e.tipo, nome: e.nome, chave_natural: e.chave_natural, identificadores: e.identificadores ?? {}, atributos: e.atributos ?? {}, fonte: e.fonte }),
  lugar: (l: Lugar) => ({ tipo: l.tipo, nome: l.nome, uf: l.uf ?? null, codigo_ibge: l.codigo_ibge ?? null, latitude: l.latitude ?? null, longitude: l.longitude ?? null, geometria: l.geometria ?? null, identificadores: l.identificadores ?? {}, fonte: l.fonte }),
  evento: (v: Evento) => ({ tipo: v.tipo, subtipo: v.subtipo ?? null, titulo: v.titulo ?? null, ocorrido_em: v.ocorrido_em, lugar_id: v.lugar_id ?? null, latitude: v.latitude ?? null, longitude: v.longitude ?? null, valor: v.valor ?? null, unidade: v.unidade ?? null, bruto: v.bruto ?? {}, fonte: v.fonte }),
}

// IMPORTANTE para o hash: latitude/longitude e tom entram no banco como numeric e no hash como
// TEXTO, porque Postgres e JavaScript não escrevem decimais do mesmo jeito. Por isso guardamos
// as coordenadas já como string na forma em que vão para o hash, e o mesmo texto vai para a coluna.

export interface Entidade { tipo: string; nome: string; chave_natural: string; identificadores: Record<string, Json>; atributos: Record<string, Json>; fonte: string }
export interface Lugar { tipo: string; nome: string; uf: string | null; codigo_ibge: string | null; latitude: string | null; longitude: string | null; geometria: null; identificadores: Record<string, Json>; fonte: string; lat_min?: string | null; lat_max?: string | null; lon_min?: string | null; lon_max?: string | null; pai_chave?: string | null }
export interface Evento { tipo: string; subtipo: string | null; titulo: string | null; ocorrido_em: string; observado_em: string; latitude: string | null; longitude: string | null; confianca: string | null; tom: string | null; valor: null; unidade: null; bruto: Record<string, Json>; fonte: string; lugar_id?: string | null }

// --- ZIP sem dependência externa -------------------------------------------------------------
// Os arquivos do GDELT 2.0 vêm em .zip com um único CSV dentro. Em vez de puxar uma biblioteca,
// lemos o cabeçalho local do ZIP e descomprimimos com DecompressionStream('deflate-raw'), que é
// API padrão da Web (existe no Deno e no Node 18+, logo também no vitest).

const u16 = (b: Uint8Array, i: number) => b[i]! | (b[i + 1]! << 8)
const u32 = (b: Uint8Array, i: number) => (b[i]! | (b[i + 1]! << 8) | (b[i + 2]! << 16)) + b[i + 3]! * 0x1000000

/** Primeiro arquivo de dentro do ZIP, como texto. Aceita guardado (0) e deflate (8). */
export async function primeiroDoZip(zip: Uint8Array): Promise<string> {
  if (zip.length < 30 || u32(zip, 0) !== 0x04034b50) throw new Error('não parece um ZIP (assinatura local ausente)')
  const metodo = u16(zip, 8)
  let comprimido = u32(zip, 18)
  const nomeLen = u16(zip, 26), extraLen = u16(zip, 28)
  const inicio = 30 + nomeLen + extraLen
  // Streaming com tamanho zerado no cabeçalho local (bit 3): pegamos o resto até o diretório central.
  if (comprimido === 0) {
    const fim = acharCentral(zip)
    comprimido = Math.max(0, fim - inicio)
  }
  const dados = zip.subarray(inicio, inicio + comprimido)
  if (metodo === 0) return new TextDecoder('utf-8').decode(dados)
  if (metodo !== 8) throw new Error(`compressão ${metodo} não suportada`)
  const fluxo = new Blob([dados as unknown as BlobPart]).stream().pipeThrough(new DecompressionStream('deflate-raw'))
  return new TextDecoder('utf-8').decode(new Uint8Array(await new Response(fluxo).arrayBuffer()))
}

/** Posição da assinatura do diretório central (0x02014b50). */
function acharCentral(b: Uint8Array): number {
  for (let i = b.length - 4; i >= 0; i--) if (u32(b, i) === 0x02014b50) return i
  return b.length
}

// --- Leitura do CSV do GDELT ----------------------------------------------------------------
// O GDELT 2.0 usa TAB como separador e não cita campos. Linha vazia é ignorada.

export const linhasCsv = (txt: string): string[][] =>
  txt.split('\n').map(l => l.replace(/\r$/, '')).filter(l => l.length > 0).map(l => l.split('\t'))

// Colunas do Events 2.0 que usamos (ver GDELT-Event_Codebook-V2.0.pdf).
const E = {
  id: 0, sqldate: 1, a1code: 5, a1nome: 6, a1pais: 7, a1tipo: 12, a2code: 15, a2nome: 16, a2pais: 17, a2tipo: 22,
  raiz: 25, evcode: 26, evbase: 27, evraiz: 28, quad: 29,
  a1geopais: 37, a2geopais: 45,
  geotipo: 51, geonome: 52, geopais: 53, geoadm1: 54, geolat: 56, geolon: 57, geofeature: 58,
  dateadded: 59, url: 60,
} as const

// Colunas da Mentions 2.0 (ver GDELT-Event_Codebook-V2.0.pdf, seção Mentions).
const M = { id: 0, evdata: 1, mendata: 2, mentipo: 3, menfonte: 4, menurl: 5, bruto: 10, confianca: 11, tamanho: 12, tom: 13 } as const

/** Rótulo em português da raiz CAMEO. É o "tipo" do evento na ontologia. */
export const RAIZ_CAMEO: Record<string, string> = {
  '01': 'declaracao_publica', '02': 'apelo', '03': 'intencao_de_cooperar', '04': 'consulta',
  '05': 'cooperacao_diplomatica', '06': 'cooperacao_material', '07': 'ajuda', '08': 'concessao',
  '09': 'investigacao', '10': 'exigencia', '11': 'desaprovacao', '12': 'rejeicao', '13': 'ameaca',
  '14': 'protesto', '15': 'demonstracao_de_forca', '16': 'reducao_de_relacoes', '17': 'coercao',
  '18': 'agressao', '19': 'combate', '20': 'violencia_em_massa',
}

/** FIPS 10-4 (o que o GDELT usa em ADM1Code) para UF e código IBGE da unidade federativa. */
export const ADM1_BR: Record<string, { uf: string; ibge: string; nome: string }> = {
  BR01: { uf: 'AC', ibge: '12', nome: 'Acre' }, BR02: { uf: 'AL', ibge: '27', nome: 'Alagoas' },
  BR03: { uf: 'AP', ibge: '16', nome: 'Amapá' }, BR04: { uf: 'AM', ibge: '13', nome: 'Amazonas' },
  BR05: { uf: 'BA', ibge: '29', nome: 'Bahia' }, BR06: { uf: 'CE', ibge: '23', nome: 'Ceará' },
  BR07: { uf: 'DF', ibge: '53', nome: 'Distrito Federal' }, BR08: { uf: 'ES', ibge: '32', nome: 'Espírito Santo' },
  BR11: { uf: 'MS', ibge: '50', nome: 'Mato Grosso do Sul' }, BR13: { uf: 'MA', ibge: '21', nome: 'Maranhão' },
  BR14: { uf: 'MT', ibge: '51', nome: 'Mato Grosso' }, BR15: { uf: 'MG', ibge: '31', nome: 'Minas Gerais' },
  BR16: { uf: 'PA', ibge: '15', nome: 'Pará' }, BR17: { uf: 'PB', ibge: '25', nome: 'Paraíba' },
  BR18: { uf: 'PR', ibge: '41', nome: 'Paraná' }, BR20: { uf: 'PI', ibge: '22', nome: 'Piauí' },
  BR21: { uf: 'RJ', ibge: '33', nome: 'Rio de Janeiro' }, BR22: { uf: 'RN', ibge: '24', nome: 'Rio Grande do Norte' },
  BR23: { uf: 'RS', ibge: '43', nome: 'Rio Grande do Sul' }, BR24: { uf: 'RO', ibge: '11', nome: 'Rondônia' },
  BR25: { uf: 'RR', ibge: '14', nome: 'Roraima' }, BR26: { uf: 'SC', ibge: '42', nome: 'Santa Catarina' },
  BR27: { uf: 'SP', ibge: '35', nome: 'São Paulo' }, BR28: { uf: 'SE', ibge: '28', nome: 'Sergipe' },
  BR29: { uf: 'GO', ibge: '52', nome: 'Goiás' }, BR30: { uf: 'PE', ibge: '26', nome: 'Pernambuco' },
  BR31: { uf: 'TO', ibge: '17', nome: 'Tocantins' },
}

/** Tipo de entidade a partir do Actor*Type1Code do CAMEO. Nunca etnia nem religião. */
export function tipoEntidade(tipoAtor: string, codigo: string): string {
  const t = (tipoAtor || '').toUpperCase()
  if (['GOV', 'LEG', 'JUD', 'MIL', 'COP', 'IGO', 'UIS', 'SPY'].includes(t)) return 'orgao_publico'
  if (['BUS', 'MNC'].includes(t)) return 'empresa'
  if (['AGR', 'DEV', 'ENV', 'EDU', 'MED', 'LAB', 'NGO', 'NGM', 'HLH', 'REL'].includes(t)) return 'pessoa_juridica_outra'
  // Código de 3 letras puro é país no CAMEO (BRA, USA); o resto é organização não classificada.
  return /^[A-Z]{3}$/.test(codigo) ? 'pais' : 'pessoa_juridica_outra'
}

const limpa = (s: string | undefined) => (s ?? '').trim()
/** "20261113" -> "2026-11-13T00:00:00.000Z". O Events 2.0 data o evento no dia, não na hora. */
export function diaIso(sqldate: string): string | null {
  if (!/^\d{8}$/.test(sqldate)) return null
  const d = new Date(`${sqldate.slice(0, 4)}-${sqldate.slice(4, 6)}-${sqldate.slice(6, 8)}T00:00:00Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
/** "20261113124500" -> ISO. Usado em DATEADDED e nos dois carimbos da Mentions. */
export function instanteIso(s: string): string | null {
  if (!/^\d{14}$/.test(s)) return null
  const d = new Date(`${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}T${s.slice(8, 10)}:${s.slice(10, 12)}:${s.slice(12, 14)}Z`)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}
/** Decimal como TEXTO, para o hash do banco e o do JavaScript baterem. */
const numTexto = (s: string, casas: number): string | null => {
  const n = Number(limpa(s))
  return limpa(s) === '' || !Number.isFinite(n) ? null : n.toFixed(casas)
}

/** Brasil se qualquer uma das três geografias do evento aponta para BR. */
export const doBrasil = (c: string[]): boolean =>
  [limpa(c[E.geopais]), limpa(c[E.a1geopais]), limpa(c[E.a2geopais])].includes('BR')

export interface Mapeado { evento: Evento; lugar: Lugar | null; estado: Lugar | null; atores: { entidade: Entidade; papel: string }[]; gid: string }

/**
 * Uma linha do export.CSV vira um evento, o lugar onde caiu, a UF que contém esse lugar, e as
 * entidades que participaram com o seu papel. `observadoEm` é a hora desta execução.
 */
export function mapearEvento(c: string[], observadoEm: string): Mapeado | null {
  const gid = limpa(c[E.id])
  const ocorrido = diaIso(limpa(c[E.sqldate]))
  if (!gid || !ocorrido) return null
  const raiz = limpa(c[E.evraiz]).padStart(2, '0')
  const adm1 = limpa(c[E.geoadm1]).toUpperCase()
  const uf = ADM1_BR[adm1] ?? null
  const lat = numTexto(limpa(c[E.geolat]), 6), lon = numTexto(limpa(c[E.geolon]), 6)
  const nomeLugar = limpa(c[E.geonome])

  const estado: Lugar | null = uf
    ? { tipo: 'estado', nome: uf.nome, uf: uf.uf, codigo_ibge: uf.ibge, latitude: null, longitude: null, geometria: null, identificadores: { gdelt_adm1: adm1 }, fonte: FONTE }
    : null
  // O lugar do evento é um ponto: o GDELT dá lat/long e FeatureID, nunca código IBGE de município
  // (o C15 decidiu não confiar no ADM2Code; o cruzamento com a malha do IBGE é tarefa de outro passo).
  const lugar: Lugar | null = nomeLugar && lat && lon
    ? {
        tipo: 'ponto', nome: nomeLugar.slice(0, 300), uf: uf?.uf ?? null, codigo_ibge: null,
        latitude: lat, longitude: lon, geometria: null,
        identificadores: { gdelt_feature_id: limpa(c[E.geofeature]) || null, gdelt_adm1: adm1 || null, gdelt_geo_tipo: limpa(c[E.geotipo]) || null },
        fonte: FONTE, lat_min: lat, lat_max: lat, lon_min: lon, lon_max: lon, pai_chave: uf?.ibge ?? null,
      }
    : null

  const atores: { entidade: Entidade; papel: string }[] = []
  for (const [cod, nome, pais, tp, papel] of [
    [limpa(c[E.a1code]), limpa(c[E.a1nome]), limpa(c[E.a1pais]), limpa(c[E.a1tipo]), 'ator'],
    [limpa(c[E.a2code]), limpa(c[E.a2nome]), limpa(c[E.a2pais]), limpa(c[E.a2tipo]), 'alvo'],
  ] as const) {
    // Sem nome legível de pelo menos 2 caracteres a entidade não passa no check da tabela.
    if (!cod || nome.length < 2) continue
    atores.push({
      papel,
      entidade: {
        tipo: tipoEntidade(tp, cod), nome: nome.slice(0, 300), chave_natural: `gdelt:${cod}`,
        identificadores: { gdelt_ator: cod, gdelt_pais: pais || null },
        atributos: { gdelt_tipo1: tp || null }, fonte: FONTE,
      },
    })
  }

  const evento: Evento = {
    tipo: RAIZ_CAMEO[raiz] ?? 'evento_noticiado',
    subtipo: `cameo_${limpa(c[E.evcode]) || raiz}`,
    titulo: nomeLugar ? `${RAIZ_CAMEO[raiz] ?? 'evento'} — ${nomeLugar}`.slice(0, 500) : null,
    ocorrido_em: ocorrido,
    observado_em: observadoEm,
    latitude: lat, longitude: lon,
    confianca: null,
    // Sem AvgTone: o C15 proibiu (campo "legacy", é o tom do documento inteiro). O tom por
    // artigo vem na Mentions (MentionDocTone) e no GKG (V2Tone), não daqui.
    tom: null,
    valor: null, unidade: null,
    bruto: {
      global_event_id: gid, event_code: limpa(c[E.evcode]) || null, event_base_code: limpa(c[E.evbase]) || null,
      event_root_code: raiz, quad_class: limpa(c[E.quad]) || null, is_root_event: limpa(c[E.raiz]) || null,
      action_geo_country: limpa(c[E.geopais]) || null, action_geo_adm1: adm1 || null,
      action_geo_feature_id: limpa(c[E.geofeature]) || null, action_geo_fullname: nomeLugar || null,
      date_added: instanteIso(limpa(c[E.dateadded])), source_url: limpa(c[E.url]) || null,
      arquivo: 'export', registro: 'eventos_2.0',
    },
    fonte: FONTE,
  }
  return { evento, lugar, estado, atores, gid }
}

/**
 * Uma linha da mentions.CSV vira um evento de tipo 'mencao_noticiosa': o fato de um artigo ter
 * mencionado o evento `gid`. O que aconteceu foi a publicação, logo ocorrido_em = MentionTimeDate.
 * `observado_em` continua sendo a hora desta execução.
 */
export function mapearMencao(c: string[], observadoEm: string): Mapeado | null {
  const gid = limpa(c[M.id])
  const ocorrido = instanteIso(limpa(c[M.mendata]))
  if (!gid || !ocorrido) return null
  const conf = numTexto(limpa(c[M.confianca]), 0)
  const tomDoc = numTexto(limpa(c[M.tom]).split(',')[0] ?? '', 4)
  return {
    gid,
    lugar: null, estado: null, atores: [],
    evento: {
      tipo: 'mencao_noticiosa', subtipo: `mencao_tipo_${limpa(c[M.mentipo]) || '0'}`,
      titulo: (limpa(c[M.menfonte]) || 'menção').slice(0, 500),
      ocorrido_em: ocorrido, observado_em: observadoEm,
      latitude: null, longitude: null,
      // Confidence vem de 0 a 100 no GDELT; a coluna confianca é 0 a 1.
      confianca: conf === null ? null : (Number(conf) / 100).toFixed(4),
      // MentionDocTone é o tom DAQUELE documento (-100 a 100), não o AvgTone "legacy" do evento.
      // A coluna tom vai de -10 a 10, então dividimos por 10.
      tom: tomDoc === null ? null : (Number(tomDoc) / 10).toFixed(3),
      valor: null, unidade: null,
      bruto: {
        global_event_id: gid, mention_time: ocorrido, event_time: instanteIso(limpa(c[M.evdata])),
        mention_source_name: limpa(c[M.menfonte]) || null, mention_identifier: limpa(c[M.menurl]) || null,
        mention_type: limpa(c[M.mentipo]) || null, in_raw_text: limpa(c[M.bruto]) || null,
        mention_doc_len: limpa(c[M.tamanho]) || null, confidence: limpa(c[M.confianca]) || null,
        arquivo: 'mentions', registro: 'mentions_2.0',
      },
      fonte: FONTE,
    },
  }
}

// --- Janela de coleta -------------------------------------------------------------------------

/** Carimbo do arquivo de 15 minutos: sempre :00, :15, :30 ou :45, em UTC. */
export function carimbo(d: Date): string {
  const q = new Date(Math.floor(d.getTime() / 900000) * 900000)
  const p = (n: number, c = 2) => String(n).padStart(c, '0')
  return `${q.getUTCFullYear()}${p(q.getUTCMonth() + 1)}${p(q.getUTCDate())}${p(q.getUTCHours())}${p(q.getUTCMinutes())}00`
}

/** Os `janela` carimbos que terminam em `ate` (mais antigo primeiro). */
export function carimbos(ate: string, janela: number): string[] {
  const base = instanteIso(ate)
  if (!base) return []
  const t = new Date(base).getTime()
  return Array.from({ length: janela }, (_, i) => carimbo(new Date(t - (janela - 1 - i) * 900000)))
}

const urlExport = (c: string) => `${BASE}/${c}.export.CSV.zip`
const urlMentions = (c: string) => `${BASE}/${c}.mentions.CSV.zip`

/** O que o GDELT diz ser a última atualização publicada. Sem ela, caímos no relógio local. */
export async function ultimoCarimbo(): Promise<string> {
  try {
    const r = await fetch(`${BASE}/lastupdate.txt`, { headers: UA, signal: AbortSignal.timeout(20000) })
    if (r.ok) {
      const m = (await r.text()).match(/(\d{14})\.export\.CSV\.zip/)
      if (m) return m[1]!
    } else console.error('lastupdate.txt recusado', r.status)
  } catch (e) { console.error('lastupdate.txt falhou', String((e as Error).message).slice(0, 200)) }
  // A atualização publicada tem alguns minutos de atraso; voltamos um quarto de hora.
  return carimbo(new Date(Date.now() - 900000))
}

async function baixarCsv(url: string): Promise<{ texto: string } | { erro: string }> {
  try {
    const r = await fetch(url, { headers: UA, signal: AbortSignal.timeout(60000) })
    if (!r.ok) return { erro: `HTTP ${r.status}` }
    return { texto: await primeiroDoZip(new Uint8Array(await r.arrayBuffer())) }
  } catch (e) {
    return { erro: String((e as Error).message ?? e).slice(0, 200) }
  }
}

// --- Gravação idempotente ---------------------------------------------------------------------
//
// POR QUE SQL DIRETO E NÃO O CLIENTE REST: a API REST deste projeto expõe só os esquemas public e
// graphql_public. Pedir instituto.eventos pelo supabase-js devolve PGRST106, "Invalid schema:
// instituto" (medido em 13/11/2026, com a função gdelt-coleta-sonda). Expor o esquema inteiro na
// API pública seria uma mudança de configuração do projeto, não uma gravação; e criar uma função
// RPC no esquema public exigiria migração nova. Então a função abre conexão com o Postgres pela
// SUPABASE_DB_URL, que a Edge Function já recebe, e escreve em SQL. O segredo fica no servidor.
//
// A unicidade real do esquema do C1:
//   eventos   -> UNIQUE (fonte, conteudo_hash)  ... é por aqui que a reexecução não duplica.
//   entidades -> UNIQUE (tipo, chave_natural)
//   lugares   -> UNIQUE (codigo_ibge) só quando não é nulo; NÃO há único em (fonte, conteudo_hash).
// Por causa dessa última linha, para o ponto geográfico procuramos primeiro pelo hash e só então
// inserimos o que falta. Ver database/migrations/123_lugares_unico_conteudo.sql, que cria o
// índice único que falta e que NÃO foi aplicado: depende de aprovação do dono do banco.

const pedacos = <T,>(xs: T[], n: number): T[][] => Array.from({ length: Math.ceil(xs.length / n) }, (_, i) => xs.slice(i * n, i * n + n))

export interface LinhaId { id: string; conteudo_hash: string }
export interface LinhaIbge { id: string; codigo_ibge: string | null; conteudo_hash: string }
export interface LinhaEnt { id: string; tipo: string; chave_natural: string }
export interface Vinculo { evento_id: string; entidade_id: string; papel: string }

/**
 * O pouco que a coleta precisa do banco. A implementação de produção fala SQL com o Postgres;
 * o teste passa uma versão em memória, e assim nenhum teste depende de banco nem de rede.
 */
export interface Banco {
  registrarFonte(l: Record<string, unknown>): Promise<void>
  lugaresPorIbge(ibges: string[]): Promise<{ id: string; codigo_ibge: string }[]>
  porHash(tabela: 'lugares' | 'eventos', hashes: string[]): Promise<LinhaId[]>
  inserirLugares(linhas: Record<string, unknown>[]): Promise<LinhaIbge[]>
  inserirEventos(linhas: Record<string, unknown>[]): Promise<LinhaId[]>
  entidadesPorChave(chaves: string[]): Promise<LinhaEnt[]>
  inserirEntidades(linhas: Record<string, unknown>[]): Promise<LinhaEnt[]>
  inserirVinculos(linhas: Vinculo[]): Promise<number>
  fechar(): Promise<void>
}

/** Colunas, na ordem em que as linhas são montadas. jsonb vai como texto e é convertido no SQL. */
const COLS = {
  lugares: ['tipo', 'nome', 'uf', 'codigo_ibge', 'pai_id', 'latitude', 'longitude', 'geometria', 'lat_min', 'lat_max', 'lon_min', 'lon_max', 'identificadores', 'fonte', 'conteudo_hash'],
  eventos: ['tipo', 'subtipo', 'titulo', 'ocorrido_em', 'observado_em', 'lugar_id', 'latitude', 'longitude', 'confianca', 'tom', 'valor', 'unidade', 'bruto', 'fonte', 'conteudo_hash'],
  entidades: ['tipo', 'nome', 'identificadores', 'chave_natural', 'atributos', 'fonte', 'conteudo_hash'],
} as const
const JSONB = new Set(['geometria', 'identificadores', 'atributos', 'bruto'])

/** "($1,$2::jsonb,...),($3,...)" com os valores na ordem das colunas. */
export function valoresSql(cols: readonly string[], linhas: Record<string, unknown>[]): { sql: string; params: unknown[] } {
  const params: unknown[] = []
  const grupos = linhas.map(l => '(' + cols.map(c => {
    const v = l[c] ?? null
    params.push(JSONB.has(c) && v !== null ? JSON.stringify(v) : v)
    return `$${params.length}${JSONB.has(c) ? '::jsonb' : ''}`
  }).join(',') + ')')
  return { sql: grupos.join(','), params }
}

/** Banco de produção: Postgres pela SUPABASE_DB_URL, só a service role chega aqui. */
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
    lugaresPorIbge: (ibges) => linhas(`select id::text, codigo_ibge from instituto.lugares where codigo_ibge = any($1::text[])`, [ibges]),
    porHash: (tabela, hashes) => linhas(`select id::text, conteudo_hash from instituto.${tabela} where fonte = $1 and conteudo_hash = any($2::text[])`, [FONTE, hashes]),
    async inserirLugares(ls) {
      const v = valoresSql(COLS.lugares, ls)
      return linhas(`insert into instituto.lugares (${COLS.lugares.join(',')}) values ${v.sql}
        on conflict do nothing returning id::text, codigo_ibge, conteudo_hash`, v.params)
    },
    async inserirEventos(ls) {
      const v = valoresSql(COLS.eventos, ls)
      return linhas(`insert into instituto.eventos (${COLS.eventos.join(',')}) values ${v.sql}
        on conflict (fonte, conteudo_hash) do nothing returning id::text, conteudo_hash`, v.params)
    },
    entidadesPorChave: (chaves) => linhas(`select id::text, tipo, chave_natural from instituto.entidades where chave_natural = any($1::text[])`, [chaves]),
    async inserirEntidades(ls) {
      const v = valoresSql(COLS.entidades, ls)
      return linhas(`insert into instituto.entidades (${COLS.entidades.join(',')}) values ${v.sql}
        on conflict (tipo, chave_natural) do nothing returning id::text, tipo, chave_natural`, v.params)
    },
    async inserirVinculos(ls) {
      const v = valoresSql(['evento_id', 'entidade_id', 'papel'], ls as unknown as Record<string, unknown>[])
      const r = await linhas<Vinculo>(`insert into instituto.evento_entidades (evento_id, entidade_id, papel) values ${v.sql}
        on conflict do nothing returning evento_id::text, entidade_id::text, papel`, v.params)
      return r.length
    },
    fechar: () => c.end(),
  }
}

/** Procura pelo hash, insere o que falta, devolve hash -> id e quantos eram novos. */
async function garantirPorHash(db: Banco, tabela: 'lugares' | 'eventos', linhas: { chave: string; linha: Record<string, unknown> }[]) {
  const mapa = new Map<string, string>()
  let novos = 0
  const unicas = [...new Map(linhas.map(l => [l.chave, l])).values()]
  for (const bloco of pedacos(unicas, 150)) {
    for (const a of await db.porHash(tabela, bloco.map(b => b.chave))) mapa.set(a.conteudo_hash, a.id)
    const faltam = bloco.filter(b => !mapa.has(b.chave))
    if (!faltam.length) continue
    const linhasNovas = faltam.map(f => f.linha)
    const ins = tabela === 'eventos' ? await db.inserirEventos(linhasNovas) : await db.inserirLugares(linhasNovas)
    for (const i of ins) { mapa.set(i.conteudo_hash, i.id); novos++ }
  }
  return { mapa, novos }
}

export interface Resumo {
  em: string; carimbos: string[]; linhas_lidas: number; linhas_brasil: number
  eventos_novos: number; eventos_repetidos: number
  entidades_novas: number; lugares_novos: number; vinculos_novos: number
  mencoes_lidas: number; mencoes_novas: number; mencoes_repetidas: number
  ms: number; falhas: string[]
}

/** O GDELT em instituto.fontes, com a licença e uso_comercial = true (confirmado no C15). */
export const FONTE_GDELT = {
  codigo: FONTE, nome: 'GDELT 2.0 (Events, Mentions)', url: 'https://www.gdeltproject.org',
  licenca: 'GDELT Project Terms of Use — uso acadêmico, comercial ou governamental sem taxa, com citação ao GDELT Project e link para o site obrigatórios (https://www.gdeltproject.org/about.html)',
  uso_comercial: true,
  observacao: 'Uso comercial permitido com atribuição ao GDELT Project e link para o site. Produzido por máquina, sem revisão humana: vendemos leitura de atenção da imprensa, nunca registro factual. Não ingerimos GCAM, VGKG nem a camada de TV (direitos do Internet Archive). Não ingerimos GoldsteinScale, AvgTone, NumMentions/NumSources/NumArticles, etnia nem religião.',
}

/** Coleta e grava uma janela. Devolve contagens reais: o que entrou e o que já estava lá. */
export async function coletar(db: Banco, opcoes: { ate: string; janela: number; limite: number; mencoes: boolean; agora: string }): Promise<Resumo> {
  const t0 = Date.now()
  const { ate, janela, limite, mencoes, agora } = opcoes
  const marcas = carimbos(ate, janela)
  const falhas: string[] = []
  let lidas = 0, mencoesLidas = 0

  // 1) Eventos do Brasil, até o teto.
  const mapeados: Mapeado[] = []
  for (const c of marcas) {
    if (mapeados.length >= limite) break
    const r = await baixarCsv(urlExport(c))
    if ('erro' in r) { falhas.push(`${c}.export: ${r.erro}`); continue }
    for (const col of linhasCsv(r.texto)) {
      lidas++
      if (!doBrasil(col)) continue
      if (mapeados.length >= limite) break
      const m = mapearEvento(col, agora)
      if (m) mapeados.push(m)
    }
  }
  const gids = new Set(mapeados.map(m => m.gid))

  // 2) Menções, só dos eventos que ficaram (e também até o teto).
  const mapeadasMencoes: Mapeado[] = []
  if (mencoes && gids.size) {
    for (const c of marcas) {
      if (mapeadasMencoes.length >= limite) break
      const r = await baixarCsv(urlMentions(c))
      if ('erro' in r) { falhas.push(`${c}.mentions: ${r.erro}`); continue }
      for (const col of linhasCsv(r.texto)) {
        mencoesLidas++
        if (!gids.has(limpa(col[M.id]))) continue
        if (mapeadasMencoes.length >= limite) break
        const m = mapearMencao(col, agora)
        if (m) mapeadasMencoes.push(m)
      }
    }
  }

  await db.registrarFonte(FONTE_GDELT)

  // 3) UFs e pontos. Primeiro a UF, porque o ponto aponta para ela em pai_id.
  //    A UF tem índice único de verdade em codigo_ibge: procuramos por ele e inserimos o que falta.
  const ufs = new Map<string, Lugar>()
  for (const m of mapeados) if (m.estado) ufs.set(m.estado.codigo_ibge!, m.estado)
  const idPorIbge = new Map<string, string>()
  let lugaresNovos = 0
  if (ufs.size) {
    for (const l of await db.lugaresPorIbge([...ufs.keys()])) idPorIbge.set(l.codigo_ibge, l.id)
    const faltam = [...ufs.values()].filter(l => !idPorIbge.has(l.codigo_ibge!))
    if (faltam.length) {
      const linhas = await Promise.all(faltam.map(async l => ({ ...linhaLugar(l, null), conteudo_hash: await hashConteudo(camposHash.lugar(l)) })))
      for (const l of await db.inserirLugares(linhas)) { if (l.codigo_ibge) idPorIbge.set(l.codigo_ibge, l.id); lugaresNovos++ }
    }
  }

  const pontos = new Map<string, { chave: string; linha: Record<string, unknown> }>()
  for (const m of mapeados) {
    if (!m.lugar) continue
    const chave = await hashConteudo(camposHash.lugar(m.lugar))
    pontos.set(chave, { chave, linha: { ...linhaLugar(m.lugar, m.lugar.pai_chave ? idPorIbge.get(m.lugar.pai_chave) ?? null : null), conteudo_hash: chave } })
  }
  const lugares = await garantirPorHash(db, 'lugares', [...pontos.values()])
  lugaresNovos += lugares.novos

  // 4) Entidades. A chave de reencontro é (tipo, chave_natural), que tem índice único.
  const porChave = new Map<string, { tipo: string; chave_natural: string; linha: Record<string, unknown> }>()
  for (const m of mapeados) for (const a of m.atores) {
    const k = `${a.entidade.tipo}|${a.entidade.chave_natural}`
    if (porChave.has(k)) continue
    porChave.set(k, { tipo: a.entidade.tipo, chave_natural: a.entidade.chave_natural, linha: { ...a.entidade, conteudo_hash: await hashConteudo(camposHash.entidade(a.entidade)) } })
  }
  const idEntidade = new Map<string, string>()
  let entidadesNovas = 0
  for (const bloco of pedacos([...porChave.values()], 150)) {
    for (const e of await db.entidadesPorChave(bloco.map(b => b.chave_natural))) idEntidade.set(`${e.tipo}|${e.chave_natural}`, e.id)
    const faltam = bloco.filter(b => !idEntidade.has(`${b.tipo}|${b.chave_natural}`))
    if (!faltam.length) continue
    for (const e of await db.inserirEntidades(faltam.map(f => f.linha))) { idEntidade.set(`${e.tipo}|${e.chave_natural}`, e.id); entidadesNovas++ }
  }

  // 5) Eventos. Aqui o único (fonte, conteudo_hash) existe de verdade: a segunda execução
  //    encontra tudo já gravado e insere zero.
  const comLugar = await Promise.all(mapeados.map(async m => {
    const lugarId = m.lugar ? lugares.mapa.get(await hashConteudo(camposHash.lugar(m.lugar))) ?? null : null
    const ev = { ...m.evento, lugar_id: lugarId }
    const chave = await hashConteudo(camposHash.evento(ev))
    return { m, chave, linha: { ...linhaEvento(ev), conteudo_hash: chave } }
  }))
  const eventos = await garantirPorHash(db, 'eventos', comLugar)

  // 6) Quem participou de quê, e em que papel.
  const vinculos = new Map<string, Vinculo>()
  for (const x of comLugar) {
    const evento_id = eventos.mapa.get(x.chave)
    if (!evento_id) continue
    for (const a of x.m.atores) {
      const entidade_id = idEntidade.get(`${a.entidade.tipo}|${a.entidade.chave_natural}`)
      if (entidade_id) vinculos.set(`${evento_id}|${entidade_id}|${a.papel}`, { evento_id, entidade_id, papel: a.papel })
    }
  }
  let vinculosNovos = 0
  for (const bloco of pedacos([...vinculos.values()], 300)) vinculosNovos += await db.inserirVinculos(bloco)

  // 7) Menções, como eventos próprios.
  const menLinhas = await Promise.all(mapeadasMencoes.map(async m => {
    const chave = await hashConteudo(camposHash.evento(m.evento))
    return { chave, linha: { ...linhaEvento(m.evento), conteudo_hash: chave } }
  }))
  const mencoesGravadas = menLinhas.length ? await garantirPorHash(db, 'eventos', menLinhas) : { novos: 0 }

  return {
    em: agora, carimbos: marcas, linhas_lidas: lidas, linhas_brasil: mapeados.length,
    eventos_novos: eventos.novos, eventos_repetidos: mapeados.length - eventos.novos,
    entidades_novas: entidadesNovas, lugares_novos: lugaresNovos, vinculos_novos: vinculosNovos,
    mencoes_lidas: mencoesLidas, mencoes_novas: mencoesGravadas.novos,
    mencoes_repetidas: mapeadasMencoes.length - mencoesGravadas.novos,
    ms: Date.now() - t0, falhas,
  }
}

/** Linha de lugares como o banco a quer (decimais como texto, para o hash bater). */
function linhaLugar(l: Lugar, paiId: string | null): Record<string, unknown> {
  return {
    tipo: l.tipo, nome: l.nome, uf: l.uf, codigo_ibge: l.codigo_ibge, pai_id: paiId,
    latitude: l.latitude, longitude: l.longitude, geometria: null,
    lat_min: l.lat_min ?? null, lat_max: l.lat_max ?? null, lon_min: l.lon_min ?? null, lon_max: l.lon_max ?? null,
    identificadores: l.identificadores, fonte: l.fonte,
  }
}

/** Linha de eventos como o banco a quer. ocorrido_em e observado_em vão como vieram, sem igualar. */
function linhaEvento(v: Evento): Record<string, unknown> {
  return {
    tipo: v.tipo, subtipo: v.subtipo, titulo: v.titulo,
    ocorrido_em: v.ocorrido_em, observado_em: v.observado_em,
    lugar_id: v.lugar_id ?? null, latitude: v.latitude, longitude: v.longitude,
    confianca: v.confianca, tom: v.tom, valor: null, unidade: null,
    bruto: v.bruto, fonte: v.fonte,
  }
}

// --- Porta -------------------------------------------------------------------------------------

async function segredoOk(req: Request): Promise<boolean> {
  const enviado = req.headers.get('x-cron-secret')
  if (!enviado) return false
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!data?.valor && data.valor === enviado
}

const inteiro = (v: unknown, padrao: number, min: number, max: number) =>
  Math.min(max, Math.max(min, Math.trunc(Number(v)) || padrao))

/** O teste troca isto por um banco em memória; em produção abre o Postgres. */
export const abrirBanco: { criar: () => Promise<Banco> } = { criar: bancoPostgres }

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  // A mesma guarda de coletor-instituto e gdelt-juridico: só o robô agendado coleta.
  if (!(await segredoOk(req))) return json({ erro: 'Acesso só pela coleta agendada.' }, 401)

  const corpo = await req.json().catch(() => ({})) as Record<string, unknown>
  const q = new URL(req.url).searchParams
  const bruto = (k: string) => corpo[k] ?? q.get(k) ?? undefined
  // Padrões pequenos de propósito: uma janela de 15 minutos, 300 eventos. Tetos rígidos para
  // uma invocação nunca sair do controle.
  const janela = inteiro(bruto('janela'), 1, 1, 8)
  const limite = inteiro(bruto('limite'), 300, 1, 3000)
  const mencoes = String(bruto('mencoes') ?? 'true') !== 'false'
  const pedido = String(bruto('ate') ?? '')
  const ate = /^\d{14}$/.test(pedido) ? pedido : await ultimoCarimbo()

  let db: Banco | null = null
  try {
    db = await abrirBanco.criar()
    const r = await coletar(db, { ate, janela, limite, mencoes, agora: new Date().toISOString() })
    return json({ ok: true, ...r })
  } catch (e) {
    // Erro vai para o log, nunca para quem chamou.
    console.error('gdelt-coleta falhou', e)
    return json({ erro: 'A coleta do GDELT não pôde ser concluída.' }, 500)
  } finally {
    await db?.fechar().catch(e => console.error('conexão não fechada', e))
  }
})
