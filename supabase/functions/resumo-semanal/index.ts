// Passo 14 do plano: resumo semanal de alertas por função (sócia, advogada, secretária).
// Roda toda segunda às 8h (horário de Brasília) pelo pg_cron, ou a pedido de quem está logado ({teste:true},
// que manda o resumo só para a própria pessoa). Guarda o resumo em resumos_semanais (exibido em Meu dia)
// e envia por e-mail (Brevo) a toda a equipe liberada.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
const brl = (v: number) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
type Secao = Record<string, string | number>

const ROTULOS: Record<string, string> = {
  contratos_vencidos: 'Contratos vencidos', contratos_60_dias: 'Contratos vencendo em 60 dias', valor_60_dias: 'Valor mensal em risco (60 dias)',
  honorarios_em_aberto: 'Honorários em aberto', honorarios_atrasados: 'Honorários atrasados', tarefas_alta: 'Tarefas de prioridade alta abertas',
  intimacoes_nao_lidas: 'Intimações não lidas', prazos_processuais_semana: 'Prazos processuais nesta semana', prazos_vencidos: 'Prazos processuais vencidos',
  tarefas_semana: 'Tarefas com prazo nesta semana', tarefas_vencidas: 'Tarefas vencidas', audiencias_compromissos: 'Audiências e compromissos na semana',
  compromissos_semana: 'Compromissos da semana', compromissos_lista: 'Agenda', contratos_30_dias: 'Contratos vencendo em 30 dias', reajustes_30_dias: 'Reajustes a aplicar em 30 dias',
}
const DINHEIRO = new Set(['valor_60_dias', 'honorarios_em_aberto'])
const linhas = (s: Secao) => Object.entries(s).map(([k, v]) =>
  `<tr><td style="padding:4px 8px;border-bottom:1px solid #eee">${ROTULOS[k] ?? k}</td><td style="padding:4px 8px;border-bottom:1px solid #eee;text-align:right"><strong>${DINHEIRO.has(k) ? brl(Number(v)) : (v === '' ? '—' : v)}</strong></td></tr>`).join('')

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const corpo = await req.json().catch(() => ({}))

  let pessoa: { email: string } | null = null
  const segredo = req.headers.get('x-cron-secret')
  const { data: cfgSeg } = await db.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  const cronOk = !!segredo && !!cfgSeg?.valor && segredo === cfgSeg.valor
  if (!cronOk) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await db.auth.getUser(token)
    if (!u?.user) return json({ erro: 'Entre na plataforma.' }, 401)
    const { data: perfil } = await db.from('usuarios_perfis').select('funcao').eq('id', u.user.id).maybeSingle()
    if (!perfil) return json({ erro: 'Conta ainda não liberada.' }, 403)
    pessoa = { email: u.user.email! }
  }
  const teste = !!corpo?.teste && !!pessoa

  const { data: resumo, error } = await db.rpc('resumo_semanal')
  if (error) return json({ erro: error.message }, 500)
  const r = resumo as { semana: string; socia: Secao; advogada: Secao; secretaria: Secao }

  // Segunda-feira da semana corrente (chave única do resumo).
  const hoje = new Date(); const dow = (hoje.getUTCDay() + 6) % 7
  const segunda = new Date(hoje.getTime() - dow * 86400000).toISOString().slice(0, 10)
  let registroId: number | null = null
  if (!teste) {
    const { data: salvo } = await db.from('resumos_semanais').upsert({ semana: segunda, conteudo: r }, { onConflict: 'semana,escritorio_id' }).select('id').maybeSingle()
    registroId = salvo?.id ?? null
  }

  const [{ data: cfg }, { data: equipe }] = await Promise.all([
    db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente']),
    db.from('usuarios_perfis').select('email').in('funcao', ['admin', 'operador']),
  ])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const para = pessoa ? [pessoa.email] : [...new Set((equipe ?? []).map(a => a.email).filter(e => !!e && !e.endsWith('@exemplo.com')) as string[])]
  if (!conf.brevo_api_key || !conf.email_remetente) return json({ resumo: r, enviado: false, motivo: 'provedor de e-mail não configurado', destinatarios: para.length })

  const titulo = `Resumo semanal do escritório · semana de ${r.semana}`
  const bloco = (nome: string, s: Secao, rota: string) => `<h3 style="margin:18px 0 6px;color:#14213d">${nome}</h3><table style="width:100%;border-collapse:collapse;font-size:14px">${linhas(s)}</table><p style="margin:6px 0 0"><a href="${APP}${rota}">Abrir</a></p>`
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto">
    <div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">${titulo}</h2></div>
    <div style="padding:16px;line-height:1.5">
      <p>Bom dia. Este é o resumo consolidado dos alertas da plataforma, organizado por função. Os números são de hoje, ${r.semana}.</p>
      ${bloco('Para a sócia', r.socia, '/indicadores')}
      ${bloco('Para a advogada', r.advogada, '/intimacoes')}
      ${bloco('Para a secretária', r.secretaria, '/agenda')}
      ${teste ? '<p style="color:#888">Este é um envio de teste pedido por você em Meu dia.</p>' : ''}
      <p><a href="${APP}/meu-dia">Abrir Meu dia</a> · <a href="${APP}/alertas">Abrir Alertas</a></p>
    </div>
    <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · resumo automático de segunda-feira</p></div>`
  let falha: string | undefined
  for (const email of para) {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Avisos GMenezes', email: conf.email_remetente }, to: [{ email }], subject: titulo, htmlContent: html }),
    })
    if (!resp.ok) falha = `${resp.status} ${await resp.text()}`
  }
  if (!falha) {
    await db.from('consumo_api').insert({ funcao: 'resumo semanal por e-mail', modelo: 'brevo-email', quantidade: para.length })
    if (registroId) await db.from('resumos_semanais').update({ enviado_em: new Date().toISOString(), destinatarios: para.length }).eq('id', registroId)
  }
  return json({ resumo: r, enviado: !falha, destinatarios: para.length, teste, detalhe: falha })
})
