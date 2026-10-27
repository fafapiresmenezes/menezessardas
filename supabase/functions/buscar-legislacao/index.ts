// Busca legislação em repositórios públicos (Planalto, LexML, Câmara, DOU) — A4: S20
// Deploy: supabase functions deploy buscar-legislacao

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

/** Catálogo de leis do nicho imobiliário para referência rápida. */
const CATALOGO_LEIS: Record<string, { titulo: string; ementa: string[]; url: string }> = {
  '8245/1991': {
    titulo: 'Lei de Locações Urbanas',
    ementa: ['Locação de imóveis urbanos: prazos, reajuste, garantias, renovação e despejo.'],
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l8245.htm',
  },
  '10406/2002': {
    titulo: 'Código Civil',
    ementa: ['Contratos, comodato, propriedade, posse e condomínio edilício.'],
    url: 'https://www.planalto.gov.br/ccivil_03/leis/2002/l10406compilada.htm',
  },
  '4591/1964': {
    titulo: 'Lei do Condomínio',
    ementa: ['Condomínio em edificações e incorporações imobiliárias.'],
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l4591.htm',
  },
  '6015/1973': {
    titulo: 'Lei de Registros Públicos',
    ementa: ['Matrícula, averbações e registros do imóvel.'],
    url: 'https://www.planalto.gov.br/ccivil_03/leis/l6015compilada.htm',
  },
  '13709/2018': {
    titulo: 'LGPD — Lei de Proteção de Dados',
    ementa: ['Tratamento de dados pessoais de locatários, fiadores e fornecedores.'],
    url: 'https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/lei/l13709.htm',
  },
}

/** Calcula relevância por keywords. */
function calcularRelevancia(texto: string, termo: string): 'alta' | 'media' | 'baixa' {
  const termoLC = termo.toLowerCase()
  const textoLC = texto.toLowerCase()
  const palavrasAltas = ['locação', 'imóvel', 'contrato', 'inquilino', 'imobiliário']
  const palavrasMedia = ['lei', 'decreto', 'norma']

  const temAlta = palavrasAltas.some(p => textoLC.includes(p) && termoLC.includes(p))
  const temMedia = palavrasMedia.some(p => textoLC.includes(p))

  return temAlta ? 'alta' : temMedia ? 'media' : 'baixa'
}

async function buscarEmLexML(termo: string): Promise<LeiFederal[]> {
  try {
    // LexML WebService: busca de atos normativos
    const url = `https://www.lexml.gov.br/busca/sarx?base=LEGISLACAO&tipo=ATOS_NORMATIVOS&q=${encodeURIComponent(termo)}`
    const resp = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0' }, signal: AbortSignal.timeout(5000) })
    if (!resp.ok) return []
    const html = await resp.text()

    // Extração de resultados
    const leis: LeiFederal[] = []
    const regex = /Lei n[º°]\s*(\d+[.,]*\d*\/\d+)/gi
    const visto = new Set<string>()
    let match
    while ((match = regex.exec(html)) !== null) {
      const numero = match[1].replace(/,/g, '')
      if (visto.has(numero)) continue
      visto.add(numero)

      const titulo = CATALOGO_LEIS[numero]?.titulo || `Lei ${numero}`
      leis.push({
        numero,
        titulo,
        dataPublicacao: '',
        ementas: CATALOGO_LEIS[numero]?.ementa ?? ['Lei encontrada no LexML'],
        relevancia: calcularRelevancia(titulo, termo),
        url: CATALOGO_LEIS[numero]?.url || `https://www.lexml.gov.br/busca/sarx?type=jnl&id=urn:lex:br:federal:lei:${numero.replace(/[^\d]/g, '')}`,
        fonte: 'LexML',
      })
    }
    return leis.slice(0, 5)
  } catch {
    return []
  }
}

