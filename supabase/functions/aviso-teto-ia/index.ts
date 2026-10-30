// Passo 06 do plano: aviso de 80% e 100% do teto mensal de IA.
// Roda de hora em hora (pg_cron) ou a pedido de um administrador ({teste:true}).
// Chama verificar_teto_ia() (registra o aviso uma vez por mês em avisos_teto_ia) e,
// se houver aviso novo, manda e-mail aos administradores pelo Brevo (chave em configuracoes).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
const brl = (v: number) => 'R$ ' + v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const corpo = await req.json().catch(() => ({}))

  // Autorização: segredo do cron, ou administrador logado (para o botão de teste).
  let admin: { email: string } | null = null
  const segredo = req.headers.get('x-cron-secret')
  const { data: cfgSeg } = await db.from('configuracoes').select('valor').eq('chave', 'cron_segredo').maybeSingle()
  const cronOk = !!segredo && !!cfgSeg?.valor && segredo === cfgSeg.valor
  if (!cronOk) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await db.auth.getUser(token)
    if (!u?.user) return json({ erro: 'Entre na plataforma.' }, 401)
    const { data: perfil } = await db.from('usuarios_perfis').select('funcao').eq('id', u.user.id).maybeSingle()
    if (perfil?.funcao !== 'admin') return json({ erro: 'Só administradores.' }, 403)
    admin = { email: u.user.email! }
  }

  const { data: estado, error } = await db.rpc('verificar_teto_ia')
  if (error) return json({ erro: error.message }, 500)
  const e = estado as { teto_brl: number | null; gasto_brl: number; pct: number | null; mes?: string; aviso_novo: { id: number; nivel: number } | null }

  // Em teste, simula o aviso de 80% só para o administrador que pediu (não grava).
  const aviso = corpo?.teste && admin ? { id: 0, nivel: e.pct && e.pct >= 100 ? 100 : 80 } : e.aviso_novo
  if (!aviso) return json({ ...e, enviado: false, motivo: e.teto_brl ? 'nenhum aviso novo' : 'sem teto definido' })

  const [{ data: cfg }, { data: admins }] = await Promise.all([
    db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente']),
    db.from('usuarios_perfis').select('email').eq('funcao', 'admin'),
  ])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const para = admin ? [admin.email] : [...new Set((admins ?? []).map(a => a.email).filter(Boolean) as string[])]
  if (!conf.brevo_api_key || !conf.email_remetente) return json({ ...e, enviado: false, motivo: 'provedor de e-mail não configurado', destinatarios: para.length })

  const titulo = aviso.nivel >= 100 ? 'Teto mensal de IA atingido: inteligência artificial pausada' : 'Atenção: 80% do teto mensal de IA já foi usado'
  const texto = aviso.nivel >= 100
    ? 'O gasto com inteligência artificial chegou ao teto do mês. A IA fica pausada até o mês que vem ou até um administrador aumentar o teto em Consumo.'
    : 'O gasto com inteligência artificial passou de 80% do teto do mês. Ao chegar a 100% a IA pausa automaticamente.'
  const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:auto">
    <div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">${titulo}</h2></div>
    <div style="padding:16px;line-height:1.5">
      <p>${texto}</p>
      <p><strong>Gasto no mês:</strong> ${brl(e.gasto_brl)} de ${brl(e.teto_brl ?? 0)} (${e.pct ?? 0}%).</p>
      ${corpo?.teste ? '<p style="color:#888">Este é um e-mail de teste pedido por você em Consumo.</p>' : ''}
      <p><a href="${APP}/consumo">Abrir Consumo</a> · <a href="${APP}/alertas">Abrir Alertas</a></p>
    </div>
    <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · aviso automático</p></div>`
  let falha: string | undefined
  for (const email of para) {
    const r = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Avisos GMenezes', email: conf.email_remetente }, to: [{ email }], subject: titulo, htmlContent: html }),
    })
    if (!r.ok) falha = `${r.status} ${await r.text()}`
  }
  if (!falha) {
    await db.from('consumo_api').insert({ funcao: 'avisos por e-mail', modelo: 'brevo-email', quantidade: para.length })
    if (aviso.id) await db.from('avisos_teto_ia').update({ email_enviado_em: new Date().toISOString(), destinatarios: para.length }).eq('id', aviso.id)
  }
  return json({ ...e, nivel: aviso.nivel, enviado: !falha, destinatarios: para.length, detalhe: falha })
})
