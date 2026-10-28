const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
}

const json = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const cnpj = (new URL(req.url).searchParams.get('cnpj') ?? '').replace(/\D/g, '')
  if (cnpj.length !== 14) return json({ erro: 'Informe um CNPJ com 14 dígitos.' }, 400)

  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(20_000) })
    if (r.status === 404) return json({ empresa: { cnpj, status: 'nao_encontrado', risco: 'alto' }, fonte: 'Receita Federal via BrasilAPI' })
    if (!r.ok) return json({ erro: `Fonte indisponível (HTTP ${r.status}). Tente novamente.` }, 502)
    const d = await r.json()
    const situacao = String(d.descricao_situacao_cadastral ?? '')
    const ativa = situacao.toUpperCase() === 'ATIVA'
    return json({
      empresa: {
        cnpj,
        nome: d.razao_social,
        fantasia: d.nome_fantasia || null,
        situacao,
        status: ativa ? 'ativa' : 'inativa',
        dataSituacao: d.data_situacao_cadastral,
        abertura: d.data_inicio_atividade,
        naturezaJuridica: d.natureza_juridica,
        atividade: d.cnae_fiscal_descricao,
        municipio: d.municipio,
        uf: d.uf,
        risco: ativa ? 'baixo' : 'alto',
      },
      fonte: 'Receita Federal via BrasilAPI',
      consultadoEm: new Date().toISOString(),
    })
  } catch (e) {
    return json({ erro: `Fonte indisponível: ${String(e)}` }, 502)
  }
})
