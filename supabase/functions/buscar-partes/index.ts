// Busca gratuita de processos e publicações, com as mesmas fontes públicas que o Escavador agrega:
// - Comunica PJe (CNJ): comunicações processuais por nome da parte (só responde a IP do Brasil; o Supabase é);
// - Querido Diário (Open Knowledge Brasil): diários oficiais municipais por termo;
// - DataJud (CNJ): capa e movimentos do processo pelo número CNJ.
// Uso restrito à equipe autenticada (finalidade: exercício regular de direitos, LGPD art. 7º, VI).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const servico = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const UF_TR = ['', 'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to']
const limpa = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

/** Número CNJ NNNNNNN-DD.AAAA.J.TR.OOOO → índice do DataJud (tjrj, trt1, trf2…). */
function tribunalDoNumero(n: string): string | null {
  const d = n.replace(/\D/g, '')
  if (d.length !== 20) return null
  const j = d[13], tr = Number(d.slice(14, 16))
  if (j === '8') return UF_TR[tr] ? `tj${UF_TR[tr]}` : null
  if (j === '5') return `trt${tr}`
  if (j === '4') return `trf${tr}`
  return null
}

async function comunica(nome: string) {
  const fim = new Date().toISOString().slice(0, 10)
  const inicio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
  const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?nomeParte=${encodeURIComponent(nome)}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=50&pagina=1`
  const r = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `Comunica PJe ${r?.status ?? 'sem resposta'}` }
  const d = await r.json().catch(() => ({ items: [] }))
  const itens = (d.items ?? []).map((i: Record<string, any>) => ({
    data: i.data_disponibilizacao, tribunal: i.siglaTribunal, orgao: i.nomeOrgao, tipo: i.tipoComunicacao, classe: i.nomeClasse,
    numero: i.numeroprocessocommascara ?? i.numero_processo, trecho: limpa(String(i.texto ?? '')).slice(0, 400), link: i.link,
  }))
  return { ok: true, total: d.count ?? itens.length, itens }
}

async function queridoDiario(termo: string) {
  const url = `https://api.queridodiario.ok.org.br/gazettes?querystring=${encodeURIComponent(`"${termo}"`)}&size=10&excerpt_size=300&number_of_excerpts=1&sort_by=descending_date`
  const r = await fetch(url, { signal: AbortSignal.timeout(40000), headers: { 'User-Agent': 'Mozilla/5.0 (LSM plataforma)' } }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `Querido Diário ${r?.status ?? 'sem resposta'}` }
  const d = await r.json().catch(() => ({ gazettes: [] }))
  return { ok: true, total: d.total_gazettes ?? 0, itens: (d.gazettes ?? []).map((g: Record<string, any>) => ({
    data: g.date, municipio: `${g.territory_name}/${g.state_code}`, trecho: limpa(String(g.excerpts?.[0] ?? '')), link: g.url,
  })) }
}

