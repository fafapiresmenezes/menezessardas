// Intimações e publicações do Diário de Justiça Eletrônico Nacional (Comunica PJe, CNJ), gratuito:
// busca pelas OABs do escritório (configuracoes.oabs_monitoradas) e guarda na tabela intimacoes.
// Roda todo dia pelo cron (com segredo) ou pelo botão "Buscar agora".
import { createClient } from 'jsr:@supabase/supabase-js@2'

const API = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const espera = () => new Promise(r => setTimeout(r, Number(Deno.env.get('INTIMACOES_ESPERA_MS') ?? 800)))
// O Comunica PJe oscila: tenta até 3 vezes (rede, 429 e 5xx); erro 4xx não adianta repetir.
async function buscarComRetentativa(url: string): Promise<Response | null> {
  let r: Response | null = null
  for (let t = 1; t <= 3; t++) {
    r = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
    if (r?.ok || (r && r.status < 500 && r.status !== 429)) return r
    if (t < 3) await espera()
  }
  return r
}
const limpa = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

async function autorizado(req: Request): Promise<boolean> {
  try {
    const p = JSON.parse(atob((req.headers.get('authorization') ?? '').split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (p?.role === 'authenticated') return true
  } catch { /* segue */ }
  const enviado = req.headers.get('x-cron-secret')
  if (!enviado) return false
  const { data } = await sb().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!data?.valor && data.valor === enviado
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await autorizado(req))) return json({ erro: 'Entre na plataforma.' }, 401)
  const { dias = 15, inicio: inicioPedido, fim: fimPedido, historico = false, teste = false } = await req.json().catch(() => ({}))
  const s = sb()
  // "Testar conexão": uma consulta mínima ao CNJ, sem gravar nada.
  if (teste) {
    const hoje = new Date().toISOString().slice(0, 10)
    const r = await buscarComRetentativa(`${API}?numeroOab=1&ufOab=RJ&dataDisponibilizacaoInicio=${hoje}&dataDisponibilizacaoFim=${hoje}&itensPorPagina=1&pagina=1`)
    return json({ conexao: !!r?.ok, status: r?.status ?? null, em: new Date().toISOString() })
  }
  const { data: cfg } = await s.from('configuracoes').select('valor').eq('chave', 'oabs_monitoradas').maybeSingle()
  const oabs = String(cfg?.valor ?? '').split(',').map(o => o.trim()).filter(Boolean)
  if (!oabs.length) return json({ oabs: [], novas: 0, aviso: 'Nenhuma OAB cadastrada. Um administrador informa as OABs do escritório nesta tela.' })
  // Período livre (para trazer o histórico em blocos de até 93 dias) ou os últimos N dias (até 60).
  const dataValida = (d: unknown) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d) && !Number.isNaN(Date.parse(d))
  let fim = new Date().toISOString().slice(0, 10)
  let inicio = new Date(Date.now() - Math.min(60, Number(dias) || 15) * 86400000).toISOString().slice(0, 10)
  if (dataValida(inicioPedido) && dataValida(fimPedido)) {
    if (inicioPedido > fimPedido) return json({ erro: 'A data inicial é depois da final.' }, 400)
    if ((Date.parse(fimPedido) - Date.parse(inicioPedido)) / 86400000 > 93) return json({ erro: 'Peça no máximo 93 dias por vez.' }, 400)
    inicio = inicioPedido; fim = fimPedido
  }
  // Histórico antigo entra como já lido: não vira alerta de prazo vencido. O que tem menos de 60 dias continua como novo.
  const corteLido = new Date(Date.now() - 60 * 86400000).toISOString().slice(0, 10)
  let novas = 0
  const falhas: string[] = []
  for (const oab of oabs) {
    const [numero, uf] = oab.split('/')
    for (let pagina = 1; pagina <= (historico ? 10 : 5); pagina++) {
      const url = `${API}?numeroOab=${numero}&ufOab=${uf}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=100&pagina=${pagina}`
      const r = await buscarComRetentativa(url)
      if (!r?.ok) { falhas.push(`${oab}: ${r?.status ?? 'sem resposta'}`); break }
      const d = await r.json().catch(() => ({ items: [] }))
      const itens = (d.items ?? []) as Record<string, any>[]
      if (!itens.length) break
      const linhas = itens.map(i => ({
        id: i.id, oab, data_disponibilizacao: i.data_disponibilizacao, tribunal: i.siglaTribunal, orgao: i.nomeOrgao,
        tipo: i.tipoComunicacao, classe: i.nomeClasse, numero_processo: i.numeroprocessocommascara ?? i.numero_processo,
        texto: limpa(String(i.texto ?? '')).slice(0, 6000), link: i.link, destinatarios: i.destinatarios ?? [],
        ...(historico && String(i.data_disponibilizacao ?? '').slice(0, 10) < corteLido ? { lida: true } : {}),
      }))
      const { count } = await s.from('intimacoes').select('id', { count: 'exact', head: true }).in('id', linhas.map(l => l.id))
      await s.from('intimacoes').upsert(linhas, { onConflict: 'id', ignoreDuplicates: true })
      novas += linhas.length - (count ?? 0)
      if (itens.length < 100) break
    }
  }
  // Registro da última consulta automática/manual (só admin lê): a tela mostra se a conexão com o CNJ está em dia.
  if (!historico && !(dataValida(inicioPedido) && dataValida(fimPedido))) {
    const agora = new Date().toISOString()
    const ok = falhas.length === 0
    const origem = req.headers.get('x-cron-secret') ? 'automatica' : 'manual'
    await s.from('configuracoes').upsert({ chave: 'cnj_ultima_consulta', valor: JSON.stringify({ em: agora, ok, novas, falhas: falhas.slice(0, 5), origem }), atualizado_em: agora }, { onConflict: 'chave' }).then(() => null, () => null)
    if (ok) await s.from('configuracoes').upsert({ chave: 'cnj_ultimo_sucesso', valor: agora, atualizado_em: agora }, { onConflict: 'chave' }).then(() => null, () => null)
  }
  return json({ oabs, novas, falhas, periodo: { inicio, fim } })
})
