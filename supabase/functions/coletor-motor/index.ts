// Instituto THEYE, U11: motor THE EYE na nuvem. 10 fontes públicas do PC de M, coletadas a cada 6 h pelo pg_cron.
// Só dados públicos e agregados. Cada coleta guarda status, contagem de itens e sha256 do conteúdo (para comparar com o PC).
// Séries numéricas (BCB SGS, Focus, SIDRA, Banco Mundial) vão para instituto.motor_series.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const pub = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const gravar = (c: unknown, s: unknown[] = []) => pub().rpc('instituto_motor_gravar', { p_coleta: c, p_series: s })
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')
const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; contato via instituto-theye.vercel.app)', Accept: 'application/json' }
const br = (d: string) => { const [a, b, c] = d.split('/'); return `${c}-${b}-${a}` }
type Serie = { serie: string; data_ref: string; valor: number | null }
type Fonte = { nome: string; url: () => string; ler: (t: string) => { itens: number; series?: Serie[] }; headers?: Record<string, string> }
const hoje = () => new Date().toISOString().slice(0, 10)
const ontem = () => new Date(Date.now() - 86400000).toISOString().slice(0, 10).replaceAll('-', '')
const SGS: Record<string, number> = { igpm: 189, ipca: 433, selic_meta: 432, dolar_ptax: 1 }

const FONTES: Fonte[] = [
  ...Object.entries(SGS).map(([nome, cod]): Fonte => ({
    nome: `bcb_sgs:${nome}`, url: () => `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${cod}/dados/ultimos/12?formato=json`,
    ler: t => { const a = JSON.parse(t); return { itens: a.length, series: a.map((x: any) => ({ serie: nome, data_ref: br(x.data), valor: Number(x.valor) })) } } })),
  { nome: 'bcb_olinda:focus_ipca', url: () => `https://olinda.bcb.gov.br/olinda/servico/Expectativas/versao/v1/odata/ExpectativaMercadoMensais?$top=40&$filter=Indicador%20eq%20'IPCA'&$orderby=Data%20desc&$format=json&$select=Data,DataReferencia,Mediana`,
    ler: t => { const a = JSON.parse(t).value ?? []; const vis = new Set<string>(); const s: Serie[] = []
      for (const x of a) { const k = x.Data + x.DataReferencia; if (vis.has(k)) continue; vis.add(k); s.push({ serie: `focus_ipca_${x.DataReferencia}`, data_ref: x.Data, valor: x.Mediana }) }
      return { itens: a.length, series: s } } },
  { nome: 'ibge_sidra:ipca_1737', url: () => 'https://apisidra.ibge.gov.br/values/t/1737/n1/all/v/63/p/last%2012',
    ler: t => { const a = JSON.parse(t).slice(1); return { itens: a.length, series: a.map((x: any) => ({ serie: 'ipca_mensal', data_ref: `${x.D3C.slice(0, 4)}-${x.D3C.slice(4, 6)}-01`, valor: Number(x.V) })) } } },
  { nome: 'camara_dados_abertos', url: () => 'https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=loca%C3%A7%C3%A3o&ordem=DESC&ordenarPor=id&itens=50',
    ler: t => ({ itens: (JSON.parse(t).dados ?? []).length }) },
  { nome: 'worldbank', url: () => 'https://api.worldbank.org/v2/country/BR/indicator/FP.CPI.TOTL.ZG?format=json&per_page=20',
    ler: t => { const a = JSON.parse(t)[1] ?? []; return { itens: a.length, series: a.filter((x: any) => x.value != null).map((x: any) => ({ serie: 'inflacao_anual', data_ref: `${x.date}-12-31`, valor: x.value })) } } },
  { nome: 'openalex', url: () => 'https://api.openalex.org/works?search=legal%20judgment%20prediction&per-page=25&sort=publication_date:desc',
    ler: t => ({ itens: (JSON.parse(t).results ?? []).length }) },
  { nome: 'inpe_queimadas', url: () => `https://dataserver-coids.inpe.br/queimadas/queimadas/focos/csv/diario/Brasil/focos_diario_br_${ontem()}.csv`,
    headers: { 'User-Agent': UA['User-Agent'] }, ler: t => ({ itens: Math.max(0, t.trim().split('\n').length - 1) }) },
]

async function coletar(f: Fonte) {
  const t0 = Date.now()
  try {
    const r = await fetch(f.url(), { headers: f.headers ?? UA, signal: AbortSignal.timeout(45000) })
    const texto = await r.text()
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })
    const { itens, series } = f.ler(texto)
    const linha = { fonte: f.nome, ok: true, status: r.status, itens, sha256: await sha256(texto), ms: Date.now() - t0 }
    await gravar(linha, (series ?? []).filter(s => s.valor != null && !Number.isNaN(s.valor)).map(s => ({ fonte: f.nome.split(':')[0], ...s })))
    return linha
  } catch (e) {
    const linha = { fonte: f.nome, ok: false, status: (e as any).status ?? null, itens: 0, erro: String((e as Error).message).slice(0, 300), ms: Date.now() - t0 }
    await gravar(linha)
    return linha
  }
}

Deno.serve(async (req) => {
  const enviado = req.headers.get('x-cron-secret')
  const { data } = await pub().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'não autorizado' }, 401)
  const r = await Promise.all(FONTES.map(coletar))
  return json({ em: new Date().toISOString(), dia: hoje(), fontes: r.length, ok: r.filter(x => x.ok).length, resultado: r })
})
