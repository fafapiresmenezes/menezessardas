// Bloco B15 (pedido de M, 06/11/2026): leitor diário de mercados de predição e de dados de fronteira da IA.
// Só APIs públicas e gratuitas (POLITICA_DIREITOS do THE EYE: nada pago), só leitura, só números:
//   Polymarket (Gamma API), Kalshi (API pública de mercados) e Epoch AI (CSV de modelos notáveis, CC BY 4.0).
// Guarda em instituto.motor_series a probabilidade "sim" do dia, o volume e, quando o mercado fecha, o desfecho (0/1),
// para o site calcular desvio-padrão de 30 dias e o erro de calibragem histórico. Nunca guarda nome de pessoa.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const pub = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')
const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (leitura diaria de agregados; contato via instituto-theye.vercel.app)', Accept: 'application/json, text/csv' }

/** Palavras que ligam um mercado ao direito e à economia brasileira ou à fronteira da IA. Lista fixa (pré-registrada). */
export const PALAVRAS = ['brazil', 'brasil', 'lula', 'bolsonaro', 'selic', 'copom', 'real ', 'brl', 'supremo', 'stf', 'petrobras', 'amazon rainforest', 'ai regulation', 'artificial intelligence', 'openai', 'agi', 'gpt', 'claude', 'gemini', 'supreme court', 'fed ', 'interest rate']
export const relevante = (texto: string) => { const t = ` ${texto.toLowerCase()} `; return PALAVRAS.some(p => t.includes(p)) }
const slugify = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60)
const num = (x: unknown) => { const n = typeof x === 'string' ? Number(x) : (x as number); return Number.isFinite(n) ? n : null }

export type Serie = { fonte: string; serie: string; data_ref: string; valor: number }
export type Mercado = { fonte: 'polymarket' | 'kalshi'; id: string; titulo: string; p_sim: number; volume: number | null; fecha_em: string | null; resolvido: 0 | 1 | null }

/** Polymarket: eventos abertos por etiqueta; cada mercado binário vira p_sim = preço do "Yes". */
export function lerPolymarket(corpo: unknown): Mercado[] {
  const eventos = Array.isArray(corpo) ? corpo : []
  const out: Mercado[] = []
  for (const ev of eventos as Record<string, unknown>[]) {
    for (const m of (ev.markets as Record<string, unknown>[] | undefined) ?? []) {
      const titulo = String(m.question ?? ev.title ?? '')
      if (!relevante(`${ev.title ?? ''} ${titulo}`)) continue
      let precos: unknown = m.outcomePrices, nomes: unknown = m.outcomes
      try { if (typeof precos === 'string') precos = JSON.parse(precos) } catch { precos = null }
      try { if (typeof nomes === 'string') nomes = JSON.parse(nomes) } catch { nomes = null }
      if (!Array.isArray(precos) || !Array.isArray(nomes)) continue
      const iSim = (nomes as string[]).findIndex(n => String(n).toLowerCase() === 'yes')
      const p = num((precos as unknown[])[iSim >= 0 ? iSim : 0])
      if (p === null || p < 0 || p > 1) continue
      const fechado = m.closed === true
      out.push({ fonte: 'polymarket', id: slugify(String(m.slug ?? m.id ?? titulo)), titulo: titulo.slice(0, 200), p_sim: Math.round(p * 10000) / 10000, volume: num(m.volumeNum ?? m.volume), fecha_em: m.endDate ? String(m.endDate).slice(0, 10) : null, resolvido: fechado ? (p >= 0.5 ? 1 : 0) : null })
    }
  }
  return out
}

/** Kalshi: mercados abertos; p_sim = ponto médio entre compra e venda do "yes" (centavos), ou último preço. */
export function lerKalshi(corpo: unknown): Mercado[] {
  const ms = ((corpo as { markets?: Record<string, unknown>[] })?.markets) ?? []
  const out: Mercado[] = []
  for (const m of ms) {
    const titulo = String(m.title ?? m.subtitle ?? '')
    if (!relevante(`${titulo} ${m.event_ticker ?? ''}`)) continue
    const bid = num(m.yes_bid), ask = num(m.yes_ask), ultimo = num(m.last_price)
    const cents = bid !== null && ask !== null && ask > 0 ? (bid + ask) / 2 : ultimo
    if (cents === null) continue
    const st = String(m.status ?? '')
    const resultado = String(m.result ?? '')
    out.push({ fonte: 'kalshi', id: slugify(String(m.ticker ?? titulo)), titulo: titulo.slice(0, 200), p_sim: Math.round(cents) / 100, volume: num(m.volume), fecha_em: m.close_time ? String(m.close_time).slice(0, 10) : null, resolvido: st === 'finalized' || st === 'settled' ? (resultado === 'yes' ? 1 : 0) : null })
  }
  return out
}

