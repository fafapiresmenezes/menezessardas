// Passo 41 (Onda D): convite .ics por e-mail (Brevo) a cada prazo/compromisso novo ou alterado.
// Chamado pelo gatilho avisar_ics (compromissos e tarefas) com x-cron-secret. METHOD:REQUEST e o mesmo UID
// por registro, com SEQUENCE crescente, para o Outlook/Google atualizarem o evento em vez de duplicar.
// Só envia a quem ligou "Convite .ics por e-mail" em Configurações.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } })
const esc = (t: string) => t.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
const soData = (iso: string) => iso.replace(/-/g, '')
const diaSeguinte = (iso: string) => { const d = new Date(iso + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + 1); return soData(d.toISOString().slice(0, 10)) }

export function montarIcs(p: { uid: string; sequencia: number; titulo: string; descricao: string; data: string; organizador: string; convidado: string; cancelado?: boolean }): string {
  const agora = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//GMenezes Advogados Associados//Agenda//PT-BR', 'CALSCALE:GREGORIAN', `METHOD:${p.cancelado ? 'CANCEL' : 'REQUEST'}`,
    'BEGIN:VEVENT', `UID:${p.uid}`, `SEQUENCE:${p.sequencia}`, `DTSTAMP:${agora}`, `DTSTART;VALUE=DATE:${soData(p.data)}`, `DTEND;VALUE=DATE:${diaSeguinte(p.data)}`,
    `SUMMARY:${esc(p.titulo)}`, `DESCRIPTION:${esc(p.descricao)}`, `ORGANIZER;CN=Plataforma GMenezes:mailto:${p.organizador}`,
    `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=FALSE:mailto:${p.convidado}`, `STATUS:${p.cancelado ? 'CANCELLED' : 'CONFIRMED'}`,
    'BEGIN:VALARM', 'TRIGGER:-P1D', 'ACTION:DISPLAY', `DESCRIPTION:${esc(p.titulo)}`, 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR'].join('\r\n')
}

Deno.serve(async (req) => {
  if (req.method !== 'POST') return json({ erro: 'POST' }, 405)
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cfg } = await db.from('configuracoes').select('chave,valor').in('chave', ['cron_segredo', 'brevo_api_key', 'email_remetente'])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  if (!conf.cron_segredo || req.headers.get('x-cron-secret') !== conf.cron_segredo) return json({ erro: 'não autorizado' }, 401)
  const corpo = await req.json().catch(() => ({})) as { origem?: string; id?: string }
  if (!corpo.id || !['compromissos', 'tarefas'].includes(corpo.origem ?? '')) return json({ erro: 'pedido inválido' }, 400)

  // Quem recebe: e-mail de aviso do compromisso (ou quem criou); responsável da tarefa (ou quem criou).
  let titulo = '', descricao = '', data = '', emails: string[] = []
  if (corpo.origem === 'compromissos') {
    const { data: c } = await db.from('compromissos').select('titulo,imovel,data_evento,email_aviso,criado_por').eq('id', corpo.id).maybeSingle()
    if (!c) return json({ erro: 'compromisso não encontrado' }, 404)
    titulo = c.titulo; descricao = c.imovel ?? ''; data = c.data_evento
    emails = (c.email_aviso ?? '').split(',').map((e: string) => e.trim()).filter(Boolean)
    if (!emails.length && c.criado_por) { const { data: u } = await db.from('usuarios_perfis').select('email').eq('id', c.criado_por).maybeSingle(); if (u?.email) emails = [u.email] }
  } else {
    const { data: t } = await db.from('tarefas').select('titulo,prazo,cliente,responsavel_id,criado_por,pai_id').eq('id', corpo.id).maybeSingle()
    if (!t || !t.prazo) return json({ enviado: false, motivo: 'sem prazo' })
    titulo = `Prazo: ${t.titulo}`; data = t.prazo; descricao = t.cliente ? `Cliente: ${t.cliente}` : 'Etapa de caso'
    const quem = t.responsavel_id ?? t.criado_por
    if (quem) { const { data: u } = await db.from('usuarios_perfis').select('email').eq('id', quem).maybeSingle(); if (u?.email) emails = [u.email] }
  }
  if (!emails.length) return json({ enviado: false, motivo: 'sem destinatário' })

  // Preferência por usuário: só quem ligou recebe.
  const { data: perfis } = await db.from('usuarios_perfis').select('id,email').in('email', emails)
  const ids = (perfis ?? []).map(p => p.id)
  const { data: prefs } = ids.length ? await db.from('preferencias_usuario').select('usuario_id,ics_por_email').in('usuario_id', ids) : { data: [] }
  const ligados = new Set((prefs ?? []).filter(p => p.ics_por_email).map(p => p.usuario_id))
  const destinos = (perfis ?? []).filter(p => ligados.has(p.id)).map(p => p.email as string)
  if (!destinos.length) return json({ enviado: false, motivo: 'preferência desligada', candidatos: emails.length })
  if (!conf.brevo_api_key || !conf.email_remetente) return json({ enviado: false, motivo: 'provedor de e-mail não configurado' })

  const uid = `${corpo.origem}-${corpo.id}@gmenezes-advogados`
  const { count } = await db.from('envios_ics').select('id', { count: 'exact', head: true }).eq('uid', uid)
  const sequencia = count ?? 0
  const resultados: { destinatario: string; ok: boolean; detalhe?: string }[] = []
  for (const dest of destinos) {
    const ics = montarIcs({ uid, sequencia, titulo, descricao, data: data.slice(0, 10), organizador: conf.email_remetente, convidado: dest })
    const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto"><div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">${sequencia ? 'Prazo atualizado' : 'Novo prazo na agenda'}</h2></div>
<div style="padding:16px;line-height:1.5"><p><b>${titulo.replace(/[<>&]/g, '')}</b><br>${descricao.replace(/[<>&]/g, '')}<br>Data: ${data.slice(0, 10).split('-').reverse().join('/')}</p>
<p>O convite .ics anexo abre no Outlook, Google Agenda ou Apple Calendário. Se o prazo mudar, você recebe o mesmo convite atualizado (sem duplicar).</p>
<p style="font-size:12px;color:#555">Para parar de receber, desligue "Convite .ics por e-mail" em Configurações da plataforma.</p></div>
<p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · plataforma desenvolvida pelo Instituto THEYE</p></div>`
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Agenda GMenezes', email: conf.email_remetente }, to: [{ email: dest }], subject: `${sequencia ? 'Atualização' : 'Convite'}: ${titulo} · ${data.slice(0, 10).split('-').reverse().join('/')}`, htmlContent: html,
        attachment: [{ name: 'compromisso.ics', content: btoa(unescape(encodeURIComponent(ics))) }] }) })
    const detalhe = resp.ok ? undefined : `${resp.status} ${(await resp.text()).slice(0, 200)}`
    resultados.push({ destinatario: dest, ok: resp.ok, detalhe })
    await db.from('envios_ics').insert({ origem: corpo.origem, origem_id: corpo.id, uid, sequencia, destinatario: dest, ok: resp.ok, detalhe })
  }
  if (resultados.some(r => r.ok)) await db.from('consumo_api').insert({ funcao: 'convite .ics por e-mail', modelo: 'brevo-email', quantidade: resultados.filter(r => r.ok).length })
  return json({ enviado: resultados.some(r => r.ok), uid, sequencia, resultados })
})
