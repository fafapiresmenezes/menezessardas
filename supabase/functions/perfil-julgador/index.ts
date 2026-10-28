// Perfil do julgador a partir de dados PÚBLICOS: estatísticas do órgão julgador no DataJud (CNJ)
// e notícias sobre o magistrado. A IA resume o padrão decisório e sugere como argumentar.
// Não é perfil psicológico: só o que está em decisões e publicações públicas.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const MODELO = 'claude-sonnet-5-5'
const MODELO_RESERVA = 'claude-haiku-5-5'
// Chave pública de leitura do DataJud, publicada na documentação do CNJ.
const DATAJUD_KEY = 'APIKey cDZHYzlZa0JadVREZDJCendQbXY6SkJlTzNjLV9TRENyQk1RdnFKZGRQdw=='
const TRIBUNAIS: Record<string, string> = { tjrj: 'TJRJ', tjsp: 'TJSP', tjmg: 'TJMG', tjes: 'TJES', stj: 'STJ', trf2: 'TRF2' }
// Códigos de movimento (tabela do CNJ): resultado de sentença.
const MOVIMENTOS: Record<number, string> = { 219: 'Procedência', 220: 'Improcedência', 221: 'Procedência em parte', 466: 'Extinção sem julgamento do mérito', 385: 'Acordo homologado' }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

function usuarioAutenticado(req: Request): string | null {
  try {
    const token = (req.headers.get('authorization') ?? '').replace(/^Bearer\s+/i, '')
    const parte = token.split('.')[1]
    if (!parte) return null
    const b64 = parte.replace(/-/g, '+').replace(/_/g, '/')
    const payload = JSON.parse(atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4)))
    return payload?.role === 'authenticated' ? String(payload.sub) : null
  } catch {
    return null
  }
}
const servico = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

async function obterChave(): Promise<string | null> {
  const doAmbiente = Deno.env.get('ANTHROPIC_API_KEY')
  if (doAmbiente) return doAmbiente
  const { data } = await servico().from('configuracoes').select('valor').eq('chave', 'anthropic_api_key').maybeSingle()
  return data?.valor || null
}

interface Estatisticas {
  processos: number
  classes: { nome: string; total: number }[]
  assuntos: { nome: string; total: number }[]
  resultados: { nome: string; total: number }[]
  porAno: { ano: string; total: number }[]
}

