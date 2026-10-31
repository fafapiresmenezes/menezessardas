// Passo 42 (Onda D): "Semana em PDF" por e-mail toda sexta às 17h (Brasília) para a secretaria, com prazos e compromissos
// dos próximos 7 dias por dia e responsável. Cron manda x-cron-secret; quem está logado pode pedir {teste:true} (vai só para si).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret', 'Access-Control-Allow-Methods': 'POST, OPTIONS' }
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
type Item = { tipo: string; titulo: string; detalhe: string; responsavel: string; situacao: string }
type Semana = { inicio: string; fim: string; total: number; dias: { dia: string; itens: Item[] }[] }
const dataBr = (d: string) => d.split('-').reverse().join('/')
const diaSemana = (d: string) => ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'][new Date(d + 'T12:00:00Z').getUTCDay()]

// ---- gerador de PDF mínimo (cópia de src/lib/pdfSimples.ts) ----
// Gerador de PDF mínimo, sem biblioteca: texto em Helvetica (WinAnsi), várias páginas A4.
// Serve para exportações auditáveis (Trilha) em que o conteúdo é texto tabulado e o que importa é o hash do arquivo.
type Linha = { texto: string; tamanho?: number; negrito?: boolean; cor?: [number, number, number]; x?: number }

const LARGURA = 595.28, ALTURA = 841.89, MARGEM = 40, ENTRELINHA = 1.35

// Converte para WinAnsi: o que não existe na tabela vira "?" (acentos do português existem).
function winAnsi(s: string): string {
  let r = ''
  for (const ch of s) {
    const c = ch.codePointAt(0)!
    if (c === 0x2014 || c === 0x2013) r += '-'
    else if (c === 0x2019 || c === 0x2018) r += "'"
    else if (c === 0x201c || c === 0x201d) r += '"'
    else if (c === 0x2026) r += '...'
    else if (c < 256) r += ch
    else r += '?'
  }
  return r.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)')
}
// Bytes latin-1 do texto (o PDF é binário; evitamos UTF-8 nos literais).
function latin1(s: string): Uint8Array {
  const out = new Uint8Array(new ArrayBuffer(s.length))
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff
  return out
}
// Largura aproximada (Helvetica média 0,5 em) para quebrar linhas longas.
function quebrar(texto: string, tamanho: number, larguraMax = LARGURA - 2 * MARGEM): string[] {
  const porLinha = Math.max(10, Math.floor(larguraMax / (tamanho * 0.5)))
  const linhas: string[] = []
  for (const paragrafo of texto.split('\n')) {
    let atual = ''
    for (const palavra of paragrafo.split(' ')) {
      if ((atual + ' ' + palavra).trim().length > porLinha) { if (atual) linhas.push(atual); atual = palavra }
      else atual = (atual + ' ' + palavra).trim()
    }
    linhas.push(atual)
  }
  return linhas
}

