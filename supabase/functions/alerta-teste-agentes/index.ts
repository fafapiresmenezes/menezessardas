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

async function avisarFalhas(falhas: { verificacao: string; status_http: number; detalhe: string | null }[]): Promise<number> {
  const [{ data: cfg }, { data: admins }] = await Promise.all([
    db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente']),
    db.from('usuarios_perfis').select('email').eq('funcao', 'admin'),
  ])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const para = [...new Set((admins ?? []).map(a => a.email).filter(e => !!e && !e.endsWith('@exemplo.com')) as string[])]
  if (!conf.brevo_api_key || !conf.email_remetente || !para.length) return 0
  const quando = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const lista = falhas.map(f => `<li><strong>${f.verificacao}</strong>${f.status_http ? ` (HTTP ${f.status_http})` : ''}${f.detalhe ? `<br><span style="color:#666;font-size:12px">${f.detalhe.replace(/</g, '&lt;').slice(0, 200)}</span>` : ''}</li>`).join('')
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto">
    <div style="background:#8b1a1a;color:#fff;padding:18px"><h2 style="margin:0">Teste automático: ${falhas.length} falha(s) em ${quando}</h2></div>
    <div style="padding:16px;line-height:1.5"><p>O teste automático da plataforma encontrou problema em:</p><ul>${lista}</ul>
    <p>Na maioria das vezes é instabilidade de uma fonte externa (Banco Central, CNJ, Planalto) e se resolve sozinho no próximo teste. Se a falha repetir dois dias seguidos, avise o Instituto THEYE.</p>
    <p><a href="https://gmenezes-advogados.vercel.app/#/equipe">Abrir Área do administrador (histórico de 30 dias)</a></p></div>
    <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · aviso automático</p></div>`
  let enviados = 0
  for (const email of para) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Avisos GMenezes', email: conf.email_remetente }, to: [{ email }], subject: `Teste automático com falha: ${falhas.map(f => f.verificacao).join(', ').slice(0, 120)}`, htmlContent: html }),
    })
    if (r.ok) enviados++
  }
  if (enviados) await db.from('consumo_api').insert({ funcao: 'aviso de falha do teste automático', modelo: 'brevo-email', quantidade: enviados })
  return enviados
}

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
  // Passo 18: e-mail às administradoras quando algo falha. Na conferência horária do site só avisa
  // quando o estado muda (estava no ar e caiu), para não repetir o aviso a cada hora.
  let avisadas = 0
  if (falhas.length) {
    let avisar = true
    if (soSite) {
      const { data: ant } = await db.from('saude_sistema').select('ok').eq('verificacao', 'Site no ar (visual completo)').order('id', { ascending: false }).range(1, 1)
      avisar = ant?.[0]?.ok !== false
    }
    if (avisar) avisadas = await avisarFalhas(falhas)
  }
  return new Response(JSON.stringify({ total: resultados.length, falhas: falhas.length, avisadas, resultados }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
