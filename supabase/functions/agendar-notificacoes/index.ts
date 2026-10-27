// Disparo diário (pg_cron) de avisos por e-mail para todos os usuários cadastrados.
// Cada item usa seu próprio prazo de aviso (dias_aviso / dias_antes, padrão 7).
import { createClient } from 'jsr:@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })

const APP = 'https://menezes-sardas-contratos.vercel.app'
const diasAte = (d: string) => Math.round((new Date(d + 'T00:00:00Z').getTime() - Date.parse(new Date().toISOString().slice(0, 10))) / 86400000)
const br = (d: string) => new Date(d + 'T12:00:00Z').toLocaleDateString('pt-BR')
const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))

function linkGoogle(titulo: string, data: string) {
  const ini = data.replace(/-/g, '')
  const fim = new Date(Date.parse(data) + 86400000).toISOString().slice(0, 10).replace(/-/g, '')
  return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(titulo)}&dates=${ini}/${fim}&ctz=America/Sao_Paulo`
}

interface Item { titulo: string; local: string; data: string; dias: number }

async function enviar(chave: string, para: string[], itens: Item[]) {
  const linhas = itens.map(i => `
    <tr><td style="padding:10px;border-bottom:1px solid #eee">
      <strong>${esc(i.titulo)}</strong><br><span style="color:#555">${esc(i.local)}</span><br>
      ${br(i.data)} — ${i.dias === 0 ? 'hoje' : `em ${i.dias} dia(s)`}
      · <a href="${linkGoogle(i.titulo + ' — ' + i.local, i.data)}">Adicionar ao Google Agenda</a>
    </td></tr>`).join('')
  const html = `<div style="font-family:Georgia,serif;max-width:600px;margin:auto">
    <div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">Avisos de prazos contratuais</h2></div>
    <table style="width:100%;border-collapse:collapse">${linhas}</table>
    <p style="padding:10px"><a href="${APP}/agenda">Abrir a Agenda</a></p>
    <p style="font-size:11px;color:#888;padding:10px">Leticia Sardas &amp; Menezes Advogados Associados · aviso automático</p></div>`
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${chave}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: 'Avisos LSM <onboarding@resend.dev>', to: para, subject: `${itens.length} prazo(s) se aproximando`, html }),
  })
  return { ok: r.ok, status: r.status, corpo: r.ok ? undefined : await r.text() }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const [{ data: contratos }, { data: comp }, { data: cfg }, { data: users }] = await Promise.all([
    db.from('contratos').select('locatario_fornecedor,data_vencimento,dias_aviso,encerrado_em,imoveis(endereco)').not('data_vencimento', 'is', null),
    db.from('compromissos').select('id,titulo,imovel,data_evento,dias_antes'),
    db.from('configuracoes').select('chave,valor').in('chave', ['resend_api_key', 'email_avisos_extra']),
    db.auth.admin.listUsers({ perPage: 200 }),
  ])

  const itens: Item[] = []
  for (const c of contratos ?? []) {
    if ((c as any).encerrado_em) continue
    const dias = diasAte(c.data_vencimento)
    if (dias >= 0 && dias <= (c.dias_aviso ?? 7))
      itens.push({ titulo: `Vencimento — ${c.locatario_fornecedor ?? 'contrato'}`, local: (c as any).imoveis?.endereco ?? '', data: c.data_vencimento, dias })
  }
  for (const k of comp ?? []) {
    const dias = diasAte(k.data_evento)
    if (dias >= 0 && dias <= k.dias_antes) itens.push({ titulo: k.titulo, local: k.imovel, data: k.data_evento, dias })
  }
  itens.sort((a, b) => a.dias - b.dias)

  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const para = [...new Set([
    ...(users?.users ?? []).map(u => u.email).filter(Boolean) as string[],
    ...String(conf.email_avisos_extra ?? '').split(/[,;\s]+/).filter(e => e.includes('@')),
  ])]
  const chave = conf.resend_api_key || Deno.env.get('RESEND_API_KEY')

  if (!itens.length) return json({ itens: 0, para, enviado: false, motivo: 'nenhum prazo dentro da janela de aviso' })
  if (!chave) return json({ itens: itens.length, para, enviado: false, motivo: 'provedor de e-mail ainda não configurado' })
  const r = await enviar(chave, para, itens)
  return json({ itens: itens.length, para, enviado: r.ok, detalhe: r })
})