function gerarPdfTexto(titulo: string, linhas: Linha[]): Uint8Array {
  const paginas: string[] = []
  let conteudo = ''; let y = ALTURA - MARGEM
  const fechar = () => { paginas.push(conteudo); conteudo = ''; y = ALTURA - MARGEM }
  for (const l of linhas) {
    const t = l.tamanho ?? 9
    if (y - t * ENTRELINHA < MARGEM) fechar()
    y -= t * ENTRELINHA
    const cor = l.cor ?? [0.1, 0.1, 0.1]
    conteudo += `BT /${l.negrito ? 'F2' : 'F1'} ${t} Tf ${cor.join(' ')} rg ${(l.x ?? MARGEM).toFixed(2)} ${y.toFixed(2)} Td (${winAnsi(l.texto)}) Tj ET\n`
  }
  fechar()

  const objetos: string[] = []
  const add = (s: string) => { objetos.push(s); return objetos.length }
  const fonte1 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>')
  const fonte2 = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>')
  const paginasId = objetos.length + 1 + paginas.length * 2
  const ids: number[] = []
  for (const c of paginas) {
    const stream = add(`<< /Length ${latin1(c).length} >>\nstream\n${c}endstream`)
    ids.push(add(`<< /Type /Page /Parent ${paginasId} 0 R /MediaBox [0 0 ${LARGURA} ${ALTURA}] /Resources << /Font << /F1 ${fonte1} 0 R /F2 ${fonte2} 0 R >> >> /Contents ${stream} 0 R >>`))
  }
  const pags = add(`<< /Type /Pages /Kids [${ids.map(i => `${i} 0 R`).join(' ')}] /Count ${ids.length} >>`)
  const catalogo = add(`<< /Type /Catalog /Pages ${pags} 0 R >>`)
  const info = add(`<< /Title (${winAnsi(titulo)}) /Producer (Plataforma GMenezes) >>`)

  let saida = '%PDF-1.4\n%\xe2\xe3\xcf\xd3\n'
  const offsets: number[] = []
  objetos.forEach((o, i) => { offsets.push(latin1(saida).length); saida += `${i + 1} 0 obj\n${o}\nendobj\n` })
  const xref = latin1(saida).length
  saida += `xref\n0 ${objetos.length + 1}\n0000000000 65535 f \n` + offsets.map(o => `${String(o).padStart(10, '0')} 00000 n \n`).join('')
  saida += `trailer\n<< /Size ${objetos.length + 1} /Root ${catalogo} 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`
  return latin1(saida)
}

