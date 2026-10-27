// Calendário assinável (iCal) para Google Agenda / Apple / Outlook.
// Acesso por token secreto na URL, pois o Google busca o feed sem login.
import { createClient } from 'jsr:@supabase/supabase-js@2'

const esc = (s: string) => s.replace(/[\\;,]/g, m => '\\' + m).replace(/\n/g, '\\n')
const d = (iso: string) => iso.replace(/-/g, '')
const prox = (iso: string) => new Date(Date.parse(iso) + 86400000).toISOString().slice(0, 10).replace(/-/g, '')

function evento(uid: string, data: string, titulo: string, local: string, diasAviso: number, stamp: string) {
  return [
    'BEGIN:VEVENT',
    `UID:${uid}@lsm-contratos`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${d(data)}`,
    `DTEND;VALUE=DATE:${prox(data)}`,
    `SUMMARY:${esc(titulo)}`,
    `LOCATION:${esc(local)}`,
    'DESCRIPTION:Gestão de Contratos · https://menezes-sardas-contratos.vercel.app/agenda',
    'BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER:-P${diasAviso}D`, `DESCRIPTION:${esc(titulo)}`, 'END:VALARM',
    'END:VEVENT',
  ].join('\r\n')
}

Deno.serve(async (req) => {
  const token = new URL(req.url).searchParams.get('t') ?? ''
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const { data: cfg } = await db.from('configuracoes').select('valor').eq('chave', 'agenda_token').single()
  if (!token || token !== cfg?.valor) return new Response('Link inválido', { status: 403 })

  const [{ data: contratos }, { data: comp }] = await Promise.all([
    db.from('contratos').select('id,locatario_fornecedor,data_vencimento,dias_aviso,encerrado_em,imoveis(endereco)').not('data_vencimento', 'is', null),
    db.from('compromissos').select('id,titulo,imovel,data_evento,dias_antes'),
  ])
  const stamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  const eventos = [
    ...(contratos ?? []).filter(c => !c.encerrado_em).map(c =>
      evento(`c-${c.id}`, c.data_vencimento, `Vencimento — ${c.locatario_fornecedor ?? 'contrato'}`, (c as any).imoveis?.endereco ?? '', c.dias_aviso ?? 7, stamp)),
    ...(comp ?? []).map(k => evento(`k-${k.id}`, k.data_evento, k.titulo, k.imovel, k.dias_antes, stamp)),
  ]
  const ics = [
    'BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//LSM//Contratos//PT', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'X-WR-CALNAME:Prazos contratuais — LSM', 'X-WR-TIMEZONE:America/Sao_Paulo', 'REFRESH-INTERVAL;VALUE=DURATION:PT6H',
    ...eventos, 'END:VCALENDAR',
  ].join('\r\n')
  return new Response(ics, { headers: { 'Content-Type': 'text/calendar; charset=utf-8', 'Cache-Control': 'no-cache' } })
})
