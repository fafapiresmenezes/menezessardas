const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

interface LeiFederal {
  numero: string
  titulo: string
  dataPublicacao: string
  ementas: string[]
  relevancia: 'alta' | 'media' | 'baixa'
  url: string
  fonte?: string
}

const CATALOGO_LEIS: Record<string, { titulo: string; ementa: string[]; url: string }> = {
  '8245/1991': { titulo: 'Lei de Locações Urbanas', ementa: ['Locação de imóveis urbanos: prazos, reajuste, garantias, renovação e despejo.'], url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm' },
  '10406/2002': { titulo: 'Código Civil', ementa: ['Contratos, comodato, propriedade, posse e condomínio edilício.'], url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm' },
  '4591/1964': { titulo: 'Lei do Condomínio', ementa: ['Condomínio em edificações e incorporações imobiliárias.'], url: 'https://www.planalto.gov.br/ccivil_03/leis/l4591.htm' },
  '6015/1973': { titulo: 'Lei de Registros Públicos', ementa: ['Matrícula, averbações e registros do imóvel.'], url: 'https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm' },
  '13709/2018': { titulo: 'LGPD — Lei de Proteção de Dados', ementa: ['Tratamento de dados pessoais de locatários, fiadores e fornecedores.'], url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm' },
}

const semAcento = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()

function calcularRelevancia(texto: string, termo: string): 'alta' | 'media' | 'baixa' {
  const t = semAcento(termo), x = semAcento(texto)
  const altas = ['locacao', 'imovel', 'contrato', 'inquilino', 'imobiliario']
  if (altas.some(p => x.includes(p) && t.includes(p))) return 'alta'
  return ['lei', 'decreto', 'norma'].some(p => x.includes(p)) ? 'media' : 'baixa'
}

async function buscarEmLexML(termo: string): Promise<LeiFederal[]> {
  try {
    const resp = await fetch(`https://www.lexml.gov.br/busca/sarx?base=LEGISLACAO&tipo=ATOS_NORMATIVOS&q=${encodeURIComponent(termo)}`, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
    if (!resp.ok) return []
    const html = await resp.text()
    const leis: LeiFederal[] = []
    const regex = /Lei n[º°]\s*(\d+[.,]*\d*\/\d+)/gi
    const visto = new Set<string>()
    let m
    while ((m = regex.exec(html)) !== null) {
      const numero = m[1].replace(/[.,]/g, '')
      if (visto.has(numero)) continue
      visto.add(numero)
      const titulo = CATALOGO_LEIS[numero]?.titulo || `Lei ${numero}`
      leis.push({ numero, titulo, dataPublicacao: '', ementas: CATALOGO_LEIS[numero]?.ementa ?? ['Lei encontrada no LexML'], relevancia: calcularRelevancia(titulo, termo), url: CATALOGO_LEIS[numero]?.url || 'https://www.lexml.gov.br/', fonte: 'LexML' })
    }
    return leis.slice(0, 5)
  } catch { return [] }
}

function buscarEmPlanalto(termo: string): LeiFederal[] {
  const t = semAcento(termo)
  return Object.entries(CATALOGO_LEIS)
    .filter(([n, i]) => semAcento(i.titulo).includes(t) || i.ementa.some(e => semAcento(e).includes(t)) || n.includes(t))
    .map(([numero, i]) => ({ numero, titulo: i.titulo, dataPublicacao: '', ementas: i.ementa, relevancia: calcularRelevancia(`${i.titulo} ${i.ementa.join(' ')}`, termo), url: i.url, fonte: 'Planalto' }))
}

async function buscarNaCamara(termo: string): Promise<LeiFederal[]> {
  try {
    const resp = await fetch(`https://dadosabertos.camara.leg.br/api/v2/proposicoes?siglaTipo=PL&ordem=DESC&ordenarPor=id&keywords=${encodeURIComponent(termo)}&itens=5`, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(8000) })
    if (!resp.ok) return []
    const data = await resp.json() as { dados?: Array<{ id: number; numero: number; ano: number; ementa: string }> }
    return (data.dados ?? []).slice(0, 3).map(p => ({ numero: `PL ${p.numero}/${p.ano}`, titulo: `Projeto de Lei ${p.numero}/${p.ano}`, dataPublicacao: '', ementas: [p.ementa], relevancia: calcularRelevancia(p.ementa, termo), url: `https://www.camara.leg.br/proposicoesWeb/fichadetramitacao?idProposicao=${p.id}`, fonte: 'Câmara' }))
  } catch { return [] }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const termo = (new URL(req.url).searchParams.get('q') || '').trim()
    if (termo.length < 2) return json({ erro: 'Informe um termo de busca (mínimo 2 caracteres).' }, 400)
    const [a, b, c] = await Promise.all([Promise.resolve(buscarEmPlanalto(termo)), buscarEmLexML(termo), buscarNaCamara(termo)])
    const visto = new Set<string>()
    const ordem = { alta: 0, media: 1, baixa: 2 }
    const leis = [...a, ...b, ...c].filter(l => !visto.has(l.numero) && visto.add(l.numero)).sort((x, y) => ordem[x.relevancia] - ordem[y.relevancia])
    return json({ termo, total: leis.length, leis: leis.slice(0, 10), fontes: ['Planalto', 'LexML', 'Câmara'], timestamp: new Date().toISOString() })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
