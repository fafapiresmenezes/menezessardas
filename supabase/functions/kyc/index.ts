// KYC gratuito de contraparte (empresa): cadastro na Receita (BrasilAPI), certidão consolidada do TCU
// (CEIS e CNEP da CGU, inidôneos do TCU, improbidade do CNJ) e conflito de interesses dentro do escritório
// (a contraparte já aparece em contratos ou fornecedores?). Tudo de fonte pública, sem chave paga.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
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

type Checagem = { cnpj: string; risco: string; alertas: string[]; receita: Record<string, unknown>; certidoes: Record<string, unknown>; conflitos: { onde: string; detalhe: string }[]; fontes: string[]; consultadoEm: string }

// Faz a checagem completa com o cliente informado (do usuário ou do robô) e grava no histórico,
// comparando com a última checagem do mesmo CNPJ para marcar mudança de status (Passo 26).
// deno-lint-ignore no-explicit-any
async function checar(sb: any, cnpj: string, usuarioId: string | null, automatica: boolean): Promise<Checagem & { mudou: boolean; riscoAnterior: string | null; proximaEm: string }> {
  const [rf, cert] = await Promise.all([receita(cnpj), tcu(cnpj)])
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
  const consultadoEm = new Date().toISOString()
  const r: Checagem = {
    cnpj, risco, alertas, receita: rf, certidoes: cert, conflitos,
    fontes: ['Receita Federal (BrasilAPI)', 'TCU – certidão consolidada (CEIS, CNEP, inidôneos TCU, improbidade CNJ)', 'Base interna do escritório'],
    consultadoEm,
  }
  const { data: ant } = await sb.from('checagens_kyc').select('risco').eq('cnpj', cnpj).order('consultado_em', { ascending: false }).limit(1).maybeSingle()
  const riscoAnterior: string | null = ant?.risco ?? null
  // "a conferir" é fonte fora do ar, não mudança real de status.
  const mudou = !!riscoAnterior && riscoAnterior !== risco && risco !== 'a conferir' && riscoAnterior !== 'a conferir'
  await sb.from('checagens_kyc').insert({ cnpj, nome: nome || null, risco, alertas, resultado: r, consultado_em: consultadoEm, usuario_id: usuarioId, automatica, risco_anterior: riscoAnterior, mudou })
  const proximaEm = new Date(Date.now() + 90 * 86400000).toISOString()
  return { ...r, mudou, riscoAnterior, proximaEm }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const corpo = await req.json().catch(() => ({}))
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cfg } = await db.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  const cron = !!req.headers.get('x-cron-secret') && req.headers.get('x-cron-secret') === cfg?.valor

  // Reconsulta automática (cron diário): refaz toda checagem com mais de 90 dias; {reconsultar:true}
  // com login de admin/operador força a reconsulta na hora (para teste), limitada a 5 CNPJs.
  if (cron || corpo.reconsultar) {
    let forcar = false
    if (!cron) {
      const { data: u } = await db.auth.getUser((req.headers.get('authorization') ?? '').replace('Bearer ', ''))
      if (!u?.user) return json({ erro: 'Entre na plataforma para consultar.' }, 401)
      const { data: p } = await db.from('usuarios_perfis').select('funcao').eq('id', u.user.id).maybeSingle()
      if (!p || !['admin', 'operador'].includes(p.funcao)) return json({ erro: 'Sem permissão.' }, 403)
      forcar = true
    }
    const { data: ult } = await db.rpc('kyc_pendentes_reconsulta')
    const limite = Date.now() - 90 * 86400000
    const fila = ((ult ?? []) as { cnpj: string; consultado_em: string }[]).filter(x => forcar || new Date(x.consultado_em).getTime() < limite).slice(0, forcar ? 5 : 50)
    const resumo: { cnpj: string; risco: string; mudou: boolean; riscoAnterior: string | null }[] = []
    for (const x of fila) {
      const r = await checar(db, x.cnpj, null, true)
      resumo.push({ cnpj: r.cnpj, risco: r.risco, mudou: r.mudou, riscoAnterior: r.riscoAnterior })
    }
    return json({ reconsultados: resumo.length, mudancas: resumo.filter(r => r.mudou).length, resumo })
  }

  const auth = req.headers.get('authorization') ?? ''
  const sb = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: auth } } })
  const { data: u } = await sb.auth.getUser()
  if (!u?.user) return json({ erro: 'Entre na plataforma para consultar.' }, 401)
  const cnpj = String(corpo.cnpj ?? '').replace(/\D/g, '')
  if (cnpj.length !== 14) return json({ erro: 'Informe um CNPJ com 14 dígitos.' }, 400)
  // Lido com o acesso do próprio usuário, então respeita o sigilo por imóvel.
  return json(await checar(sb, cnpj, u.user.id, false))
})
