// Radar dos portais: todo dia (pg_cron) busca o que há de novo nos portais públicos
// sobre os temas da carteira e guarda em novidades_portais.
//  - Câmara dos Deputados (dados abertos): projetos de lei apresentados nos últimos 120 dias.
//  - Google Notícias (RSS): decisões e notícias dos tribunais sobre os temas.
// LexML e Senado bloqueiam ou não têm endpoint de busca utilizável a partir do servidor.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const TERMOS = ['inquilinato', 'locação de imóveis', 'condomínio edilício', 'incorporação imobiliária', 'registro de imóveis', 'distrato imobiliário']
const NOTICIAS = ['STJ locação de imóvel', 'STJ condomínio', 'lei do inquilinato', 'TJRJ despejo', 'incorporação imobiliária decisão']

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

interface Novidade { id: string; fonte: string; tipo: string; titulo: string; resumo?: string; link: string; data?: string; termo: string }

const limpa = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\s+/g, ' ').trim()

async function camara(termo: string): Promise<Novidade[]> {
  const inicio = new Date(Date.now() - 120 * 86400000).toISOString().slice(0, 10)
  const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?keywords=${encodeURIComponent(termo)}&dataApresentacaoInicio=${inicio}&ordem=DESC&ordenarPor=id&itens=15`
  const r = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) })
  if (!r.ok) return []
  const { dados } = await r.json()
  return (dados ?? []).map((p: { id: number; siglaTipo: string; numero: number; ano: number; ementa: string }) => ({
    id: `camara-${p.id}`, fonte: 'Câmara dos Deputados', tipo: 'Projeto',
    titulo: `${p.siglaTipo} ${p.numero}/${p.ano}`, resumo: p.ementa?.slice(0, 400),
    link: `https://www.camara.leg.br/propostas-legislativas/${p.id}`, termo,
  }))
}

async function noticias(termo: string): Promise<Novidade[]> {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(termo)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) return []
  const xml = await r.text()
  const itens = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 8)
  return itens.map(m => {
    const bloco = m[1]
    const pega = (tag: string) => limpa(bloco.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '')
    const link = pega('link')
    const data = new Date(pega('pubDate'))
    return {
      id: 'noticia-' + Array.from(link).reduce((h, c) => ((h * 31 + c.charCodeAt(0)) >>> 0), 7).toString(36),
      fonte: pega('source') || 'Google Notícias', tipo: 'Notícia', titulo: pega('title').slice(0, 300),
      link, data: isNaN(data.getTime()) ? undefined : data.toISOString().slice(0, 10), termo,
    }
  }).filter(n => n.link)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const diagnostico: string[] = []
  const tudo: Novidade[] = []
  await Promise.all([
    ...TERMOS.map(t => camara(t).then(n => { tudo.push(...n); diagnostico.push(`Câmara "${t}": ${n.length}`) }).catch(e => diagnostico.push(`Câmara "${t}": falha ${String(e).slice(0, 60)}`))),
    ...NOTICIAS.map(t => noticias(t).then(n => { tudo.push(...n); diagnostico.push(`Notícias "${t}": ${n.length}`) }).catch(e => diagnostico.push(`Notícias "${t}": falha ${String(e).slice(0, 60)}`))),
  ])
  const unicos = [...new Map(tudo.map(n => [n.id, n])).values()]
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  let gravados = 0
  if (unicos.length) {
    const { error, count } = await sb.from('novidades_portais').upsert(unicos.map(n => ({ ...n, visto_em: new Date().toISOString() })), { onConflict: 'id', count: 'exact' })
    if (error) diagnostico.push('gravação: ' + error.message)
    else gravados = count ?? unicos.length
  }
  return json({ encontrados: unicos.length, gravados, situacao: diagnostico.join('; ') })
})
