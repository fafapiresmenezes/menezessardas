// Monitoramento gratuito (equivalente ao do Escavador): processos pelo número CNJ (novos andamentos no
// DataJud) e nomes de partes (novas comunicações no Comunica PJe/DJEN). Roda todo dia pelo cron e pelo
// botão "Verificar agora". Precisa rodar na região São Paulo: o CNJ só aceita IP do Brasil.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret, x-region',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const sb = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const UF_TR = ['', 'ac', 'al', 'ap', 'am', 'ba', 'ce', 'dft', 'es', 'go', 'ma', 'mt', 'ms', 'mg', 'pa', 'pb', 'pr', 'pe', 'pi', 'rj', 'rn', 'rs', 'ro', 'rr', 'sc', 'se', 'sp', 'to']
const limpa = (s: string) => s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

function tribunalDoNumero(n: string): string | null {
  const d = n.replace(/\D/g, '')
  if (d.length !== 20) return null
  const j = d[13], tr = Number(d.slice(14, 16))
  if (j === '8') return UF_TR[tr] ? `tj${UF_TR[tr]}` : null
  if (j === '5') return `trt${tr}`
  if (j === '4') return `trf${tr}`
  return null
}

async function autorizado(req: Request): Promise<boolean> {
  try {
    const parte = (req.headers.get('authorization') ?? '').split('.')[1]
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    if (JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4))).role === 'authenticated') return true
  } catch { /* segue */ }
  const enviado = req.headers.get('x-cron-secret')
  if (!enviado) return false
  const { data } = await sb().from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!data?.valor && data.valor === enviado
}

/** Andamentos do processo no DataJud, mais recentes primeiro. */
async function andamentos(numero: string) {
  const indice = tribunalDoNumero(numero)
  if (!indice) throw new Error('Número CNJ inválido')
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${indice}/_search`, {
    method: 'POST', headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' }, signal: AbortSignal.timeout(40000),
    body: JSON.stringify({ size: 1, query: { match: { numeroProcesso: numero.replace(/\D/g, '') } } }),
  })
  if (!r.ok) throw new Error(`DataJud ${r.status}`)
  const h = (await r.json()).hits?.hits?.[0]?._source
  if (!h) return { encontrado: false, movs: [] as { data: string; nome: string }[] }
  const movs = (h.movimentos ?? []).map((m: any) => ({ data: String(m.dataHora), nome: String(m.nome) }))
    .sort((a: any, b: any) => b.data.localeCompare(a.data))
  return { encontrado: true, classe: h.classe?.nome, orgao: h.orgaoJulgador?.nome, movs }
}

/** Comunicações dos últimos 30 dias em nome da parte. */
async function comunicacoes(nome: string) {
  const fim = new Date().toISOString().slice(0, 10)
  const inicio = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)
  const r = await fetch(`https://comunicaapi.pje.jus.br/api/v1/comunicacao?nomeParte=${encodeURIComponent(nome)}&dataDisponibilizacaoInicio=${inicio}&dataDisponibilizacaoFim=${fim}&itensPorPagina=100&pagina=1`, { signal: AbortSignal.timeout(25000) })
  if (!r.ok) throw new Error(`Comunica PJe ${r.status}`)
  const d = await r.json()
  return (d.items ?? []).map((i: any) => ({ id: String(i.id), data: i.data_disponibilizacao, tribunal: i.siglaTribunal, tipo: i.tipoComunicacao,
    numero: i.numeroprocessocommascara ?? i.numero_processo, trecho: limpa(String(i.texto ?? '')).slice(0, 300) }))
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (!(await autorizado(req))) return json({ erro: 'Entre na plataforma.' }, 401)
  const { id } = await req.json().catch(() => ({}))
  const s = sb()
  let q = s.from('monitoramentos').select('id,tipo,valor,ultimo_estado,novidades')
  if (id) q = q.eq('id', id)
  const { data: lista } = await q
  const resumo: { valor: string; novas: number; erro?: string }[] = []
  for (const m of lista ?? []) {
    try {
      const agora = new Date().toISOString()
      const antes = (m.ultimo_estado ?? {}) as { chaves?: string[] }
      const vistos = new Set(antes.chaves ?? [])
      let itens: { chave: string; data: string; texto: string }[] = []
      let estado: Record<string, unknown> = {}
      if (m.tipo === 'processo') {
        const a = await andamentos(m.valor)
        itens = a.movs.slice(0, 50).map(x => ({ chave: `${x.data}|${x.nome}`, data: x.data, texto: x.nome }))
        estado = { classe: a.classe ?? null, orgao: a.orgao ?? null, encontrado: a.encontrado }
      } else {
        const c = await comunicacoes(m.valor)
        itens = c.map(x => ({ chave: x.id, data: x.data, texto: `${x.tribunal} · ${x.tipo} · ${x.numero}: ${x.trecho}` }))
      }
      // Na primeira verificação só registra o estado (sem acusar tudo como novidade).
      const novas = antes.chaves ? itens.filter(x => !vistos.has(x.chave)) : []
      const chaves = [...new Set([...itens.map(x => x.chave), ...(antes.chaves ?? [])])].slice(0, 300)
      const novidades = [...novas.map(({ data, texto }) => ({ data, texto, vista_em: agora })), ...((m.novidades as unknown[]) ?? [])].slice(0, 50)
      await s.from('monitoramentos').update({ ultimo_estado: { ...estado, chaves }, novidades, verificado_em: agora, ...(novas.length ? { novidade_em: agora } : {}) }).eq('id', m.id)
      resumo.push({ valor: m.valor, novas: novas.length })
    } catch (e) {
      resumo.push({ valor: m.valor, novas: 0, erro: e instanceof Error ? e.message : String(e) })
    }
  }
  return json({ verificados: resumo.length, resumo })
})