export function linhasSemana(s: Semana, escritorio: string): Linha[] {
  const L: Linha[] = [{ texto: `Semana de ${dataBr(s.inicio)} a ${dataBr(s.fim)}`, tamanho: 16, negrito: true }, { texto: escritorio, tamanho: 10 }, { texto: `${s.total} item(ns): prazos de casos e compromissos, por dia e responsável.`, tamanho: 9 }, { texto: ' ' }]
  if (!s.dias.length) L.push({ texto: 'Nenhum prazo ou compromisso nos próximos 7 dias.', tamanho: 11 })
  for (const d of s.dias) {
    L.push({ texto: `${dataBr(d.dia)} · ${diaSemana(d.dia)}`, tamanho: 12, negrito: true })
    for (const i of d.itens) for (const q of quebrar(`- [${i.tipo === 'prazo' ? 'Prazo' : 'Compromisso'}] ${i.titulo}${i.detalhe ? ' · ' + i.detalhe : ''}${i.responsavel ? ' · resp.: ' + i.responsavel : ''}`, 9.5)) L.push({ texto: q, tamanho: 9.5 })
    L.push({ texto: ' ' })
  }
  L.push({ texto: 'Gerado automaticamente pela plataforma GMenezes (Instituto THEYE). Confira os autos antes de agir.', tamanho: 8 })
  return L
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
  const corpo = await req.json().catch(() => ({})) as { teste?: boolean }
  const { data: cfg } = await db.from('configuracoes').select('chave,valor').in('chave', ['cron_segredo', 'brevo_api_key', 'email_remetente', 'email_secretaria'])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const cronOk = !!conf.cron_segredo && req.headers.get('x-cron-secret') === conf.cron_segredo
  let pessoa: { email: string; escritorio: string | null } | null = null
  if (!cronOk) {
    const token = (req.headers.get('Authorization') ?? '').replace('Bearer ', '')
    const { data: u } = await db.auth.getUser(token)
    if (!u?.user) return json({ erro: 'Entre na plataforma.' }, 401)
    const { data: perfil } = await db.from('usuarios_perfis').select('funcao,escritorio_id').eq('id', u.user.id).maybeSingle()
    if (!perfil) return json({ erro: 'Conta ainda não liberada.' }, 403)
    pessoa = { email: u.user.email!, escritorio: (perfil as { escritorio_id?: string }).escritorio_id ?? null }
  }
  const teste = !!corpo.teste && !!pessoa
  const escritorioId = pessoa?.escritorio ?? '00000000-0000-0000-0000-000000000001'
  // Próximos 7 dias a partir de amanhã (sexta 17h → sábado a sexta seguinte).
  const amanha = new Date(Date.now() + 86400000).toISOString().slice(0, 10)
  const [{ data: semana, error }, { data: marca }] = await Promise.all([
    db.rpc('semana_agenda', { p_inicio: amanha, p_dias: 7, p_escritorio: escritorioId }),
    db.rpc('marca_escritorio', { p_id: escritorioId }),
  ])
  if (error) return json({ erro: error.message }, 500)
  const s = semana as Semana
  const nomeEsc = ((marca ?? {}) as { nome?: string }).nome ?? 'GMenezes Advogados Associados'
  const pdf = gerarPdfTexto(`Semana ${s.inicio}`, linhasSemana(s, nomeEsc))
  let b64 = ''; { let bin = ''; for (let i = 0; i < pdf.length; i++) bin += String.fromCharCode(pdf[i]); b64 = btoa(bin) }

  // Destinatários: a secretaria (e-mail em Configurações), senão administradores; no teste, só quem pediu.
  let para: string[] = []
  if (pessoa) para = [pessoa.email]
  else if (conf.email_secretaria) para = conf.email_secretaria.split(/[,;\s]+/).filter(Boolean)
  else { const { data: adm } = await db.from('usuarios_perfis').select('email').eq('funcao', 'admin').eq('escritorio_id', escritorioId); para = (adm ?? []).map(a => a.email).filter((e): e is string => !!e && !e.endsWith('@exemplo.com')) }
  if (!conf.brevo_api_key || !conf.email_remetente) return json({ enviado: false, motivo: 'provedor de e-mail não configurado', semana: s, destinatarios: para.length })
  const linhasHtml = s.dias.map(d => `<h3 style="margin:14px 0 4px;color:#14213d">${dataBr(d.dia)} · ${diaSemana(d.dia)}</h3><ul style="margin:0;padding-left:18px">${d.itens.map(i => `<li><b>${i.tipo === 'prazo' ? 'Prazo' : 'Compromisso'}</b>: ${i.titulo.replace(/[<>&]/g, '')}${i.detalhe ? ' · ' + i.detalhe.replace(/[<>&]/g, '') : ''}${i.responsavel ? ' · <i>' + i.responsavel.replace(/[<>&]/g, '') + '</i>' : ''}</li>`).join('')}</ul>`).join('')
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto"><div style="background:#14213d;color:#fff;padding:18px"><div style="font-size:12px;opacity:.85">${nomeEsc.replace(/[<>&]/g, '')}</div><h2 style="margin:0">Semana de ${dataBr(s.inicio)} a ${dataBr(s.fim)}</h2></div>
<div style="padding:16px;line-height:1.5"><p>${s.total} item(ns) nos próximos 7 dias. O PDF está anexo para imprimir ou arquivar.</p>${linhasHtml || '<p>Nenhum prazo ou compromisso nos próximos 7 dias.</p>'}
${teste ? '<p style="color:#888">Envio de teste pedido por você na Agenda.</p>' : ''}<p><a href="${APP}/agenda">Abrir Agenda</a> · <a href="${APP}/meu-dia">Meu dia</a></p></div>
<p style="font-size:11px;color:#888;padding:10px">${nomeEsc.replace(/[<>&]/g, '')} · semana em PDF, toda sexta às 17h · plataforma desenvolvida pelo Instituto THEYE</p></div>`
  let falha: string | undefined
  for (const email of para) {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', { method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Agenda GMenezes', email: conf.email_remetente }, to: [{ email }], subject: `Semana de ${dataBr(s.inicio)} a ${dataBr(s.fim)} · ${s.total} item(ns)`, htmlContent: html, attachment: [{ name: `semana-${s.inicio}.pdf`, content: b64 }] }) })
    if (!resp.ok) falha = `${resp.status} ${(await resp.text()).slice(0, 200)}`
  }
  if (!falha && para.length) await db.from('consumo_api').insert({ funcao: 'semana em PDF por e-mail', modelo: 'brevo-email', quantidade: para.length })
  return json({ enviado: !falha && para.length > 0, destinatarios: para.length, teste, total: s.total, inicio: s.inicio, fim: s.fim, detalhe: falha })
})
