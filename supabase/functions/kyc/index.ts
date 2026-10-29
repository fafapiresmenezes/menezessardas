// KYC gratuito de contraparte (empresa): cadastro na Receita (BrasilAPI), certidão consolidada do TCU
// (CEIS e CNEP da CGU, inidôneos do TCU, improbidade do CNJ) e conflito de interesses dentro do escritório
// (a contraparte já aparece em contratos ou fornecedores?). Tudo de fonte pública, sem chave paga.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

async function receita(cnpj: string) {
  try {
    const r = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(20000) })
    if (r.status === 404) return { ok: true, encontrado: false }
    if (!r.ok) return { ok: false, erro: `HTTP ${r.status}` }
    const d = await r.json()
    return {
      ok: true, encontrado: true, nome: d.razao_social, fantasia: d.nome_fantasia || null,
      situacao: d.descricao_situacao_cadastral, abertura: d.data_inicio_atividade,
      atividade: d.cnae_fiscal_descricao, municipio: d.municipio, uf: d.uf,
      socios: (d.qsa ?? []).map((s: { nome_socio: string; qualificacao_socio: string }) => ({ nome: s.nome_socio, qualificacao: s.qualificacao_socio })),
    }
  } catch (e) { return { ok: false, erro: String(e) } }
}

async function tcu(cnpj: string) {
  try {
    const r = await fetch(`https://certidoes-apf.apps.tcu.gov.br/api/rest/publico/certidoes/${cnpj}?seEmitirPDF=false`, { signal: AbortSignal.timeout(25000) })
    if (!r.ok) return { ok: false, erro: `HTTP ${r.status}` }
    const d = await r.json()
    const certidoes = (d.certidoes ?? []).map((c: Record<string, string>) => ({
      emissor: c.emissor, cadastro: c.tipo, situacao: c.situacao, descricao: c.descricao,
    }))
    // Só CONSTA é sanção; sistema fora do ar deixa o resultado "a conferir".
    const sit = (c: { situacao: string }) => String(c.situacao ?? '')
    return { ok: true, certidoes, alguma: certidoes.some(c => sit(c) === 'CONSTA'), indisponivel: certidoes.some(c => sit(c) !== 'CONSTA' && sit(c) !== 'NADA_CONSTA') }
  } catch (e) { return { ok: false, erro: String(e) } }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return json({ erro: 'Entre na plataforma para consultar.' }, 401)
  const corpo = await req.json().catch(() => ({}))
  const cnpj = String(corpo.cnpj ?? '').replace(/\D/g, '')
  if (cnpj.length !== 14) return json({ erro: 'Informe um CNPJ com 14 dígitos.' }, 400)

  const [rf, cert] = await Promise.all([receita(cnpj), tcu(cnpj)])
  // Conflito de interesses: a contraparte (CNPJ ou razão social) já aparece no escritório? Lido com o
  // acesso do próprio usuário, então respeita o sigilo por imóvel.
  const nome = rf.ok && rf.encontrado ? String(rf.nome) : ''
  const conflitos: { onde: string; detalhe: string }[] = []
  const { data: forn } = await sb.from('fornecedores').select('id,dados')
  for (const f of forn ?? []) {
    const t = JSON.stringify(f.dados ?? {})
    if (t.replace(/\D/g, '').includes(cnpj) || (nome && t.toUpperCase().includes(nome.toUpperCase()))) conflitos.push({ onde: 'Fornecedores', detalhe: (f.dados as { nome?: string })?.nome ?? f.id })
  }
  if (nome) {
    const { data: cs } = await sb.from('contratos').select('id,imovel_id,locatario_fornecedor,status').ilike('locatario_fornecedor', `%${nome.slice(0, 40)}%`)
    for (const c of cs ?? []) conflitos.push({ onde: 'Contratos', detalhe: `${c.locatario_fornecedor} (${c.status})` })
  }

  const alertas: string[] = []
  if (rf.ok && !rf.encontrado) alertas.push('CNPJ não encontrado na Receita.')
  if (rf.ok && rf.encontrado && String(rf.situacao).toUpperCase() !== 'ATIVA') alertas.push(`Situação na Receita: ${rf.situacao}.`)
  if (cert.ok && cert.alguma) alertas.push('Consta em cadastro de sanções (veja as certidões).')
  if (conflitos.length) alertas.push('A contraparte já aparece no escritório: verifique conflito de interesses.')
  const incompleto = !rf.ok || !cert.ok || !!cert.indisponivel
  const risco = alertas.length ? 'alto' : incompleto ? 'a conferir' : 'baixo'

  return json({
    cnpj, risco, alertas, receita: rf, certidoes: cert, conflitos,
    fontes: ['Receita Federal (BrasilAPI)', 'TCU – certidão consolidada (CEIS, CNEP, inidôneos TCU, improbidade CNJ)', 'Base interna do escritório'],
    consultadoEm: new Date().toISOString(),
  })
})