async function datajud(numero: string) {
  const indice = tribunalDoNumero(numero)
  if (!indice) return { ok: false, erro: 'Número CNJ inválido ou tribunal não coberto.' }
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${indice}/_search`, {
    method: 'POST', headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(40000),
    body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numero.replace(/\D/g, '') } } }),
  }).catch(() => null)
  if (!r?.ok) return { ok: false, erro: `DataJud ${r?.status ?? 'sem resposta'}` }
  const h = (await r.json()).hits?.hits?.[0]?._source
  if (!h) return { ok: true, encontrado: false, tribunal: indice.toUpperCase() }
  const movs = (h.movimentos ?? []).sort((a: any, b: any) => String(b.dataHora).localeCompare(String(a.dataHora))).slice(0, 15)
  return { ok: true, encontrado: true, tribunal: h.tribunal, classe: h.classe?.nome, orgao: h.orgaoJulgador?.nome, ajuizamento: h.dataAjuizamento,
    assuntos: (h.assuntos ?? []).map((a: any) => a.nome).filter(Boolean), movimentos: movs.map((m: any) => ({ data: m.dataHora, nome: m.nome })) }
}

/** Buscas salvas (Passo 03): repete cada termo no Comunica PJe e grava as comunicações novas em `intimacoes`
 *  com oab = 'busca:<termo>', para aparecerem em Intimações, Meu dia e Alertas. Roda todo dia (cron) ou a pedido. */
async function rodarSalvas(soUsuario?: string) {
  const sb = servico()
  let q = sb.from('buscas_salvas').select('id, usuario_id, termo, caso_id')
  if (soUsuario) q = q.eq('usuario_id', soUsuario)
  const { data: buscas } = await q
  const resumo: { termo: string; total: number; novas: number; erro?: string; caso?: string }[] = []
  for (const b of buscas ?? []) {
    const c = await comunica(b.termo)
    if (!c.ok) { resumo.push({ termo: b.termo, total: 0, novas: 0, erro: c.erro }); continue }
    const itens = (c.itens ?? []) as Record<string, any>[]
    let novas = 0
    if (itens.length) {
      const fim = new Date().toISOString().slice(0, 10)
      const inicio = new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10)
      const url = `https://comunicaapi.pje.jus.br/api/v1/comunicacao?nomeParte=${encodeURIComponent(b.termo)}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=50&pagina=1`
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
      const brutos = r?.ok ? ((await r.json().catch(() => ({ items: [] }))).items ?? []) as Record<string, any>[] : []
      const linhas = brutos.filter(i => i.id).map(i => ({
        id: i.id, oab: `busca:${b.termo}`, data_disponibilizacao: i.data_disponibilizacao, tribunal: i.siglaTribunal, orgao: i.nomeOrgao,
        tipo: i.tipoComunicacao, classe: i.nomeClasse, numero_processo: i.numeroprocessocommascara ?? i.numero_processo,
        texto: limpa(String(i.texto ?? '')).slice(0, 6000), link: i.link, destinatarios: i.destinatarios ?? [],
      }))
      if (linhas.length) {
        const { count } = await sb.from('intimacoes').select('id', { count: 'exact', head: true }).in('id', linhas.map(l => l.id))
        await sb.from('intimacoes').upsert(linhas, { onConflict: 'id', ignoreDuplicates: true })
        novas = linhas.length - (count ?? 0)
      }
    }
    await sb.from('buscas_salvas').update({ ultima_execucao: new Date().toISOString(), ultimo_total: c.total ?? itens.length, novas_ultima: novas }).eq('id', b.id)
    // Passo 46: busca ligada a um caso → comunicação nova vira tarefa do responsável (aparece em Meu dia e em Alertas).
    if (novas > 0 && b.caso_id) {
      const { data: caso } = await sb.from('tarefas').select('id, titulo, responsavel_id, criado_por, escritorio_id, area, cliente').eq('id', b.caso_id).maybeSingle()
      if (caso) await sb.from('tarefas').insert({ nivel: 'tarefa', pai_id: caso.id, titulo: `Nova comunicação no Comunica PJe: ${b.termo} (${novas} nova(s))`, descricao: `A busca salva "${b.termo}" encontrou ${novas} comunicação(ões) nova(s). Confira em Intimações (filtro busca:${b.termo}) e junte ao caso "${caso.titulo}".`, situacao: 'a_fazer', prioridade: 'alta', responsavel_id: caso.responsavel_id ?? caso.criado_por, criado_por: caso.criado_por, escritorio_id: caso.escritorio_id, area: caso.area, cliente: caso.cliente, prazo: new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10) })
    }
    resumo.push({ termo: b.termo, total: c.total ?? itens.length, novas, caso: b.caso_id ?? undefined })
  }
  return resumo
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  // A chave anon é pública: exige sessão de usuário (papel authenticated) no token, ou o segredo do cron.
  let usuario: string | undefined
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    if (claims.role !== 'authenticated') throw 0
    usuario = claims.sub
  } catch {
    const enviado = req.headers.get('x-cron-secret')
    const { data } = enviado ? await servico().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle() : { data: null }
    if (!enviado || !data?.valor || data.valor !== enviado) return json({ erro: 'Entre na plataforma para consultar.' }, 401)
  }
  const corpo = await req.json().catch(() => ({}))
  if (corpo.salvas) return json({ tipo: 'salvas', resumo: await rodarSalvas(usuario), executadoEm: new Date().toISOString() })
  const { termo = '' } = corpo
  const t = String(termo).trim()
  if (t.length < 4) return json({ erro: 'Digite um nome (mínimo 4 letras) ou o número do processo.' }, 400)
  const ehNumero = t.replace(/\D/g, '').length === 20
  if (ehNumero) return json({ tipo: 'numero', datajud: await datajud(t), consultadoEm: new Date().toISOString() })
  const [c, q] = await Promise.all([comunica(t), queridoDiario(t)])
  return json({ tipo: 'nome', comunica: c, queridoDiario: q, consultadoEm: new Date().toISOString() })
})