async function buscarEmPlanalto(termo: string): Promise<LeiFederal[]> {
  try {
    // Busca em catálogo de nicho imobiliário
    const leis: LeiFederal[] = []
    const termoLC = termo.toLowerCase()

    for (const [numero, info] of Object.entries(CATALOGO_LEIS)) {
      const match = info.titulo.toLowerCase().includes(termoLC) ||
                    info.ementa.some(e => e.toLowerCase().includes(termoLC)) ||
                    numero.includes(termoLC)
      if (match) {
        leis.push({
          numero,
          titulo: info.titulo,
          dataPublicacao: '',
          ementas: info.ementa,
          relevancia: calcularRelevancia(`${info.titulo} ${info.ementa.join(' ')}`, termo),
          url: info.url,
          fonte: 'Planalto',
        })
      }
    }

    return leis
  } catch {
    return []
  }
}

async function buscarEmCamera(termo: string): Promise<LeiFederal[]> {
  try {
    // Câmara dos Deputados — API aberta (https://dadosabertos.camara.leg.br/)
    // Busca por palavras-chave em projetos de lei
    const url = `https://dadosabertos.camara.leg.br/api/v2/proposicoes?siglaTipo=PL&ordem=DESC&ordenarPor=dataCriacao&q=${encodeURIComponent(termo)}`
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!resp.ok) return []

    const data = await resp.json() as { dados?: Array<{ numero: string; ementa: string; dataApresentacao: string; urlInteiroTeor: string }> }
    const projetos = data.dados ?? []

    return projetos.slice(0, 3).map(p => ({
      numero: `PL ${p.numero}`,
      titulo: `Projeto de Lei ${p.numero}`,
      dataPublicacao: p.dataApresentacao || '',
      ementas: [p.ementa],
      relevancia: calcularRelevancia(p.ementa, termo),
      url: p.urlInteiroTeor || `https://www.camara.leg.br/`,
      fonte: 'Câmara',
    }))
  } catch {
    return []
  }
}

async function buscarEmDOU(termo: string): Promise<LeiFederal[]> {
  try {
    // DOU — RSS feed de publicações recentes (API simples)
    // Busca por termo em atos publicados
    const url = `https://www.in.gov.br/web/dou/-/search/resultado?q=${encodeURIComponent(termo)}&secao=todas&caderno=todos&orgao=&periodo=&publicado_entre=&publicado_em=`
    const resp = await fetch(url, { signal: AbortSignal.timeout(5000) })
    if (!resp.ok) return []

    const html = await resp.text()

    // Extração simples de títulos e datas
    const regex = /<h2[^>]*>([^<]+)<\/h2>/gi
    const atos: LeiFederal[] = []
    let match
    let count = 0
    while ((match = regex.exec(html)) !== null && count < 2) {
      const titulo = match[1].trim().substring(0, 80)
      if (titulo.length > 10) {
        atos.push({
          numero: `DOU-${count + 1}`,
          titulo: `${titulo}...`,
          dataPublicacao: new Date().toISOString().slice(0, 10),
          ementas: [`Ato publicado no Diário Oficial da União`],
          relevancia: 'media',
          url: `https://www.in.gov.br/`,
          fonte: 'DOU',
        })
        count++
      }
    }

    return atos
  } catch {
    return []
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = new URL(req.url)
    const termo = url.searchParams.get('q') || ''

    if (!termo || termo.length < 2) {
      return json({ erro: 'Informe um termo de busca (mínimo 2 caracteres).' }, 400)
    }

    // A4: Buscar em 4 fontes em paralelo
    const [dePlanalto, deLexML, daCamera, doDOU] = await Promise.all([
      buscarEmPlanalto(termo),
      buscarEmLexML(termo),
      buscarEmCamera(termo),
      buscarEmDOU(termo),
    ])

    // Combinar e ordenar por relevância (alta > media > baixa)
    const todasAsLeis = [...dePlanalto, ...deLexML, ...daCamera, ...doDOU]

    // Remover duplicatas por número
    const visto = new Set<string>()
    const resultado = todasAsLeis.filter(lei => {
      if (visto.has(lei.numero)) return false
      visto.add(lei.numero)
      return true
    })

    // Ordenar por relevância
    resultado.sort((a, b) => {
      const ordem = { alta: 0, media: 1, baixa: 2 }
      return ordem[a.relevancia] - ordem[b.relevancia]
    })

    return json({
      termo,
      total: resultado.length,
      leis: resultado.slice(0, 10),
      fontes: ['Planalto', 'LexML', 'Câmara', 'DOU'],
      timestamp: new Date().toISOString(),
    })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