async function datajud(tribunal: string, orgao: string): Promise<Estatisticas | null> {
  const r = await fetch(`https://api-publica.datajud.cnj.jus.br/api_publica_${tribunal}/_search`, {
    method: 'POST',
    headers: { Authorization: DATAJUD_KEY, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(45000),
    body: JSON.stringify({
      size: 0,
      query: { match_phrase: { 'orgaoJulgador.nome': orgao } },
      aggs: {
        classes: { terms: { field: 'classe.nome.keyword', size: 8 } },
        assuntos: { terms: { field: 'assuntos.nome.keyword', size: 10 } },
        resultados: { terms: { field: 'movimentos.codigo', include: Object.keys(MOVIMENTOS).map(Number), size: 10 } },
        anos: { date_histogram: { field: 'dataAjuizamento', calendar_interval: 'year', format: 'yyyy', min_doc_count: 1 } },
      },
    }),
  })
  if (!r.ok) return null
  const d = await r.json()
  const b = (k: string) => (d.aggregations?.[k]?.buckets ?? []) as { key: string | number; key_as_string?: string; doc_count: number }[]
  return {
    processos: d.hits?.total?.value ?? 0,
    classes: b('classes').map(x => ({ nome: String(x.key), total: x.doc_count })),
    assuntos: b('assuntos').map(x => ({ nome: String(x.key), total: x.doc_count })),
    resultados: b('resultados').map(x => ({ nome: MOVIMENTOS[Number(x.key)] ?? String(x.key), total: x.doc_count })),
    // Só anos plausíveis: o DataJud tem datas mal formatadas em parte dos processos.
    porAno: b('anos').map(x => ({ ano: String(x.key_as_string ?? '').slice(0, 4), total: x.doc_count })).filter(a => /^\d{4}$/.test(a.ano) && +a.ano >= 1990 && +a.ano <= new Date().getFullYear()).slice(-8),
  }
}

const limpa = (s: string) => s.replace(/<!\[CDATA\[|\]\]>/g, '').replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim()

async function noticias(nome: string) {
  const url = `https://news.google.com/rss/search?q=${encodeURIComponent(`"${nome}" (juiz OR juíza OR desembargador OR desembargadora OR ministro)`)}&hl=pt-BR&gl=BR&ceid=BR:pt-419`
  const r = await fetch(url, { signal: AbortSignal.timeout(15000) })
  if (!r.ok) return []
  const xml = await r.text()
  return [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0, 10).map(m => {
    const pega = (tag: string) => limpa(m[1].match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`))?.[1] ?? '')
    return { titulo: pega('title'), link: pega('link'), fonte: pega('source'), data: pega('pubDate').slice(0, 16) }
  }).filter(n => n.titulo)
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const usuario = usuarioAutenticado(req)
  const { nome = '', tribunal = 'tjrj', orgao = '', tema = '', sonda = false } = await req.json().catch(() => ({}))
  // Modo sonda: teste automático diário sem usuário; não grava nada.
  if (!usuario && !sonda) return json({ erro: 'Entre na plataforma para usar o perfil do julgador.' }, 401)
  if (!TRIBUNAIS[tribunal]) return json({ erro: 'Tribunal ainda não coberto.' }, 400)
  if (!nome.trim() && !orgao.trim()) return json({ erro: 'Informe o nome do julgador ou o órgão (vara ou câmara).' }, 400)
  const chave = await obterChave()
  if (!chave) return json({ erro: 'Chave da IA não configurada. Um administrador pode informá-la em Configurações → Inteligência artificial.' }, 503)

  const [estatisticas, imprensa] = await Promise.all([
    orgao.trim() ? datajud(tribunal, orgao).catch(() => null) : Promise.resolve(null),
    nome.trim() ? noticias(nome).catch(() => []) : Promise.resolve([]),
  ])

  const ferramenta = {
    name: 'registrar_perfil',
    description: 'Registra o perfil decisório com base apenas nos dados públicos fornecidos.',
    input_schema: {
      type: 'object',
      properties: {
        resumo: { type: 'string', description: 'Três a cinco frases sobre o padrão decisório observável.' },
        tendencias: { type: 'array', items: { type: 'string' }, description: 'Tendências apoiadas nos números (ex.: proporção de procedência, classes mais comuns).' },
        temas: { type: 'array', items: { type: 'string' } },
        comoArgumentar: { type: 'array', items: { type: 'string' }, description: 'Recomendações práticas de estratégia e redação para este órgão/julgador e para o tema informado.' },
        cuidados: { type: 'array', items: { type: 'string' }, description: 'Riscos e o que evitar; incluir limitações dos dados.' },
        confianca: { type: 'string', enum: ['alta', 'media', 'baixa'], description: 'Quão sólidos são os dados disponíveis.' },
      },
      required: ['resumo', 'tendencias', 'temas', 'comoArgumentar', 'cuidados', 'confianca'],
    },
  }
  const dados = JSON.stringify({ julgador: nome || null, tribunal: TRIBUNAIS[tribunal], orgao: orgao || null, tema: tema || null, estatisticasDataJud: estatisticas, noticias: imprensa })
  const corpo = (modelo: string) => JSON.stringify({
      model: modelo,
      max_tokens: 6000,
      tools: [ferramenta],
      tool_choice: { type: 'auto' },
      system: `Você é analista de jurimetria para um escritório de advocacia do Rio de Janeiro. Monte um perfil DECISÓRIO (não psicológico) do órgão julgador e, se houver, do magistrado, usando apenas os dados públicos fornecidos: estatísticas do DataJud (CNJ) e manchetes. Em português do Brasil. Nunca atribua características pessoais, opiniões ou intenções ao magistrado; fale de padrões observáveis e diga claramente quando os dados são insuficientes. Se o tema do caso foi informado, direcione as recomendações a ele. Responda obrigatoriamente chamando a ferramenta registrar_perfil.`,
      messages: [{ role: 'user', content: `DADOS PÚBLICOS:\n${dados}` }],
    })
  // Tenta de novo em sobrecarga (429/5xx) e cai para o modelo rápido se o principal falhar.
  let r: Response | null = null
  for (const modelo of [MODELO, MODELO, MODELO_RESERVA]) {
    r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'x-api-key': chave, 'anthropic-version': '2023-06-01', 'Content-Type': 'application/json' },
      body: corpo(modelo),
      signal: AbortSignal.timeout(60000),
    }).catch(() => null)
    if (r?.ok || r?.status === 401 || r?.status === 403 || r?.status === 400) break
    console.error('perfil-julgador anthropic', modelo, r?.status, r ? await r.clone().text() : 'sem resposta')
    await new Promise(ok => setTimeout(ok, 1500))
  }
  if (!r) return json({ erro: 'A IA não respondeu. Tente novamente em instantes.' }, 502)
  if (!r.ok) console.error('perfil-julgador final', r.status, await r.clone().text())
  if (!r.ok) return json({ erro: r.status === 401 || r.status === 403 ? 'Chave recusada pela Anthropic.' : `Anthropic respondeu ${r.status}.` }, 502)
  const resposta = await r.json()
  const bruto = resposta.content?.find((c: { type: string }) => c.type === 'tool_use')?.input
  if (!bruto) return json({ erro: 'A IA não devolveu o perfil. Tente novamente.' }, 502)
  // Normaliza: listas às vezes chegam como texto JSON ou objeto {"1": ..., "2": ...}.
  const lista = (v: unknown): string[] => {
    if (typeof v === 'string') { try { return lista(JSON.parse(v)) } catch { return v.trim() ? [v] : [] } }
    if (Array.isArray(v)) return v.map(String)
    if (v && typeof v === 'object') return Object.values(v).map(String)
    return []
  }
  const soltos = Object.entries(bruto).filter(([k]) => /^\d+$/.test(k)).map(([, v]) => String(v))
  const perfil = {
    resumo: typeof bruto.resumo === 'string' ? bruto.resumo : 'Dados públicos insuficientes para um perfil confiável.',
    tendencias: lista(bruto.tendencias),
    temas: lista(bruto.temas),
    comoArgumentar: lista(bruto.comoArgumentar),
    cuidados: [...lista(bruto.cuidados), ...soltos],
    confianca: ['alta', 'media', 'baixa'].includes(bruto.confianca) ? bruto.confianca : 'baixa',
  }

  const resultado = { ...perfil, estatisticas, noticias: imprensa, tribunal: TRIBUNAIS[tribunal], orgao, nome, geradoEm: new Date().toISOString() }
  if (usuario) await servico().from('perfis_julgador').insert({ usuario_id: usuario, nome: nome || orgao, tribunal: TRIBUNAIS[tribunal], perfil: resultado })
  return json(resultado)
})
