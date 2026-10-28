// Acumulado de 12 meses do índice de reajuste, direto do Banco Central (SGS).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const SERIES: Record<string, number> = { igpm: 189, ipca: 433, inpc: 188 }

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

async function buscarSerie(serie: number) {
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      const r = await fetch(`https://api.bcb.gov.br/dados/serie/bcdata.sgs.${serie}/dados/ultimos/12?formato=json`, { signal: AbortSignal.timeout(8000) })
      if (r.ok) {
        const meses = (await r.json()) as { data: string; valor: string }[]
        if (meses.length >= 12) return meses
      }
    } catch { /* tenta de novo */ }
    await new Promise(ok => setTimeout(ok, 800 * (tentativa + 1)))
  }
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const { indice } = await req.json().catch(() => ({}))
  const serie = SERIES[String(indice)]
  if (!serie) return json({ erro: 'Índice sem série pública (use IGP-M, IPCA ou INPC).' }, 400)

  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const chave = `bcb|${indice}`
  const meses = await buscarSerie(serie)
  if (!meses) {
    const { data: guardado } = await sb.from('jurimetria_cache').select('resultado,criado_em').eq('chave', chave).maybeSingle()
    if (guardado) return json({ ...guardado.resultado, desatualizado: true, aviso: `Banco Central fora do ar agora; valor consultado em ${new Date(guardado.criado_em).toLocaleDateString('pt-BR')}.` })
    return json({ erro: 'Banco Central indisponível agora. Tente mais tarde.' }, 502)
  }
  const fator = meses.reduce((f, m) => f * (1 + Number(m.valor) / 100), 1)
  const resultado = {
    indice,
    acumulado12m: Math.round((fator - 1) * 10000) / 100,
    de: meses[0].data,
    ate: meses[meses.length - 1].data,
    fonte: `Banco Central do Brasil, SGS série ${serie}`,
  }
  await sb.from('jurimetria_cache').upsert({ chave, resultado, criado_em: new Date().toISOString() })
  return json(resultado)
})
