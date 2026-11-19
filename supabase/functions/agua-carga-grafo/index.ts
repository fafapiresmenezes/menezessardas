// Águas v2 (P09/P10/P19): carrega um pacote do grafo (nós e ligações) publicado no repositório,
// conferindo a impressão digital (sha256) antes de gravar. Só aceita arquivos deste repositório
// fixados por commit (nada de endereço livre). GUARDA: x-cron-secret. verify_jwt=false.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { 'Content-Type': 'application/json' } })
const PREFIXO = /^https:\/\/raw\.githubusercontent\.com\/fafapiresmenezes\/menezessardas\/[0-9a-f]{40}\/data\/aguas\/[\w./-]+\.json\.gz$/

async function segredoOk(req: Request) {
  const dado = req.headers.get('x-cron-secret'); if (!dado) return false
  const s = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data } = await s.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  return !!(data as { valor?: string } | null)?.valor && dado === (data as { valor: string }).valor
}
async function sha256(t: string) {
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(t))
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('')
}
type No = { id: string; tipo: string; nome?: string | null; lon?: number; lat?: number; bbox?: number[]; at?: Record<string, unknown> }
type Ar = { o: string; d: string; h?: number; hmin?: number; hmax?: number; ponte?: string; pm?: number; nota?: string }

Deno.serve(async (req: Request) => {
  if (!await segredoOk(req)) return json({ erro: 'Sem o segredo do agendador.' }, 401)
  const { url, sha256: esperado, pais } = await req.json().catch(() => ({}))
  if (!PREFIXO.test(String(url))) return json({ erro: 'Endereço não permitido.' }, 400)
  if (!['AO', 'BR'].includes(String(pais))) return json({ erro: 'pais AO ou BR.' }, 400)
  const r = await fetch(url); if (!r.ok) return json({ erro: `baixar: ${r.status}` }, 502)
  const texto = await new Response(r.body!.pipeThrough(new DecompressionStream('gzip'))).text()
  const h = await sha256(texto)
  if (h !== esperado) return json({ erro: 'Impressão digital não confere.', h }, 409)
  const p = JSON.parse(texto) as { versao: string; fonte: string; licenca: string; nos: No[]; arestas: Ar[] }
  const { Client } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
  const c = new Client(Deno.env.get('SUPABASE_DB_URL')!); await c.connect()
  const t0 = Date.now(); let nn = 0, na = 0
  try {
    for (let i = 0; i < p.nos.length; i += 2000) {
      const lote = p.nos.slice(i, i + 2000).map(n => ({ id: n.id, tipo: n.tipo, pais, nome_publico: n.nome ?? null, lon: n.lon ?? null, lat: n.lat ?? null,
        bbox: n.bbox ?? null, atributos: n.at ?? {}, fonte: p.fonte, licenca: p.licenca, hash: h, status: 'confirmado', publico: true }))
      await c.queryObject({ text: `insert into instituto.agua_nos(id,tipo,pais,nome_publico,lon,lat,bbox,atributos,fonte,licenca,hash,status,publico)
        select id,tipo,pais,nome_publico,lon,lat,bbox,atributos,fonte,licenca,hash,status,publico from jsonb_to_recordset($1::jsonb)
        as x(id text,tipo text,pais text,nome_publico text,lon float8,lat float8,bbox float8[],atributos jsonb,fonte text,licenca text,hash text,status text,publico bool)
        on conflict (id) do update set tipo=excluded.tipo,nome_publico=excluded.nome_publico,lon=excluded.lon,lat=excluded.lat,bbox=excluded.bbox,
        atributos=excluded.atributos,fonte=excluded.fonte,licenca=excluded.licenca,hash=excluded.hash`, args: [JSON.stringify(lote)] })
      nn += lote.length
    }
    for (let i = 0; i < p.arestas.length; i += 3000) {
      const lote = p.arestas.slice(i, i + 3000).map(a => ({ origem: a.o, destino: a.d, atraso_h: a.h ?? null, atraso_h_min: a.hmin ?? null, atraso_h_max: a.hmax ?? null,
        origem_aresta: a.ponte ? 'ponte' : 'fisica', nota: a.ponte ? `ponte ${a.ponte} de ${a.pm} m` + (a.nota ? '; ' + a.nota : '') : (a.nota ?? null) }))
      await c.queryObject({ text: `insert into instituto.agua_arestas(origem,destino,tipo,atraso_h,atraso_h_min,atraso_h_max,origem_aresta,nota)
        select origem,destino,'drena_para',atraso_h,atraso_h_min,atraso_h_max,origem_aresta,nota from jsonb_to_recordset($1::jsonb)
        as x(origem text,destino text,atraso_h float8,atraso_h_min float8,atraso_h_max float8,origem_aresta text,nota text)
        on conflict (origem,destino,tipo) do update set atraso_h=excluded.atraso_h,atraso_h_min=excluded.atraso_h_min,atraso_h_max=excluded.atraso_h_max,
        origem_aresta=excluded.origem_aresta,nota=excluded.nota`, args: [JSON.stringify(lote)] })
      na += lote.length
    }
    await c.queryObject({ text: `insert into instituto.eventos(tipo, descricao, dados) values ('agua_carga_grafo', $1, $2::jsonb)`,
      args: [`Carga ${p.versao} (${pais})`, JSON.stringify({ versao: p.versao, sha256: h, nos: nn, arestas: na, url })] }).catch(() => null)
  } finally { await c.end() }
  return json({ ok: true, versao: p.versao, sha256: h, nos: nn, arestas: na, ms: Date.now() - t0 })
})
