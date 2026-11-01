// Passo 555: Edge Function semana-pdf — semana em PDF (gerador próprio, sem biblioteca) por e-mail à secretaria toda sexta; teste só para quem pediu.
import { describe, it, expect, beforeEach } from 'vitest'
import { fingirDeno, fingirFetch } from '../_testes/deno'
import { zerar, estado } from '../_testes/supabase-js'

const caixa = fingirDeno({ SUPABASE_URL: 'https://db.supabase.co', SUPABASE_SERVICE_ROLE_KEY: 'k' })
const { linhasSemana } = await import('./index')
const chamar = (corpo: unknown = {}, headers: Record<string, string> = {}) =>
  caixa.handler!(new Request('https://x.functions.supabase.co/semana-pdf', { method: 'POST', body: JSON.stringify(corpo), headers: { 'Content-Type': 'application/json', ...headers } }))
const SEDE = '00000000-0000-0000-0000-000000000001'
const SEMANA = { inicio: '2026-11-07', fim: '2026-11-13', total: 2, dias: [
  { dia: '2026-11-09', itens: [{ tipo: 'prazo', titulo: 'Contestação <Alfa>', detalhe: 'Proc. 123', responsavel: 'Letícia', situacao: 'a_fazer' }] },
  { dia: '2026-11-11', itens: [{ tipo: 'compromisso', titulo: 'Audiência', detalhe: '', responsavel: '', situacao: '' }] },
] }

const envios: { to: string; subject: string; html: string; anexo: { name: string; content: string } }[] = []
beforeEach(() => {
  envios.length = 0
  fingirFetch((u, init) => {
    if (u.includes('brevo')) { const b = JSON.parse(String(init?.body)); envios.push({ to: b.to[0].email, subject: b.subject, html: b.htmlContent, anexo: b.attachment[0] }); return new Response('{}', { status: 201 }) }
    return new Response('', { status: 500 })
  })
  zerar({
    configuracoes: [{ chave: 'cron_segredo', valor: 'segredo' }, { chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'avisos@gmenezes.com' }, { chave: 'email_secretaria', valor: 'sec@gmenezes.com; sec2@gmenezes.com' }],
    usuarios_perfis: [{ id: 'u1', funcao: 'admin', email: 'fatima@gmenezes.com', escritorio_id: SEDE }, { id: 'u2', funcao: 'operador', email: 'leticia@lsm.law', escritorio_id: 'parceiro' }, { id: 'u3', funcao: 'admin', email: 'teste-automatico@exemplo.com', escritorio_id: SEDE }],
    consumo_api: [],
  })
  estado.rpcResposta.semana_agenda = SEMANA
  estado.rpcResposta.marca_escritorio = { nome: 'GMenezes Advogados Associados' }
})
const amanha = () => new Date(Date.now() + 86400000).toISOString().slice(0, 10)

