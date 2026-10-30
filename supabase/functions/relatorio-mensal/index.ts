// Passo 16 do plano: relatório mensal do escritório em PDF, enviado por e-mail à sócia (administradores)
// no dia 1 de cada mês (pg_cron) ou a pedido de quem está logado ({teste:true} manda só para a própria pessoa;
// {mes:'2026-10-01'} escolhe o mês). Números vêm de relatorio_mensal(); o PDF é gerado aqui (pdf-lib), sem IA.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { PDFDocument, StandardFonts, rgb } from 'https://esm.sh/pdf-lib@1.17.1'
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } })
const APP = 'https://gmenezes-advogados.vercel.app/#'
const brl = (v: unknown) => 'R$ ' + Number(v || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
type Bloco = Record<string, number | string | null>
type Relatorio = { mes: string; periodo: string; contratos: Bloco; imoveis: Bloco; casos: Bloco; financeiro: Bloco; intimacoes: Bloco; ia: Bloco; assinaturas: Bloco; compliance: Bloco }

const SECOES: [keyof Relatorio, string, Record<string, string>][] = [
  ['contratos', 'Contratos', { ativos: 'Contratos vigentes', novos: 'Novos no mês', encerrados: 'Encerrados no mês', vencem_no_mes: 'Venceram ou vencem no mês', vencidos: 'Vencidos acumulados', valor_periodico_total: 'Valor periódico contratado' }],
  ['imoveis', 'Imóveis e documentos', { total: 'Imóveis na carteira', documentos: 'Documentos cadastrados', documentos_vencidos: 'Documentos vencidos' }],
  ['casos', 'Casos e tarefas', { projetos_novos: 'Casos abertos no mês', projetos_abertos: 'Casos em andamento', tarefas_criadas: 'Tarefas criadas', tarefas_concluidas: 'Tarefas concluídas', tarefas_atrasadas: 'Tarefas atrasadas' }],
  ['financeiro', 'Horas e honorários', { horas_lancadas: 'Horas lançadas', valor_horas_faturaveis: 'Valor das horas faturáveis', honorarios_recebidos: 'Honorários recebidos (acumulado)', honorarios_em_aberto: 'Honorários em aberto' }],
  ['intimacoes', 'Intimações', { recebidas: 'Recebidas no mês', nao_lidas: 'Ainda não lidas' }],
  ['assinaturas', 'Assinaturas eletrônicas', { pedidas: 'Pedidas no mês', assinadas: 'Assinadas' }],
  ['compliance', 'Compliance', { diagnosticos: 'Diagnósticos feitos', nota_media: 'Nota média (0–100)' }],
  ['ia', 'Inteligência artificial', { chamadas: 'Chamadas de IA', tokens_entrada: 'Tokens de entrada', tokens_saida: 'Tokens de saída' }],
]
const DINHEIRO = new Set(['valor_periodico_total', 'valor_horas_faturaveis', 'honorarios_recebidos', 'honorarios_em_aberto'])
const fmt = (k: string, v: unknown) => DINHEIRO.has(k) ? brl(v) : v == null ? '—' : String(v).replace('.', ',')
// pdf-lib com fontes padrão só aceita WinAnsi: troca o que não cabe.
const ansi = (s: string) => s.replace(/—/g, '-').replace(/[^\x00-\xff]/g, '?')

async function gerarPdf(r: Relatorio, geradoEm: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  pdf.setTitle(`Relatório mensal ${r.mes} - GMenezes Advogados Associados`); pdf.setAuthor('Plataforma GMenezes')
  const serif = await pdf.embedFont(StandardFonts.TimesRoman), serifB = await pdf.embedFont(StandardFonts.TimesBold), sans = await pdf.embedFont(StandardFonts.Helvetica)
  const navy = rgb(0.078, 0.129, 0.239), dourado = rgb(0.69, 0.553, 0.341), cinza = rgb(0.4, 0.4, 0.4)
  let page = pdf.addPage([595.28, 841.89]); let y = 800
  const nova = () => { page = pdf.addPage([595.28, 841.89]); y = 800 }
  page.drawRectangle({ x: 0, y: 790, width: 595.28, height: 51.89, color: navy })
  page.drawText(ansi('GMenezes Advogados Associados'), { x: 40, y: 812, size: 16, font: serifB, color: rgb(1, 1, 1) })
  page.drawText(ansi(`Relatório mensal do escritório · ${r.mes}`), { x: 40, y: 797, size: 10, font: sans, color: dourado })
  y = 760
  page.drawText(ansi(`Período: ${r.periodo}. Gerado automaticamente em ${geradoEm} a partir dos dados da plataforma, sem inteligência artificial.`), { x: 40, y, size: 9, font: sans, color: cinza }); y -= 24
  for (const [chave, titulo, rotulos] of SECOES) {
    const bloco = (r[chave] ?? {}) as Bloco
    const linhas = Object.entries(rotulos).filter(([k]) => k in bloco)
    if (y - 18 - linhas.length * 15 < 60) nova()
    page.drawText(ansi(titulo), { x: 40, y, size: 13, font: serifB, color: navy }); y -= 4
    page.drawLine({ start: { x: 40, y }, end: { x: 555, y }, thickness: 0.8, color: dourado }); y -= 14
    for (const [k, rotulo] of linhas) {
      page.drawText(ansi(rotulo), { x: 48, y, size: 10, font: serif, color: rgb(0.15, 0.15, 0.15) })
      const v = ansi(fmt(k, bloco[k])); const w = serifB.widthOfTextAtSize(v, 10)
      page.drawText(v, { x: 555 - w, y, size: 10, font: serifB, color: navy }); y -= 15
    }
    y -= 10
  }
  if (y < 90) nova()
  page.drawText(ansi('Como ler: contratos e documentos são a fotografia no fim do mês; tarefas, horas, intimações e IA são o movimento dentro do mês; honorários recebidos são o acumulado dos casos.'), { x: 40, y, size: 8, font: sans, color: cinza, maxWidth: 515, lineHeight: 10 }); y -= 24
  page.drawText(ansi(`Abra a plataforma em gmenezes-advogados.vercel.app · Relatórios. Desenvolvido pelo Instituto THEYE.`), { x: 40, y, size: 8, font: sans, color: cinza })
  return await pdf.save()
}

const sha256 = async (b: Uint8Array) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', b))).map(x => x.toString(16).padStart(2, '0')).join('')
const b64 = (b: Uint8Array) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s) }

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
    if (!perfil || !['admin', 'operador'].includes(perfil.funcao)) return json({ erro: 'Só administradores e operadores.' }, 403)
    pessoa = { email: u.user.email! }
  }
  const teste = !!corpo?.teste && !!pessoa
  // Por padrão o relatório é do mês anterior (roda no dia 1). Em teste, do mês corrente, para ter números.
  const hoje = new Date()
  const mes = typeof corpo?.mes === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(corpo.mes) ? corpo.mes
    : teste ? `${hoje.getUTCFullYear()}-${String(hoje.getUTCMonth() + 1).padStart(2, '0')}-01`
    : new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth() - 1, 1)).toISOString().slice(0, 10)

  const { data: dados, error } = await db.rpc('relatorio_mensal', { p_mes: mes })
  if (error) return json({ erro: error.message }, 500)
  const r = dados as Relatorio
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  const pdfBytes = await gerarPdf(r, geradoEm)
  const hash = await sha256(pdfBytes)
  const nomeArquivo = `relatorio-mensal-${mes.slice(0, 7)}.pdf`

  let registroId: number | null = null
  if (!teste) {
    const { data: salvo } = await db.from('relatorios_mensais').upsert({ mes, conteudo: r, sha256: hash }, { onConflict: 'mes,escritorio_id' }).select('id').maybeSingle()
    registroId = salvo?.id ?? null
  }
  if (corpo?.baixar && pessoa) return json({ mes, sha256: hash, arquivo: nomeArquivo, pdf_base64: b64(pdfBytes), resumo: r })

  const [{ data: cfg }, { data: admins }] = await Promise.all([
    db.from('configuracoes').select('chave,valor').in('chave', ['brevo_api_key', 'email_remetente']),
    db.from('usuarios_perfis').select('email').eq('funcao', 'admin'),
  ])
  const conf = Object.fromEntries((cfg ?? []).map(x => [x.chave, x.valor]))
  const para = pessoa ? [pessoa.email] : [...new Set((admins ?? []).map(a => a.email).filter(e => !!e && !e.endsWith('@exemplo.com')) as string[])]
  if (!conf.brevo_api_key || !conf.email_remetente) return json({ enviado: false, motivo: 'provedor de e-mail não configurado', sha256: hash, resumo: r })

  const titulo = `Relatório mensal do escritório · ${r.mes}`
  const html = `<div style="font-family:Georgia,serif;max-width:620px;margin:auto">
    <div style="background:#14213d;color:#fff;padding:18px"><h2 style="margin:0">${titulo}</h2></div>
    <div style="padding:16px;line-height:1.5">
      <p>Segue em anexo o relatório mensal em PDF (${r.periodo}), gerado automaticamente a partir dos dados da plataforma.</p>
      <p><strong>Contratos vigentes:</strong> ${r.contratos.ativos} · <strong>Casos em andamento:</strong> ${r.casos.projetos_abertos} · <strong>Tarefas concluídas no mês:</strong> ${r.casos.tarefas_concluidas} · <strong>Horas lançadas:</strong> ${fmt('horas_lancadas', r.financeiro.horas_lancadas)} · <strong>Honorários em aberto:</strong> ${brl(r.financeiro.honorarios_em_aberto)}</p>
      <p style="font-size:12px;color:#666">SHA-256 do PDF: ${hash}</p>
      ${teste ? '<p style="color:#888">Este é um envio de teste pedido por você em Relatórios. O envio automático acontece no dia 1 de cada mês, às 8h.</p>' : ''}
      <p><a href="${APP}/relatorios">Abrir Relatórios</a> · <a href="${APP}/indicadores">Abrir Indicadores</a></p>
    </div>
    <p style="font-size:11px;color:#888;padding:10px">GMenezes Advogados Associados · relatório automático</p></div>`
  let falha: string | undefined
  for (const email of para) {
    const resp = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST', headers: { 'api-key': conf.brevo_api_key, 'Content-Type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ sender: { name: 'Relatórios GMenezes', email: conf.email_remetente }, to: [{ email }], subject: titulo, htmlContent: html, attachment: [{ name: nomeArquivo, content: b64(pdfBytes) }] }),
    })
    if (!resp.ok) falha = `${resp.status} ${await resp.text()}`
  }
  if (!falha) {
    await db.from('consumo_api').insert({ funcao: 'relatório mensal por e-mail', modelo: 'brevo-email', quantidade: para.length })
    if (registroId) await db.from('relatorios_mensais').update({ enviado_em: new Date().toISOString(), destinatarios: para.length }).eq('id', registroId)
  }
  return json({ mes, enviado: !falha, destinatarios: para.length, teste, sha256: hash, detalhe: falha, resumo: r })
})
