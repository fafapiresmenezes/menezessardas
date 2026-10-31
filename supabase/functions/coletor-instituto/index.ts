// Instituto THEYE, Passo 08: coleta aberta diária.
// DataJud (CNJ): processos de locação por tribunal, gravados anonimizados (número vira sha256; só códigos e datas de movimentos).
// DJEN (Comunica PJe): só o volume diário de comunicações por tribunal (agregado, sem nomes).
// Chamado pelo pg_cron com x-cron-secret; não é aberto ao público.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const TRIBUNAIS = ['tjrj', 'tjsp', 'tjmg']
const CLASSES = ['Despejo por Falta de Pagamento', 'Despejo por Falta de Pagamento Cumulado Com Cobrança', 'Despejo',
  'Renovatória de Locação', 'Revisional de Aluguel', 'Consignação em Pagamento']
const DESFECHOS: Record<number, string> = { 219: 'procedencia', 221: 'parcial', 220: 'improcedencia', 466: 'sem_merito', 385: 'acordo' }
const POR_CONSULTA = 100

const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const sha256 = async (t: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t)))).map(b => b.toString(16).padStart(2, '0')).join('')
const dia = (s?: string) => (s && /^\d{8}/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s?.slice(0, 10)) || null

async function segredoOk(req: Request) {
  const enviado = req.headers.get('x-cron-secret')
  if (!enviado) return false
  const { data } = await sb().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!data?.valor && data.valor === enviado
}

async function datajud(tribunal: string, classe: string) {
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`, {
    method: 'POST', headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(60000),
    body: JSON.stringify({
      size: POR_CONSULTA, sort: [{ dataHoraUltimaAtualizacao: { order: 'desc' } }],
      _source: ['numeroProcesso', 'classe', 'orgaoJulgador.nome', 'assuntos', 'dataAjuizamento', 'movimentos.codigo', 'movimentos.dataHora', 'dataHoraUltimaAtualizacao'],
      query: { bool: { filter: [{ match_phrase: { 'classe.nome': classe } }] } },
    }),
  })
  if (!r.ok) throw new Error(`${tribunal}/${classe}: ${r.status}`)
  const d = await r.json()
  const saida = []
  for (const h of d.hits?.hits ?? []) {
    const s = h._source ?? {}
    const movs = ((s.movimentos ?? []) as { codigo: number; dataHora?: string }[])
      .map(m => ({ c: m.codigo, d: m.dataHora?.slice(0, 10) })).sort((a, b) => String(a.d).localeCompare(String(b.d)))
    const fim = [...movs].reverse().find(m => DESFECHOS[m.c])
    saida.push({
      id: await sha256(`${tribunal}:${s.numeroProcesso}`), tribunal: tribunal.toUpperCase(), classe: s.classe?.nome ?? classe,
      classe_codigo: s.classe?.codigo ?? null, orgao: s.orgaoJulgador?.nome ?? null,
      assuntos: (s.assuntos ?? []).flat().map((a: { codigo: number; nome: string }) => ({ c: a?.codigo, n: a?.nome })),
      data_ajuizamento: dia(s.dataAjuizamento), desfecho: fim ? DESFECHOS[fim.c] : null, data_desfecho: fim?.d ?? null,
      movimentos: movs.slice(-200), n_movimentos: movs.length, atualizado_fonte: s.dataHoraUltimaAtualizacao ?? null,
    })
  }
  return saida
}

async function djen(tribunal: string, d: string) {
  const u = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?siglaTribunal=${tribunal.toUpperCase()}&dataDisponibilizacaoInicio=${d}&dataDisponibilizacaoFim=${d}&itensPorPagina=5&pagina=1`
  const r = await fetch(u, { signal: AbortSignal.timeout(25000) })
  if (!r.ok) throw new Error(`djen ${tribunal}: ${r.status}`)
  const j = await r.json()
  return { tribunal: tribunal.toUpperCase(), dia: d, comunicacoes: Number(j.count ?? 0) }
}

Deno.serve(async (req) => {
  if (!(await segredoOk(req))) return json({ erro: 'Acesso só pela coleta agendada.' }, 401)
  const { tribunais = TRIBUNAIS, classes = CLASSES } = await req.json().catch(() => ({}))
  const falhas: string[] = []
  const tarefas = (tribunais as string[]).flatMap(t => (classes as string[]).map(c => ({ t, c })))
  const processos: unknown[] = []
  // Até 6 consultas ao mesmo tempo para caber no tempo da função.
  for (let i = 0; i < tarefas.length; i += 6) {
    const lote = await Promise.allSettled(tarefas.slice(i, i + 6).map(x => datajud(x.t, x.c)))
    lote.forEach((r, k) => r.status === 'fulfilled' ? processos.push(...r.value) : falhas.push(String(r.reason?.message ?? tarefas[i + k].t)))
  }
  const ontem = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
  const vol = await Promise.allSettled((tribunais as string[]).map(t => djen(t, ontem)))
  const djenOk = vol.flatMap(r => r.status === 'fulfilled' ? [r.value] : (falhas.push(String(r.reason?.message)), []))
  // O mesmo processo pode vir em duas consultas; o banco recusa atualizar a mesma linha duas vezes.
  const unicos = [...new Map((processos as { id: string }[]).map(p => [p.id, p])).values()]
  const { data, error } = await sb().rpc('instituto_gravar_coleta', { p_processos: unicos, p_djen: djenOk, p_falhas: falhas })
  if (error) return json({ erro: error.message, falhas }, 500)
  return json({ ok: true, vistos: unicos.length, ...data, djen: djenOk, falhas })
})