describe('semana-pdf', () => {
  it('linhasSemana: cabeçalho, um bloco por dia com o dia da semana, itens quebrados e rodapé; semana vazia avisa', () => {
    const L = linhasSemana(SEMANA, 'Escritório X')
    expect(L[0]).toMatchObject({ texto: 'Semana de 07/11/2026 a 13/11/2026', negrito: true })
    expect(L[1]!.texto).toBe('Escritório X')
    expect(L.map(l => l.texto)).toContain('09/11/2026 · segunda-feira')
    expect(L.map(l => l.texto)).toContain('11/11/2026 · quarta-feira')
    expect(L.find(l => l.texto.startsWith('- [Prazo]'))!.texto).toBe('- [Prazo] Contestação <Alfa> · Proc. 123 · resp.: Letícia')
    expect(L.find(l => l.texto.startsWith('- [Compromisso]'))!.texto).toBe('- [Compromisso] Audiência')
    expect(L.at(-1)!.texto).toContain('Confira os autos')
    expect(linhasSemana({ inicio: '2026-11-07', fim: '2026-11-13', total: 0, dias: [] }, 'X').map(l => l.texto)).toContain('Nenhum prazo ou compromisso nos próximos 7 dias.')
  })

  it('sem cron e sem login é 401; conta sem perfil é 403', async () => {
    expect((await chamar()).status).toBe(401)
    estado.usuario = { id: 'u9', email: 'x@y.com' }
    expect((await chamar({}, { Authorization: 'Bearer t' })).status).toBe(403)
  })

  it('cron: pede os 7 dias a partir de amanhã para a sede, manda o PDF anexo à secretaria configurada, limpa HTML dos títulos e registra consumo', async () => {
    const b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toEqual({ enviado: true, destinatarios: 2, teste: false, total: 2, inicio: '2026-11-07', fim: '2026-11-13', detalhe: undefined })
    expect(estado.rpcs[0]).toEqual({ nome: 'semana_agenda', args: { p_inicio: amanha(), p_dias: 7, p_escritorio: SEDE } })
    expect(envios.map(e => e.to)).toEqual(['sec@gmenezes.com', 'sec2@gmenezes.com'])
    expect(envios[0]!.subject).toBe('Semana de 07/11/2026 a 13/11/2026 · 2 item(ns)')
    expect(envios[0]!.anexo.name).toBe('semana-2026-11-07.pdf')
    const pdf = Buffer.from(envios[0]!.anexo.content, 'base64').toString('latin1')
    expect(pdf).toMatch(/^%PDF-1\.4/)
    expect(pdf).toContain('/Title (Semana 2026-11-07)')
    expect(pdf).toContain('(09/11/2026 \\267 segunda-feira)'.replace('\\267', '·'))
    expect(pdf).toMatch(/%%EOF\n$/)
    expect(envios[0]!.html).toContain('Contestação Alfa')
    expect(envios[0]!.html).not.toContain('<Alfa>')
    expect(envios[0]!.html).toContain('<i>Letícia</i>')
    expect(envios[0]!.html).not.toContain('Envio de teste')
    expect(estado.inseridos[0]).toMatchObject({ tabela: 'consumo_api', linha: { funcao: 'semana em PDF por e-mail', quantidade: 2 } })
  })

  it('sem secretaria configurada vai às administradoras reais da sede; teste de quem está logado usa o escritório dela e vai só para ela', async () => {
    estado.tabelas.configuracoes = estado.tabelas.configuracoes!.filter(c => (c as { chave: string }).chave !== 'email_secretaria')
    let b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b.destinatarios).toBe(1)
    expect(envios.map(e => e.to)).toEqual(['fatima@gmenezes.com'])
    estado.usuario = { id: 'u2', email: 'leticia@lsm.law' }
    estado.rpcResposta.marca_escritorio = { nome: 'Parceiro & Cia' }
    b = await (await chamar({ teste: true }, { Authorization: 'Bearer t' })).json()
    expect(b).toMatchObject({ enviado: true, destinatarios: 1, teste: true })
    expect(estado.rpcs.at(-2)!.args).toEqual({ p_inicio: amanha(), p_dias: 7, p_escritorio: 'parceiro' })
    expect(envios[1]!.to).toBe('leticia@lsm.law')
    expect(envios[1]!.html).toContain('Envio de teste')
    expect(envios[1]!.html).toContain('Parceiro  Cia')
  })

  it('sem provedor devolve a semana sem enviar; erro da função SQL é 500; falha do Brevo não registra consumo', async () => {
    estado.tabelas.configuracoes = [{ chave: 'cron_segredo', valor: 'segredo' }, { chave: 'email_secretaria', valor: 'sec@gmenezes.com' }]
    let b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, motivo: 'provedor de e-mail não configurado', semana: SEMANA, destinatarios: 1 })
    estado.tabelas.configuracoes.push({ chave: 'brevo_api_key', valor: 'bk' }, { chave: 'email_remetente', valor: 'a@b' })
    fingirFetch(() => new Response('cota estourada', { status: 402 }))
    b = await (await chamar({}, { 'x-cron-secret': 'segredo' })).json()
    expect(b).toMatchObject({ enviado: false, detalhe: '402 cota estourada' })
    expect(estado.inseridos).toHaveLength(0)
    estado.rpcErro.semana_agenda = 'função ausente'
    const r = await chamar({}, { 'x-cron-secret': 'segredo' })
    expect(r.status).toBe(500); expect((await r.json()).erro).toBe('função ausente')
  })
})
