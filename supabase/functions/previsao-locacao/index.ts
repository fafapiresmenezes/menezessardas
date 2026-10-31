// Plano I-02, passo U13: API única de previsão de locação.
// O escritório chama com o login do usuário; a função repassa para a RPC
// previsao_locacao_escritorio, que confere se a pessoa é da equipe e devolve só agregados.
import { createClient } from 'jsr:@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ erro: 'Use POST.' }, 405)
  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const b = await req.json().catch(() => ({}))
  const { data, error } = await sb.rpc('previsao_locacao_escritorio', {
    p_tribunal: String(b.tribunal ?? ''), p_classe: String(b.classe ?? ''),
    p_orgao: b.orgao ? String(b.orgao) : null, p_assunto: b.assunto ? Number(b.assunto) : null,
  })
  if (error) return json({ erro: 'Acesso só para a equipe do escritório.' }, 401)
  if (data?.erro) return json(data, data.erro.startsWith('Acesso') ? 403 : 400)
  return json(data)
})
