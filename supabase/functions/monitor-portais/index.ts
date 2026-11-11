// Radar dos portais: todo dia (pg_cron) busca o que há de novo nos portais públicos
// sobre os temas da carteira e guarda em novidades_portais.
//  - Câmara dos Deputados (dados abertos): projetos de lei apresentados nos últimos 120 dias.
//  - Google Notícias (RSS): decisões e notícias dos tribunais sobre os temas.
// LexML e Senado bloqueiam ou não têm endpoint de busca utilizável a partir do servidor.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Passo 04 do plano: termos por área do direito (as 10 áreas da tela de entrada). Cada novidade guarda a área.
const POR_AREA: Record<string, { camara: string[]; noticias: string[] }> = {
  imobiliario: { camara: ['inquilinato', 'locação de imóveis', 'condomínio edilício', 'incorporação imobiliária', 'registro de imóveis', 'distrato imobiliário'], noticias: ['STJ locação de imóvel', 'STJ condomínio', 'lei do inquilinato', 'TJRJ despejo', 'incorporação imobiliária decisão'] },
  civel: { camara: ['responsabilidade civil', 'código civil contratos'], noticias: ['STJ responsabilidade civil', 'STJ contratos decisão'] },
  trabalhista: { camara: ['CLT', 'direito do trabalho'], noticias: ['TST decisão', 'reforma trabalhista'] },
  familia: { camara: ['alimentos família', 'guarda compartilhada', 'inventário'], noticias: ['STJ divórcio', 'STJ alimentos guarda'] },
  tributario: { camara: ['reforma tributária', 'imposto de renda', 'ICMS'], noticias: ['STF tributário decisão', 'reforma tributária regulamentação'] },
  empresarial: { camara: ['recuperação judicial', 'sociedades empresárias'], noticias: ['STJ recuperação judicial', 'falência decisão'] },
  consumidor: { camara: ['código de defesa do consumidor', 'relações de consumo'], noticias: ['STJ consumidor decisão', 'Procon'] },
  previdenciario: { camara: ['previdência social', 'aposentadoria INSS'], noticias: ['INSS revisão', 'STJ previdenciário'] },
  penal: { camara: ['código penal', 'execução penal'], noticias: ['STF penal decisão', 'STJ habeas corpus'] },
  // Órgãos do sistema de Justiça (MP, tribunais, conselhos, Defensoria, OAB, tribunais de contas): só fontes públicas e gratuitas.
  justica: { camara: [], noticias: [
    'site:mprj.mp.br', 'site:mpf.mp.br', 'site:mpsp.mp.br', 'site:mpmg.mp.br', 'site:cnmp.mp.br', 'Ministério Público do Rio de Janeiro MPRJ', 'Ministério Público Federal MPF decisão', 'CNMP Conselho Nacional do Ministério Público',
    'site:cnj.jus.br', 'CNJ Conselho Nacional de Justiça resolução', 'site:stf.jus.br', 'site:stj.jus.br', 'site:tst.jus.br', 'site:tse.jus.br', 'site:stm.jus.br', 'site:cjf.jus.br',
    'site:tjrj.jus.br', 'site:tjsp.jus.br', 'site:tjmg.jus.br', 'site:tjrs.jus.br', 'site:tjpr.jus.br', 'site:tjdft.jus.br', 'site:trf2.jus.br', 'site:trf1.jus.br', 'site:trf3.jus.br', 'site:trf4.jus.br', 'site:trf5.jus.br', 'site:trf6.jus.br',
    'site:trt1.jus.br', 'site:trt2.jus.br', 'site:trt15.jus.br', 'site:dpge.rj.gov.br', 'site:defensoria.rj.def.br', 'Defensoria Pública da União DPU', 'OAB Conselho Federal da Ordem dos Advogados', 'OAB RJ Ordem dos Advogados do Brasil seccional',
    'TCU Tribunal de Contas da União acórdão', 'TCE-RJ Tribunal de Contas do Estado do Rio de Janeiro', 'AGU Advocacia-Geral da União', 'PGE-RJ Procuradoria Geral do Estado do Rio de Janeiro', 'PGFN Procuradoria-Geral da Fazenda Nacional', 'CADE decisão', 'ANPD Autoridade Nacional de Proteção de Dados', 'CVM processo sancionador',
  ] },
  compliance: { camara: ['proteção de dados pessoais', 'lei anticorrupção'], noticias: ['ANPD decisão', 'LGPD multa'] },
}

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

interface Novidade { id: string; fonte: string; tipo: string; titulo: string; resumo?: string; link: string; data?: string; termo: string; area?: string }

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
    // <source url="…"> vem com atributo no RSS do Google: a etiqueta pode ter atributos.
    const pega = (tag: string) => limpa(bloco.match(new RegExp(`<${tag}(?:\\s[^>]*)?>([\\s\\S]*?)</${tag}>`))?.[1] ?? '')
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
  const { area: soArea } = await req.json().catch(() => ({}))
  const areas = Object.keys(POR_AREA).filter(a => !soArea || a === soArea)
  // Em lotes de áreas para não abrir dezenas de conexões de uma vez.
  for (let i = 0; i < areas.length; i += 3) {
    await Promise.all(areas.slice(i, i + 3).flatMap(area => [
      ...POR_AREA[area].camara.map(t => camara(t).then(n => { tudo.push(...n.map(x => ({ ...x, area }))); diagnostico.push(`Câmara "${t}": ${n.length}`) }).catch(e => diagnostico.push(`Câmara "${t}": falha ${String(e).slice(0, 60)}`))),
      ...POR_AREA[area].noticias.map(t => noticias(t).then(n => { tudo.push(...n.map(x => ({ ...x, area }))); diagnostico.push(`Notícias "${t}": ${n.length}`) }).catch(e => diagnostico.push(`Notícias "${t}": falha ${String(e).slice(0, 60)}`))),
    ]))
  }
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