/** Epoch AI, modelos notáveis (CSV): quantos modelos e o maior treino (log10 FLOP) até a data. Só agregados. */
export function lerEpoch(csv: string): { modelos: number; log10_compute_max: number | null } {
  const linhas = csv.split(/\r?\n/).filter(l => l.trim())
  if (linhas.length < 2) return { modelos: 0, log10_compute_max: null }
  const cab = linhas[0].split(',').map(c => c.replace(/"/g, '').trim().toLowerCase())
  const iC = cab.findIndex(c => c.startsWith('training compute'))
  let max = 0
  for (const l of linhas.slice(1)) {
    if (iC < 0) break
    const partes = l.match(/("([^"]|"")*"|[^,]*)(,|$)/g) ?? []
    const v = Number(String(partes[iC] ?? '').replace(/[",]/g, ''))
    if (Number.isFinite(v) && v > max) max = v
  }
  return { modelos: linhas.length - 1, log10_compute_max: max > 0 ? Math.round(Math.log10(max) * 100) / 100 : null }
}

export function paraSeries(ms: Mercado[], dia: string): Serie[] {
  const s: Serie[] = []
  for (const m of ms) {
    s.push({ fonte: 'mercados', serie: `${m.fonte}:${m.id}:p`, data_ref: dia, valor: m.p_sim })
    if (m.volume !== null) s.push({ fonte: 'mercados', serie: `${m.fonte}:${m.id}:volume`, data_ref: dia, valor: Math.round(m.volume) })
    if (m.resolvido !== null) s.push({ fonte: 'mercados', serie: `${m.fonte}:${m.id}:resolvido`, data_ref: dia, valor: m.resolvido })
  }
  return s
}

type Fonte = { nome: string; url: string; ler: (texto: string) => { itens: number; series: Serie[]; titulos?: Record<string, string> } }
export const FONTES = (dia: string): Fonte[] => [
  ...['brazil', 'economy', 'ai', 'politics'].map(tag => ({
    nome: `polymarket:${tag}`, url: `https://gamma-api.polymarket.com/events?closed=false&limit=100&tag_slug=${tag}&order=volume24hr&ascending=false`,
    ler: (t: string) => { const ms = lerPolymarket(JSON.parse(t)); return { itens: ms.length, series: paraSeries(ms, dia), titulos: Object.fromEntries(ms.map(m => [`${m.fonte}:${m.id}`, m.titulo])) } },
  })),
  { nome: 'polymarket:fechados', url: 'https://gamma-api.polymarket.com/markets?closed=true&limit=200&order=endDate&ascending=false',
    ler: (t: string) => { const ms = lerPolymarket([{ markets: JSON.parse(t) }]); return { itens: ms.length, series: paraSeries(ms, dia).filter(s => s.serie.endsWith(':resolvido')) } } },
  { nome: 'kalshi:abertos', url: 'https://api.elections.kalshi.com/trade-api/v2/markets?status=open&limit=1000',
    ler: (t: string) => { const ms = lerKalshi(JSON.parse(t)); return { itens: ms.length, series: paraSeries(ms, dia), titulos: Object.fromEntries(ms.map(m => [`${m.fonte}:${m.id}`, m.titulo])) } } },
  { nome: 'kalshi:liquidados', url: 'https://api.elections.kalshi.com/trade-api/v2/markets?status=settled&limit=1000',
    ler: (t: string) => { const ms = lerKalshi(JSON.parse(t)); return { itens: ms.length, series: paraSeries(ms, dia).filter(s => s.serie.endsWith(':resolvido')) } } },
  { nome: 'epoch_ai:modelos_notaveis', url: 'https://epoch.ai/data/notable_ai_models.csv',
    ler: (t: string) => { const e = lerEpoch(t); const s: Serie[] = [{ fonte: 'epoch_ai', serie: 'modelos_notaveis_n', data_ref: dia, valor: e.modelos }]; if (e.log10_compute_max !== null) s.push({ fonte: 'epoch_ai', serie: 'log10_compute_max', data_ref: dia, valor: e.log10_compute_max }); return { itens: e.modelos, series: s } } },
]

async function coletar(f: Fonte) {
  const t0 = Date.now()
  try {
    const r = await fetch(f.url, { headers: UA, signal: AbortSignal.timeout(45000) })
    const texto = await r.text()
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })
    const { itens, series, titulos } = f.ler(texto)
    const linha = { fonte: f.nome, ok: true, status: r.status, itens, sha256: await sha256(texto), ms: Date.now() - t0 }
    await pub().rpc('instituto_motor_gravar', { p_coleta: linha, p_series: series })
    if (titulos && Object.keys(titulos).length) await pub().rpc('instituto_mercados_titulos', { p_titulos: titulos })
    return linha
  } catch (e) {
    const linha = { fonte: f.nome, ok: false, status: (e as { status?: number }).status ?? null, itens: 0, erro: String((e as Error).message).slice(0, 300), ms: Date.now() - t0 }
    await pub().rpc('instituto_motor_gravar', { p_coleta: linha, p_series: [] })
    return linha
  }
}

Deno.serve(async (req) => {
  const enviado = req.headers.get('x-cron-secret')
  const { data } = enviado ? await pub().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle() : { data: null }
  if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'Somente o robô diário pode ler os mercados.' }, 401)
  const dia = new Date().toISOString().slice(0, 10)
  const resultado = []
  for (const f of FONTES(dia)) { resultado.push(await coletar(f)); await new Promise(r => setTimeout(r, 800)) }
  return json({ em: new Date().toISOString(), dia, fontes: resultado.length, ok: resultado.filter(x => x.ok).length, resultado })
})
