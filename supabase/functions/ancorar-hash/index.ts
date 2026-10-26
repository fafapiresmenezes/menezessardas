// Função no servidor: envia um SHA-256 (64 caracteres hex) aos calendários
// públicos do OpenTimestamps e devolve a prova (base64) do primeiro que
// responder. Serve de reserva quando o navegador não alcança os calendários
// (rede corporativa, extensão de bloqueio) e para ancorar as medições em PDF.
// Só um hash sai daqui: nenhum dado de cliente.
//
// Deploy: supabase functions deploy ancorar-hash (verify_jwt ligado).

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const CALENDARIOS = [
  'https://alice.btc.calendar.opentimestamps.org',
  'https://bob.btc.calendar.opentimestamps.org',
  'https://finney.calendar.eternitywall.com',
]

const resposta = (corpo: unknown, status = 200) =>
  new Response(JSON.stringify(corpo), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  let digest = ''
  try {
    digest = String((await req.json()).digest ?? '').toLowerCase()
  } catch {
    return resposta({ erro: 'Envie {"digest": "<sha-256 em hex>"}.' }, 400)
  }
  if (!/^[0-9a-f]{64}$/.test(digest)) return resposta({ erro: 'O digest precisa ter 64 caracteres hexadecimais.' }, 400)

  const bytes = Uint8Array.from(digest.match(/../g)!.map(h => parseInt(h, 16)))
  const falhas: string[] = []
  for (const cal of CALENDARIOS) {
    try {
      const r = await fetch(`${cal}/digest`, {
        method: 'POST',
        headers: { Accept: 'application/vnd.opentimestamps.v1', 'Content-Type': 'application/x-www-form-urlencoded' },
        body: bytes,
      })
      if (!r.ok) {
        falhas.push(`${cal} ${r.status}`)
        continue
      }
      const prova = new Uint8Array(await r.arrayBuffer())
      return resposta({ digest, calendario: cal, provaB64: btoa(String.fromCharCode(...prova)), em: new Date().toISOString() })
    } catch (e) {
      falhas.push(`${cal} ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  return resposta({ erro: 'Nenhum calendário respondeu.', falhas }, 502)
})
