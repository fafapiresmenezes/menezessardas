// Consulta CNPJ de fornecedores via API Receita Federal — M22 backlog
// Uso: GET /consultar-cnpj?cnpj=12345678000100

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

interface EmpresaInfo {
  cnpj: string
  nome: string
  status: 'ativa' | 'inativa' | 'desconhecido'
  dataAbertura?: string
  natuJurídica?: string
  risco?: 'baixo' | 'médio' | 'alto'
}

async function consultarCNPJ(cnpj: string): Promise<EmpresaInfo> {
  const cnpjLimpo = cnpj.replace(/\D/g, '')
  if (cnpjLimpo.length !== 14) {
    throw new Error('CNPJ inválido: deve ter 14 dígitos')
  }

  try {
    // Tenta API pública (receita.dados.gov.br)
    const resp = await fetch(`https://receita.dados.gov.br/api/cnpj/${cnpjLimpo}`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })

    if (!resp.ok) {
      return {
        cnpj: cnpjLimpo,
        nome: 'Não encontrado',
        status: 'desconhecido',
        risco: 'alto',
      }
    }

    const data = await resp.json() as any
    return {
      cnpj: cnpjLimpo,
      nome: data.razao_social || data.nome || 'Desconhecido',
      status: (data.situacao === 'Ativa' ? 'ativa' : 'inativa') as 'ativa' | 'inativa' | 'desconhecido',
      dataAbertura: data.data_inicio_atividades,
      natuJurídica: data.natureza_juridica,
      risco: data.situacao === 'Ativa' ? 'baixo' : 'alto',
    }
  } catch (e) {
    // Fallback: CNPJ desconhecido
    return {
      cnpj: cnpjLimpo,
      nome: 'API indisponível',
      status: 'desconhecido',
      risco: 'médio',
    }
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const url = new URL(req.url)
    const cnpj = url.searchParams.get('cnpj')
    if (!cnpj) return json({ erro: 'Informe CNPJ (param ?cnpj=...)' }, 400)

    const info = await consultarCNPJ(cnpj)
    return json({
      empresa: info,
      timestamp: new Date().toISOString(),
      fonte: 'Receita Federal (dados.gov.br)',
    })
  } catch (e) {
    return json({ erro: String(e) }, 500)
  }
})
