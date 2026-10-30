import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const URL_BASE = Deno.env.get('SUPABASE_URL') ?? ''
const CHAVE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const db = createClient(URL_BASE, CHAVE)

const VERIFICACOES: { nome: string; fn: string; corpo?: unknown; query?: string; espera: (j: any) => boolean }[] = [
  { nome: 'Reajuste (Banco Central)', fn: 'indice-reajuste', corpo: { indice: 'igpm' }, espera: j => typeof j.acumulado12m === 'number' },
  { nome: 'Lei ao vivo (Planalto)', fn: 'assistente-juridico', corpo: { sonda: true, pergunta: 'renovação de locação comercial' }, espera: j => j.artigos > 0 },
  { nome: 'Agente guardião', fn: 'agente-guardiao', corpo: {}, espera: j => !!j.data },
  { nome: 'Jurimetria (CNJ)', fn: 'jurimetria', corpo: { tribunal: 'tjrj', acao: 'despejo' }, espera: j => typeof j.chanceExito === 'number' },
  { nome: 'Busca de legislação', fn: 'buscar-legislacao', query: '?q=locacao', espera: j => !j.erro },
  { nome: 'Consulta de CNPJ', fn: 'consultar-cnpj', query: '?cnpj=00000000000191', espera: j => j.empresa?.status === 'ativa' },
]

const SITE = 'https://gmenezes-advogados.vercel.app/'

// Confere se o site abre com visual e código completos: todo arquivo citado na página precisa responder.
async function verificarSite() {
  const t0 = Date.now()
  let ok = false, status = 0, detalhe = ''
  try {
    const r = await fetch(`${SITE}?verificacao=${t0}`, { signal: AbortSignal.timeout(30_000) })
    status = r.status
    const html = await r.text()
    const arquivos = [...html.matchAll(/(?:src|href)="(https:\/\/cdn\.jsdelivr\.net\/[^"]+\.(?:js|css))"/g)].map(m => m[1])
    if (!arquivos.some(a => a.endsWith('.css'))) detalhe = 'página sem arquivo de aparência (CSS)'
    for (const a of arquivos) {
      const x = await fetch(a, { signal: AbortSignal.timeout(30_000) })
      if (!x.ok) detalhe += ` ${x.status} ${a.split('/').pop()}`
    }
    ok = r.ok && arquivos.length > 0 && !detalhe
  } catch (e) {
    detalhe = String(e).slice(0, 300)
  }
  return { verificacao: 'Site no ar (visual completo)', ok, status_http: status, ms: Date.now() - t0, detalhe: detalhe.trim() || null }
}

Deno.serve(async (req) => {
  const resultados = [await verificarSite()]
  // ?so=site roda só a conferência do site (agendada a cada hora).
  const soSite = new URL(req.url).searchParams.get('so') === 'site'
  for (const v of soSite ? [] : VERIFICACOES) {
    const t0 = Date.now()
    let ok = false, status = 0, detalhe = ''
    try {
      const r = await fetch(`${URL_BASE}/functions/v1/${v.fn}${v.query ?? ''}`, {
        method: v.corpo ? 'POST' : 'GET',
        headers: { Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' },
        body: v.corpo ? JSON.stringify(v.corpo) : undefined,
        signal: AbortSignal.timeout(90_000),
      })
      status = r.status
      const j = await r.json().catch(() => ({}))
      ok = r.ok && v.espera(j)
      if (!ok) detalhe = JSON.stringify(j).slice(0, 300)
    } catch (e) {
      detalhe = String(e).slice(0, 300)
    }
    resultados.push({ verificacao: v.nome, ok, status_http: status, ms: Date.now() - t0, detalhe: detalhe || null })
  }
  await db.from('saude_sistema').insert(resultados)
  const falhas = resultados.filter(r => !r.ok)
  return new Response(JSON.stringify({ total: resultados.length, falhas: falhas.length, resultados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
