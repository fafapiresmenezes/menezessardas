// Acumulado de 12 meses do índice de reajuste, direto do Banco Central (SGS).
const SERIES: Record<string, number> = { igpm: 189, ipca: 433, inpc: 188 }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { indice } = await req.json().catch(() => ({}))
  const serie = SERIES[String(indice)]
  if (!serie) return json({ erro: 'Índice sem série pública (use IGP-M, IPCA ou INPC).' }, 400)
  const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/12?formato=json`)
  if (!r.ok) return json({ erro: 'Banco Central indisponível agora. Tente mais tarde.' }, 502)
  const meses = (await r.json()) as { data: string; valor: string }[]
  if (meses.length < 12) return json({ erro: 'Série incompleta no Banco Central.' }, 502)
  const fator = meses.reduce((f, m) => f * (1 + Number(m.valor) / 100), 1)
  return json({
    indice,
    acumulado12m: Math.round((fator - 1) * 10000) / 100,
    de: meses[0].data,
    ate: meses[meses.length - 1].data,
    fonte: `Banco Central do Brasil, SGS série ${serie}`,
  })
})
