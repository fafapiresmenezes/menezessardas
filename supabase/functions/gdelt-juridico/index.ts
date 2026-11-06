// Bloco B11: índice diário de notícias jurídicas por tema (GDELT), no mesmo padrão do motor THE EYE do PC de M:
// só agregados (percentual do noticiário brasileiro em português que fala do tema, por dia), nenhuma URL, nenhum nome.
// Fonte: GDELT DOC 2.0 API, modo timelinevol (uso livre com citação). Dia incompleto (hoje) não entra na série.
// Grava em instituto.motor_series (fonte 'gdelt', serie 'noticias_<tema>') pela RPC instituto_motor_gravar.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const pub = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')
const UA = { 'User-Agent': 'InstitutoTHEYE/1.0 (pesquisa; agregados diarios; contato via instituto-theye.vercel.app)', Accept: 'application/json' }

/** Temas jurídicos acompanhados. A consulta é fixa (pré-registrada em 06/11/2026); mudar um termo é mudar a série. */
export const TEMAS: { tema: string; rotulo: string; consulta: string }[] = [
  { tema: 'locacao', rotulo: 'Locação e aluguel', consulta: '(locação OR aluguel OR inquilino OR locatário)' },
  { tema: 'despejo', rotulo: 'Despejo e desocupação', consulta: '(despejo OR desocupação OR "ação de despejo")' },
  { tema: 'juros', rotulo: 'Juros e Selic', consulta: '(Selic OR "taxa de juros" OR Copom)' },
  { tema: 'inadimplencia', rotulo: 'Inadimplência', consulta: '(inadimplência OR inadimplente OR "nome sujo")' },
  { tema: 'judiciario', rotulo: 'Tribunais superiores', consulta: '(STF OR STJ OR "Supremo Tribunal" OR "Superior Tribunal")' },
  { tema: 'lgpd', rotulo: 'LGPD e dados pessoais', consulta: '(LGPD OR "dados pessoais" OR ANPD)' },
]

export const urlTema = (consulta: string, dias = 3) =>
  `https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(`${consulta} sourcecountry:BR sourcelang:por`)}&mode=timelinevol&format=json&timespan=${dias}d`

type Ponto = { date: string; value: number }
/** Média diária do volume (%). Só dias anteriores a `hoje` (o dia corrente está incompleto). */
export function mediasDiarias(resposta: unknown, hoje: string): { data_ref: string; valor: number; pontos: number }[] {
  const linha = (resposta as { timeline?: { data?: Ponto[] }[] })?.timeline?.[0]?.data ?? []
  const acc = new Map<string, { soma: number; n: number }>()
  for (const p of linha) {
    const d = String(p.date ?? '')
    if (d.length < 8 || typeof p.value !== 'number' || !Number.isFinite(p.value)) continue
    const dia = `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`
    if (dia >= hoje) continue
    const a = acc.get(dia) ?? { soma: 0, n: 0 }
    a.soma += p.value; a.n++; acc.set(dia, a)
  }
  return [...acc.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([data_ref, a]) => ({ data_ref, valor: Number((a.soma / a.n).toFixed(4)), pontos: a.n }))
}

async function coletar(t: typeof TEMAS[number], hoje: string, dias: number) {
  const t0 = Date.now()
  const nome = `gdelt:${t.tema}`
  try {
    const r = await fetch(urlTema(t.consulta, dias), { headers: UA, signal: AbortSignal.timeout(45000) })
    const texto = await r.text()
    if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status })
    let corpo: unknown
    try { corpo = JSON.parse(texto) } catch { throw new Error('resposta não é JSON (GDELT costuma devolver texto quando recusa a consulta)') }
    const dias_ = mediasDiarias(corpo, hoje)
    const linha = { fonte: nome, ok: true, status: r.status, itens: dias_.length, sha256: await sha256(texto), ms: Date.now() - t0 }
    await pub().rpc('instituto_motor_gravar', { p_coleta: linha, p_series: dias_.map(d => ({ fonte: 'gdelt', serie: `noticias_${t.tema}`, data_ref: d.data_ref, valor: d.valor })) })
    return { ...linha, dias: dias_ }
  } catch (e) {
    const linha = { fonte: nome, ok: false, status: (e as { status?: number }).status ?? null, itens: 0, erro: String((e as Error).message).slice(0, 300), ms: Date.now() - t0 }
    await pub().rpc('instituto_motor_gravar', { p_coleta: linha, p_series: [] })
    return linha
  }
}

Deno.serve(async (req) => {
  const enviado = req.headers.get('x-cron-secret')
  const { data } = enviado ? await pub().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle() : { data: null }
  if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'Somente o robô diário pode coletar.' }, 401)
  const dias = Math.min(30, Math.max(2, Number(new URL(req.url).searchParams.get('dias') ?? 3) || 3))
  const hoje = new Date().toISOString().slice(0, 10)
  const resultado = []
  for (const t of TEMAS) { resultado.push(await coletar(t, hoje, dias)); await new Promise(r => setTimeout(r, 1500)) } // uma consulta por vez, como o GDELT pede
  return json({ em: new Date().toISOString(), dia: hoje, temas: resultado.length, ok: resultado.filter(x => x.ok).length, resultado })
})
