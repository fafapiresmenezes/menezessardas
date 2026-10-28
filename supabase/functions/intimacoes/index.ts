// Intimações e publicações do Diário de Justiça Eletrônico Nacional (Comunica PJe, CNJ), gratuito:
// busca pelas OABs do escritório (configuracoes.oabs_monitoradas) e guarda na tabela intimacoes.
// Roda todo dia pelo cron (com segredo) ou pelo botão "Buscar agora".
import { createClient } from 'jsr:@supabase/supabase-js@2'

const API = 'https://comunicaapi.pje.jus.br/api/v1/comunicacao'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
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
  const { dias = 15 } = await req.json().catch(() => ({}))
  const s = sb()
  const { data: cfg } = await s.from('configuracoes').select('valor').eq('chave', 'oabs_monitoradas').maybeSingle()
  const oabs = String(cfg?.valor ?? '').split(',').map(o => o.trim()).filter(Boolean)
  if (!oabs.length) return json({ oabs: [], novas: 0, aviso: 'Nenhuma OAB cadastrada. Um administrador informa as OABs do escritório nesta tela.' })
  const fim = new Date().toISOString().slice(0, 10)
  const inicio = new Date(Date.now() - Math.min(60, Number(dias) || 15) * 86400000).toISOString().slice(0, 10)
  let novas = 0
  const falhas: string[] = []
  for (const oab of oabs) {
    const [numero, uf] = oab.split('/')
    for (let pagina = 1; pagina <= 5; pagina++) {
      const url = `${API}?numeroOab=${numero}&ufOab=${uf}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=100&pagina=${pagina}`
      const r = await fetch(url, { signal: AbortSignal.timeout(25000) }).catch(() => null)
      if (!r?.ok) { falhas.push(`${oab}: ${r?.status ?? 'sem resposta'}`); break }
      const d = await r.json().catch(() => ({ items: [] }))
      const itens = (d.items ?? []) as Record<string, any>[]
      if (!itens.length) break
      const linhas = itens.map(i => ({
        id: i.id, oab, data_disponibilizacao: i.data_disponibilizacao, tribunal: i.siglaTribunal, orgao: i.nomeOrgao,
        tipo: i.tipoComunicacao, classe: i.nomeClasse, numero_processo: i.numeroprocessocommascara ?? i.numero_processo,
        texto: limpa(String(i.texto ?? '')).slice(0, 6000), link: i.link, destinatarios: i.destinatarios ?? [],
      }))
      const { count } = await s.from('intimacoes').select('id', { count: 'exact', head: true }).in('id', linhas.map(l => l.id))
      await s.from('intimacoes').upsert(linhas, { onConflict: 'id', ignoreDuplicates: true })
      novas += linhas.length - (count ?? 0)
      if (itens.length < 100) break
    }
  }
  return json({ oabs, novas, falhas, periodo: { inicio, fim } })
})
