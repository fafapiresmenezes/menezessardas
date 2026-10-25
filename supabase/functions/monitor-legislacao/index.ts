// Função no servidor: busca no LexML normas federais recentes sobre temas
// imobiliários. Devolve itens {urn, titulo, data, link} e um texto de
// diagnóstico ("situacao") para saber se a fonte respondeu. A leitura do
// retorno não depende do esquema XML: extrai as URNs LEX (urn:lex:br:...),
// que trazem tipo, data e número da norma.
//
// Deploy: supabase functions deploy monitor-legislacao (verify_jwt ligado).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const TERMOS = ['locação', 'inquilinato', 'condomínio', 'imóvel', 'registro de imóveis', 'incorporação']
const TIPOS: Record<string, string> = {
  lei: 'Lei',
  'lei.complementar': 'Lei Complementar',
  decreto: 'Decreto',
  'medida.provisoria': 'Medida Provisória',
  'emenda.constitucional': 'Emenda Constitucional',
}

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const anoMinimo = new Date().getFullYear() - 1
    const vistos = new Map<string, { urn: string; titulo: string; data?: string; link: string }>()
    const diagnostico: string[] = []

    for (const termo of TERMOS) {
      const url =
        'https://www.lexml.gov.br/busca/SRU?operation=searchRetrieve&version=1.1&maximumRecords=30' +
        `&query=${encodeURIComponent(`urn any "federal" and title any "${termo}"`)}`
      try {
        const r = await fetch(url, { headers: { Accept: 'application/xml' } })
        const texto = await r.text()
        const urns = texto.match(/urn:lex:br:federal:[a-z.]+:\d{4}-\d{2}-\d{2};[\w.]+/g) ?? []
        diagnostico.push(`${termo}: HTTP ${r.status}, ${urns.length} URN`)
        for (const urn of urns) {
          const m = urn.match(/^urn:lex:br:federal:([a-z.]+):(\d{4})-(\d{2})-(\d{2});([\w.]+)$/)
          if (!m || !TIPOS[m[1]] || Number(m[2]) < anoMinimo || vistos.has(urn)) continue
          vistos.set(urn, {
            urn,
            titulo: `${TIPOS[m[1]]} nº ${m[5]}/${m[2]}`,
            data: `${m[2]}-${m[3]}-${m[4]}`,
            link: `https://www.lexml.gov.br/urn/${urn}`,
          })
        }
      } catch (e) {
        diagnostico.push(`${termo}: falha (${String(e).slice(0, 80)})`)
      }
    }

    const itens = [...vistos.values()].sort((a, b) => (b.data ?? '').localeCompare(a.data ?? '')).slice(0, 25)
    return resposta({ itens, situacao: `${itens.length} norma(s) desde ${anoMinimo}. ${diagnostico.join('; ')}` })
  } catch (e) {
    return resposta({ erro: String(e) }, 500)
  }
})
