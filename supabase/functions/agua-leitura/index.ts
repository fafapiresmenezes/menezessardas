// Águas, fase 3: leitura aberta (só leitura, dado público já agregado) para a casa de Águas.
// Junta, do grafo do Instituto: rios (telemetria da ANA), outorgas e barragens (SNIRH).
// Não grava nada e não devolve nome de pessoa. Nada de previsão: só o último número medido.
// verify_jwt=false como ana-agua modo serie: é leitura de dado público.

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (c: unknown, s = 200) => new Response(JSON.stringify(c), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

export interface Banco { q<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>; fechar(): Promise<void> }
export async function bancoPostgres(): Promise<Banco> {
  const { Client } = await import('https://deno.land/x/postgres@v0.19.3/mod.ts')
  const c = new Client(Deno.env.get('SUPABASE_DB_URL')!)
  await c.connect()
  return { q: async <T,>(sql: string, p: unknown[] = []) => (await c.queryObject<T>({ text: sql, args: p })).rows, fechar: () => c.end() }
}

// Último retrato de cada fonte (o dia mais recente), já somado.
const SQL = {
  rios: `with ult as (
      select distinct on (bruto->>'estacao', subtipo) bruto->>'estacao' as estacao, subtipo, valor::float as valor, unidade,
             ocorrido_em::date::text as dia, titulo, bruto->>'uf' as uf, bruto->>'municipio' as municipio
        from instituto.eventos where fonte = 'ana_telemetria' and tipo = 'medicao_estacao'
       order by bruto->>'estacao', subtipo, ocorrido_em desc, observado_em desc)
    select estacao, max(uf) uf, max(municipio) municipio, max(split_part(titulo, ':', 1)) nome, max(dia) dia,
           max(valor) filter (where subtipo = 'chuva') chuva_mm,
           max(valor) filter (where subtipo = 'nivel') nivel_cm,
           max(valor) filter (where subtipo = 'vazao') vazao_m3s
      from ult group by estacao order by max(dia) desc, estacao limit 300`,
  outorgasDia: `select max(ocorrido_em)::date::text dia from instituto.eventos where fonte = 'ana_outorgas'`,
  outorgasFinalidade: `select subtipo finalidade, sum(valor)::int n, sum((bruto->>'volume_anual_m3')::float) volume_m3
      from instituto.eventos where fonte = 'ana_outorgas' and ocorrido_em::date = $1::date group by 1 order by 2 desc`,
  outorgasUf: `select bruto->>'uf' uf, sum(valor)::int n from instituto.eventos where fonte = 'ana_outorgas' and ocorrido_em::date = $1::date group by 1 order by 2 desc`,
  barragensDia: `select max(ocorrido_em)::date::text dia from instituto.eventos where fonte = 'ana_snisb'`,
  barragensClasse: `select bruto->>'categoria_risco' risco, bruto->>'dano_potencial' dano, sum(valor)::int n
      from instituto.eventos where fonte = 'ana_snisb' and ocorrido_em::date = $1::date group by 1, 2 order by 3 desc`,
  barragensUf: `select bruto->>'uf' uf, sum(valor)::int n,
        sum(valor) filter (where bruto->>'categoria_risco' = 'Alto' and bruto->>'dano_potencial' = 'Alto')::int alto_alto
      from instituto.eventos where fonte = 'ana_snisb' and ocorrido_em::date = $1::date group by 1 order by 2 desc`,
}

export async function ler(db: Banco) {
  const rios = await db.q(SQL.rios)
  const [{ dia: dOut } = { dia: null }] = await db.q<{ dia: string | null }>(SQL.outorgasDia)
  const [{ dia: dBar } = { dia: null }] = await db.q<{ dia: string | null }>(SQL.barragensDia)
  return {
    rios: { estacoes: rios.length, linhas: rios, fonte: 'ANA, telemetria hidrometeorológica (telemetriaws1.ana.gov.br)' },
    outorgas: dOut ? { dia: dOut, porFinalidade: await db.q(SQL.outorgasFinalidade, [dOut]), porUf: await db.q(SQL.outorgasUf, [dOut]), fonte: 'ANA, outorgas federais de direito de uso (SNIRH)' } : null,
    barragens: dBar ? { dia: dBar, porClasse: await db.q(SQL.barragensClasse, [dBar]), porUf: await db.q(SQL.barragensUf, [dBar]), fonte: 'ANA, SNISB (Sistema Nacional de Informações sobre Segurança de Barragens)' } : null,
  }
}

export async function atender(req: Request, abrirBanco: () => Promise<Banco> = bancoPostgres): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = await abrirBanco()
  try { return json(await ler(db)) } catch (e) { return json({ erro: (e as Error).message }, 500) } finally { await db.fechar() }
}

if (!Deno.env.get('VITEST')) Deno.serve((req) => atender(req))
