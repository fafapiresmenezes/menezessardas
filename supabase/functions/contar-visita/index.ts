// Instituto THEYE · Contar visita: soma UM número sobre a porta, sem identificar ninguém (passo V10).
// Chamada sem login (é porta). Não grava quem visitou: manda só o tipo ('visita' | 'idioma' |
// 'quadradinho') e, quando for o caso, a chave (código da língua ou id da frente). A função do banco
// `porta_contar` só soma, com limite por rede. A rede é o hmac do IP (mesma pimenta de pedir_entrada),
// usada só para o limite de chamadas — nunca guardada junto do que foi visto.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const db = () => createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, { db: { schema: 'public' } })
const ORIGENS = ['https://theye.club', 'https://www.theye.club', 'https://theye-club.vercel.app', 'https://instituto-theye.vercel.app']
const TIPOS = ['visita', 'idioma', 'quadradinho']

const cors = { 'Vary': 'Origin', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const hex = (b: ArrayBuffer) => Array.from(new Uint8Array(b)).map(x => x.toString(16).padStart(2, '0')).join('')
async function hmac(chave: string, t: string) {
  const k = await crypto.subtle.importKey('raw', new TextEncoder().encode(chave), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return hex(await crypto.subtle.sign('HMAC', k, new TextEncoder().encode(t)))
}
let cacheSegredos: Record<string, string> | null = null
async function segredo(nome: string) {
  if (!cacheSegredos) {
    const { data } = await db().rpc('instituto_segredos_servico')
    cacheSegredos = data ?? {}
  }
  return cacheSegredos![nome]
}

Deno.serve(async (req) => {
  const origem = req.headers.get('origin') ?? ''
  const permitida = ORIGENS.includes(origem) ? origem : ORIGENS[0]
  const r = await tratar(req)
  r.headers.set('Access-Control-Allow-Origin', permitida)
  return r
})

async function tratar(req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ ok: false }, 405)
  const b = await req.json().catch(() => ({}))
  const tipo = String(b?.tipo ?? '')
  if (!TIPOS.includes(tipo)) return json({ ok: false })
  const chave = tipo === 'visita' ? '' : String(b?.chave ?? '')

  const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim()
  let rede: string | null = null
  try { rede = ip ? await hmac(await segredo('pimenta_cpf'), `ip:${ip}`) : null } catch { rede = null }

  // Nunca estoura para a página: se o banco falhar, a porta segue como se nada fosse.
  try {
    const { data } = await db().rpc('porta_contar', { p_tipo: tipo, p_chave: chave, p_rede: rede })
    return json({ ok: !!data?.ok })
  } catch {
    return json({ ok: false })
  }
}
